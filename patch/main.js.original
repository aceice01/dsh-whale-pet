const { app, BrowserWindow, dialog, screen } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

const DSH_BIN = path.join(
  __dirname,
  "node_modules",
  "@deepseek-ai",
  "dsh",
  "lib",
  "bin.js",
);

/** Find a free TCP port on 127.0.0.1. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

/** Poll an HTTP URL until it answers (server ready) or timeout. */
function waitForServer(url, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status < 500) return resolve();
      } catch {
        /* not up yet */
      }
      if (Date.now() - started > timeoutMs) {
        return reject(new Error(`DSH server did not start within ${timeoutMs}ms`));
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

let childProc = null;
let mainWindow = null;
let petWindow = null;

async function bootDsh() {
  const port = await findFreePort();
  const dshHome = path.join(app.getPath("userData"), "dsh");
  fs.mkdirSync(dshHome, { recursive: true });
  const logFile = path.join(app.getPath("userData"), "dsh-server.log");
  const logFd = fs.openSync(logFile, "a");

  const env = {
    ...process.env,
    DSH_HOME: dshHome,
    ELECTRON_RUN_AS_NODE: "1",
    DSH_TELEMETRY_DISABLED: "1",
    // Force the directory picker to the browse backend: the native backend
    // (koffi -> Win32 COM folder dialog) crashes the dsh server with a V8
    // FATAL error in the packaged client, killing the whole app. The auto
    // resolver switches to browse when SSH_CONNECTION is present.
    SSH_CONNECTION: "client 127.0.0.1",
  };

  // Reuse Electron's bundled Node via ELECTRON_RUN_AS_NODE so we never
  // need to ship a separate node.exe. stdio entries must be real fds:
  // WriteStream objects are rejected until opened.
  childProc = spawn(process.execPath, [DSH_BIN, "--profile", "web", "--port", String(port)], {
    env,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });

  childProc.on("exit", (code, signal) => {
    console.log(`dsh server exited: code=${code} signal=${signal}`);
    log(`[main] dsh server exited: code=${code} signal=${signal}`);
    childProc = null;
  });
  childProc.on("error", (err) => {
    log(`[main] dsh server spawn error: ${err.message}`);
  });

  const url = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(url);
  } catch (err) {
    dialog.showErrorBox(
      "DSH 启动失败",
      `${err.message}\n\n日志文件：\n${logFile}`,
    );
    app.quit();
    return;
  }
  createWindow(url);
  createPetWindow(port);
}

/**
 * Desktop pet: a small transparent always-on-top window in the bottom-right
 * corner that loads the pet page served by the balance-widget plugin
 * (/pet.html). The page polls /api/status and /api/balance, so the pet shows
 * the agent's live work state and celebrates finished turns.
 */
const PET_SIZE = { width: 220, height: 212 };

function createPetWindow(port) {
  if (petWindow) return;
  const display = screen.getPrimaryDisplay().workArea;
  const x = display.x + display.width - PET_SIZE.width - 16;
  const y = display.y + display.height - PET_SIZE.height - 16;
  petWindow = new BrowserWindow({
    width: PET_SIZE.width,
    height: PET_SIZE.height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  petWindow.setAlwaysOnTop(true, "screen-saver");
  petWindow.loadURL(`http://127.0.0.1:${port}/pet.html`);
  petWindow.on("closed", () => {
    log("[main] pet window closed");
    petWindow = null;
  });
  petWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    log(`[main] pet did-fail-load: ${code} ${desc}`);
  });
  // Right-click anywhere on the pet reloads it — handy for iterating on the
  // pet page without restarting the app.
  petWindow.webContents.on("context-menu", () => {
    petWindow.webContents.reload();
    log("[main] pet reloaded via context menu");
  });
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0f1115",
    autoHideMenuBar: true,
    title: "DeepSeek Harness",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadURL(url);
  mainWindow.on("closed", () => {
    log(`[main] window closed, childProc=${!!childProc}`);
    // Close the pet window together with the main window so the pet does not
    // linger on screen after the app is closed.
    if (petWindow) {
      log("[main] closing pet window with main window");
      try { petWindow.close(); } catch (e) { log(`[main] pet close error: ${e.message}`); }
      petWindow = null;
    }
    mainWindow = null;
  });
  mainWindow.on("close", () => {
    log("[main] window close event fired");
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    log(`[main] renderer gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });
  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    log(`[main] did-fail-load: ${code} ${desc}`);
  });
}

/** Append a line to the main-process log. */
function log(line) {
  try {
    fs.appendFileSync(
      path.join(app.getPath("userData"), "main.log"),
      `${new Date().toISOString()} ${line}\n`,
    );
  } catch {}
}

app.whenReady().then(() => {
  log("[main] app ready, booting dsh");
  bootDsh();
});

app.on("window-all-closed", () => {
  log("[main] window-all-closed, quitting");
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  log("[main] before-quit");
  if (childProc) {
    childProc.kill();
    childProc = null;
  }
});

app.on("will-quit", () => {
  log("[main] will-quit");
});

app.on("quit", (_e, exitCode) => {
  log(`[main] quit event, exitCode=${exitCode}`);
});

process.on("uncaughtException", (err) => {
  try {
    fs.appendFileSync(
      path.join(app.getPath("userData"), "crash.log"),
      `${new Date().toISOString()} uncaughtException: ${err.stack}\n`,
    );
  } catch {}
});
process.on("unhandledRejection", (reason) => {
  try {
    fs.appendFileSync(
      path.join(app.getPath("userData"), "crash.log"),
      `${new Date().toISOString()} unhandledRejection: ${reason}\n`,
    );
  } catch {}
});

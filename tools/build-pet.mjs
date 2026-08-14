#!/usr/bin/env node
/**
 * build-pet.mjs — assemble the final pet.html from pet.template.html.
 *
 * Injects:
 *  - six whale-girl animations as base64 webp (frame delays ×3 for gentler
 *    motion, plus an extra idle static frame so the pet rests still)
 *  - the pre-synthesized voice clips from lib/audio.json (see synth_all.py)
 *
 * Writes lib/pet.html inside this repository. Install scripts copy that file
 * into the plugin directories (or run install.ps1 after building).
 *
 * Usage:
 *   node tools/build-pet.mjs
 *
 * Requires `sharp` (any installation resolvable via createRequire works, e.g.
 * the copy bundled with DSH, or `npm i sharp`).
 */
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// Resolve `sharp` from a few likely places, else let npm resolve it.
function loadSharp() {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "sharp"),
    "sharp",
  ];
  for (const c of candidates) {
    try {
      const s = require(c);
      return s;
    } catch {
      /* try next */
    }
  }
  throw new Error("sharp not found — run `npm i sharp` or point NODE_PATH at an install that has it");
}
const sharp = loadSharp();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DELAY_SCALE = 3;

const ANIM = {
  idle: "idle.gif",
  running: "running.gif",
  failed: "failed.gif",
  waiting: "waiting.gif",
  waving: "waving.gif",
  jumping: "jumping.gif",
};

const TPL = join(ROOT, "lib", "pet.template.html");
const OUTS = [
  join(ROOT, "lib", "pet.html"),
  join(ROOT, "plugin", "dsh-balance-widget", "lib", "pet.html"),
];
const ANIM_DIR = join(ROOT, "lib", "anim");
const AUDIO_JSON = join(ROOT, "lib", "audio.json");

let tpl = readFileSync(TPL, "utf8");

for (const [key, file] of Object.entries(ANIM)) {
  const src = join(ANIM_DIR, file);
  const meta = await sharp(src, { animated: true }).metadata();
  const delays = (meta.delay || []).map((d) => Math.max(40, Math.round(d * DELAY_SCALE)));
  const webp = await sharp(src, { animated: true }).webp({ loop: 0, delay: delays }).toBuffer();
  const b64 = webp.toString("base64");
  console.log(`${key}: ${file} -> ${(webp.length / 1024).toFixed(1)}KB, delays ${JSON.stringify(delays)}`);
  tpl = tpl.split(`__ANIM_${key.toUpperCase()}__`).join(b64);
}

// idle static frame (first frame only) for resting state
const idleStatic = await sharp(join(ANIM_DIR, "idle.gif"), { page: 0 })
  .webp({ lossless: false, quality: 90 })
  .toBuffer();
console.log(`idleStatic: ${(idleStatic.length / 1024).toFixed(1)}KB`);
tpl = tpl.split("__ANIM_IDLESTATIC__").join(idleStatic.toString("base64"));

// pre-synthesized neural voice clips (audio.json from tools/synth_all.py)
if (existsSync(AUDIO_JSON)) {
  const audio = readFileSync(AUDIO_JSON, "utf8").trim();
  console.log(`audio.json: ${(audio.length / 1024).toFixed(1)}KB of clips injected`);
  tpl = tpl.split("__AUDIO_JSON__").join(audio);
} else {
  console.log("WARN: audio.json missing — voice clips will be empty");
  tpl = tpl.split("__AUDIO_JSON__").join("{}");
}

for (const out of OUTS) {
  writeFileSync(out, tpl, "utf8");
  console.log(`written: ${out} (${(statSync(out).size / 1024).toFixed(1)}KB)`);
}
console.log("done — run install.ps1 or copy lib/pet.html to your plugin dirs");

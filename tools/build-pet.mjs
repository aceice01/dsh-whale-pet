// build-pet.mjs — injects the six whale-girl animations (as base64 webp) into
// pet.template.html and writes the final pet.html to both the workspace and
// the deployed plugin directory. Run after changing anim/*.gif or the template.
//
// v6 changes:
//  - animation frame delays are multiplied by DELAY_SCALE so the pet moves
//    slower/more gently (original GIFs run ~110-320ms per frame = too frantic)
//  - an extra idle-static frame is emitted so the pet can rest still between
//    occasional motion bursts
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("D:/Program Files/DSH Desktop/resources/app/node_modules/sharp");

const DELAY_SCALE = 3;

const ANIM = {
  idle: "idle.gif",
  running: "running.gif",
  failed: "failed.gif",
  waiting: "waiting.gif",
  waving: "waving.gif",
  jumping: "jumping.gif",
};

const TPL = "D:/Desktop/new/dsh-whale-pet/lib/pet.template.html";
const OUTS = [
  "D:/Desktop/new/dsh-whale-pet/lib/pet.html",
  "C:/Users/22002/AppData/Roaming/dsh-desktop-client/dsh/profiles/web/node_modules/dsh-balance-widget/lib/pet.html",
];

let tpl = readFileSync(TPL, "utf8");

for (const [key, file] of Object.entries(ANIM)) {
  const src = `D:/Desktop/new/dsh-whale-pet/lib/anim/${file}`;
  // read original per-frame delays and scale them
  const meta = await sharp(src, { animated: true }).metadata();
  const delays = (meta.delay || []).map((d) => Math.max(40, Math.round(d * DELAY_SCALE)));
  const webp = await sharp(src, { animated: true })
    .webp({ loop: 0, delay: delays })
    .toBuffer();
  const b64 = webp.toString("base64");
  console.log(`${key}: ${file} -> ${(webp.length / 1024).toFixed(1)}KB, delays ${JSON.stringify(delays)}`);
  tpl = tpl.split(`__ANIM_${key.toUpperCase()}__`).join(b64);
}

// idle static frame (first frame only) for resting state
const idleStatic = await sharp(`D:/Desktop/new/dsh-whale-pet/lib/anim/idle.gif`, { page: 0 })
  .webp({ lossless: false, quality: 90 })
  .toBuffer();
console.log(`idleStatic: ${(idleStatic.length / 1024).toFixed(1)}KB`);
tpl = tpl.split("__ANIM_IDLESTATIC__").join(idleStatic.toString("base64"));

// pre-synthesized neural voice clips (audio.json from tools/synth_all.py)
const AUDIO_JSON = "D:/Desktop/new/dsh-whale-pet/lib/audio.json";
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
console.log("done");

// End-to-end test of the built page in Chromium. Needs: npm install playwright, then npx playwright install chromium
// Usage: node tests/browser-test.js "path/to/a COPY of the fillable character sheet"
// 1. Opens the sheet through the plain file input and checks it is read-only (no save, no download).
// 2. Links it again through a stand-in for a Chrome/Edge file handle, makes changes, saves them
//    through that handle to tests/out/saved.pdf, and reports any page errors.
// The PDF you point at is never written.
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const sheet = process.argv[2];
  if (!sheet) { console.error("Give the path to a copy of the fillable sheet."); process.exit(1); }
  const page_ = "file://" + path.resolve(__dirname, "..", "dist", "Crawler_Cheat_Sheet.html");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  let downloads = 0;
  p.on("pageerror", e => errors.push(e.message));
  p.on("download", () => downloads++);
  await p.goto(page_);
  const text = id => p.$eval("#" + id, e => e.textContent);

  // 1. read-only path
  await p.setInputFiles("#sb-file", sheet);
  await p.waitForTimeout(800);
  console.log("Opened read-only:", await text("sb-who"), "|", await text("sb-file-name"));
  await p.click("#tt-health");
  await p.fill("#hm-dmg", "3");
  await p.click("#hm-hit");
  console.log("Save button:", await text("sb-save"), "| disabled:", await p.$eval("#sb-save", b => b.disabled));

  // 2. linked path, with a stand-in file handle that keeps the file in memory
  await p.evaluate(async b64 => {
    let data = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), mod = 1;
    window.__saved = null;
    const handle = {
      kind: "file", name: "sheet.pdf",
      queryPermission: async () => "granted", requestPermission: async () => "granted",
      getFile: async () => ({ name: "sheet.pdf", lastModified: mod, arrayBuffer: async () => data.slice().buffer }),
      createWritable: async () => { const parts = []; return { write: async b => parts.push(new Uint8Array(b)), close: async () => { data = parts[0]; mod++; window.__saved = data; } }; }
    };
    await window.__cheat.linkWithHandle(handle);
  }, fs.readFileSync(sheet).toString("base64"));
  console.log("Linked:", await text("sb-file-name"));
  await p.click("#tt-check");
  await p.selectOption("#ck-src", "s:0");
  await p.click('[data-preset="unopp"]');
  await p.click("#ck-roll");
  console.log("Check:", await text("ck-out"));
  await p.click("#tt-health");
  await p.fill("#hm-dmg", "3");
  await p.click("#hm-hit");
  console.log("Unsaved:", await p.$$eval("#sb-changes li", els => els.map(e => e.textContent)));
  await p.click("#sb-save");
  await p.waitForFunction(() => window.__saved);
  const saved = await p.evaluate(() => { let s = ""; window.__saved.forEach(b => s += String.fromCharCode(b)); return btoa(s); });
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "out", "saved.pdf"), Buffer.from(saved, "base64"));
  console.log("Status:", await text("sb-status"));
  console.log("Saved tests/out/saved.pdf. Downloads triggered:", downloads);
  console.log(errors.length ? "Page errors: " + errors.join("; ") : "No page errors.");
  await browser.close();
  process.exit(errors.length || downloads ? 1 : 0);
})();

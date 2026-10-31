// Round-trip test for src/pdf-engine.js. Needs Node 18 or newer, no packages.
// Usage: node tests/test-pdf-engine.js "path/to/Carl_Character_Sheet_Fillable.pdf"
// Reads the sheet, saves a few changes to tests/out/roundtrip.pdf, reopens it and checks them.
// Your original PDF is only read, never written.
const fs = require("fs");
const path = require("path");
const engine = fs.readFileSync(path.join(__dirname, "..", "src", "pdf-engine.js"), "utf8");
const PDF = new Function(engine + "\nreturn PDF;")();

(async () => {
  const file = process.argv[2];
  if (!file) { console.error("Give the path to a copy of the fillable sheet."); process.exit(1); }
  const doc = await PDF.open(new Uint8Array(fs.readFileSync(file)));
  const f = doc.fieldMap;
  console.log("Fields found:", Object.keys(f).length, "| xref:", doc.xrefKind);
  for (const k of ["Name", "level", "Floor", "Text Field 21", "Text Field 37", "Text Field 32", "Check Box6 1 8"]) {
    console.log("  " + k + ":", JSON.stringify(f[k] ? f[k].value : "(missing)"));
  }
  const changes = { "level": "2", "Text Field 37": "1", "Check Box6 1 8": true, "Check Box 1": true };
  const out = doc.save(changes);
  const dir = path.join(__dirname, "out");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "roundtrip.pdf"), out);
  const again = await PDF.open(out);
  let ok = true;
  for (const [k, v] of Object.entries(changes)) {
    const got = again.fieldMap[k].value;
    const pass = got === v;
    ok = ok && pass;
    console.log((pass ? "PASS " : "FAIL ") + k + ": expected " + JSON.stringify(v) + ", got " + JSON.stringify(got));
  }
  console.log(ok ? "All checks passed. Open tests/out/roundtrip.pdf to see the changes." : "Some checks failed.");
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });

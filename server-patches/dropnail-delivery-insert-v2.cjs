#!/usr/bin/env node
// ============================================================
// NN-DELIVERY INSERT v2 (by Arena agent)
// WHY v2: the LIVE server.js has TWO 'NN-PHONE2' lines (v1
// wrongly expected exactly 1 - that is also why the old sed
// matched both spots in one pass and corrupted the file).
// v2 picks the anchor by CONTEXT instead of by count:
//   the NN-PHONE2 line that sits DIRECTLY ABOVE the
//   'req.body.group_with' line inside POST /api/dropnail/orders.
// Safety:
//  - SKIP if NN-DELIVERY already present + well placed + syntax OK
//  - if file is broken / has remnants: auto-restores the NEWEST
//    good backup (syntax OK + zero NN-DELIVERY + has NN-PHONE2)
//  - ABORTS without writing if the context anchor is not unique
//  - makes its own backup before writing; rolls back if the
//    post-write verification fails
//  - insert lines are try/catch-wrapped so a runtime surprise
//    can never break order creation (worst case: a pm2 log line)
// Usage: node dropnail-delivery-insert-v2.cjs [server.js path]
// ============================================================
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const FILE = process.argv[2] || "/var/www/nagnail/server/server.js";

const LINES = [
  '    const nnDlv = Math.max(0, Math.min(100000, Math.round((parseFloat(req.body.delivery_charge) || 0) * 100) / 100)); // NN-DELIVERY separate field (never in profit)',
  '    try { if (nnDlv > 0) await db.query("UPDATE dropship_orders SET delivery_charge = ? WHERE id = ?", [nnDlv, result.insertId]); } catch (e) { console.error("NN-DLV-SAVE failed:", e && e.message); } // NN-DELIVERY'
];

// node --check refuses unknown extensions (.bak.<epoch> etc), so always
// check a temp .js copy next to the original.
const syntaxOK = (f) => {
  const tmp = f + ".nncheck.js";
  try {
    fs.copyFileSync(f, tmp);
    execSync("node --check " + JSON.stringify(tmp), { stdio: "pipe" });
    return true;
  } catch (e) { return false; }
  finally { try { fs.unlinkSync(tmp); } catch (e) {} }
};
const countIn = (s, needle) => s.split(needle).length - 1;
const wellPlaced = (s) => {
  const ls = s.split("\n");
  return ls.some((l, i) => l.includes("NN-DELIVERY") && ls[i + 1] && ls[i + 1].includes("req.body.group_with"));
};

let src;
try { src = fs.readFileSync(FILE, "utf8"); }
catch (e) { console.error("ABORT: cannot read " + FILE + " - " + e.message); process.exit(1); }

// --- 1) already done? ---
let n = countIn(src, "NN-DELIVERY");
if (n === 2 && wellPlaced(src) && syntaxOK(FILE)) {
  console.log("SKIP: NN-DELIVERY already present (2), well placed, syntax OK - nothing to do.");
  process.exit(0);
}

// --- 2) broken / remnants -> auto-restore newest GOOD backup ---
if (n > 0 || !syntaxOK(FILE)) {
  console.log("File needs repair (NN-DELIVERY=" + n + ", syntax=" + (syntaxOK(FILE) ? "OK" : "BROKEN") + ") - searching newest good backup...");
  const dir = path.dirname(FILE);
  const base = path.basename(FILE);
  let baks = [];
  try { baks = fs.readdirSync(dir).filter(f => f.startsWith(base + ".bak")).map(f => dir + "/" + f); } catch (e) {}
  baks.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs); // newest first
  let ok = null;
  for (const b of baks) {
    let bs;
    try { bs = fs.readFileSync(b, "utf8"); } catch (e) { continue; }
    if (countIn(bs, "NN-DELIVERY") === 0 && bs.includes("NN-PHONE2") && bs.includes("dropship_orders") && syntaxOK(b)) { ok = b; break; }
  }
  if (!ok) {
    console.error("ABORT: no good backup found among " + baks.length + " backup(s). Nothing was written. Paste this to the agent.");
    process.exit(1);
  }
  fs.copyFileSync(ok, FILE);
  console.log("RESTORED from: " + ok);
  src = fs.readFileSync(FILE, "utf8");
  n = countIn(src, "NN-DELIVERY");
  if (n !== 0 || !syntaxOK(FILE)) {
    console.error("ABORT: restore verification failed - paste this to the agent.");
    process.exit(1);
  }
}

// --- 3) find the CONTEXT anchor: NN-PHONE2 line directly above the group_with line ---
const lines = src.split("\n");
const phoneIdx = [];
lines.forEach((l, i) => { if (l.includes("NN-PHONE2")) phoneIdx.push(i); });
const cand = phoneIdx.filter(i => lines[i + 1] && lines[i + 1].includes("req.body.group_with"));
if (cand.length !== 1) {
  console.error("ABORT: expected exactly 1 'NN-PHONE2' line directly above 'req.body.group_with', found " + cand.length +
    " (total NN-PHONE2 lines: " + phoneIdx.length + "). Nothing was written. Paste the lines below to the agent:");
  phoneIdx.forEach(i => {
    console.error("--- L" + (i + 1) + ": " + String(lines[i]).trim().slice(0, 120));
    console.error("    next> " + String(lines[i + 1] || "").trim().slice(0, 120));
  });
  process.exit(1);
}
const at = cand[0];

// --- 4) sanity: the dropnail orders route must be nearby above ---
const winStart = Math.max(0, at - 300);
if (!lines.slice(winStart, at).some(l => l.includes("dropnail/orders"))) {
  console.error("ABORT: anchor found at L" + (at + 1) + " but no 'dropnail/orders' route within 300 lines above it. Nothing was written. Paste this to the agent.");
  process.exit(1);
}

// --- 5) backup, insert, verify ---
const bak = FILE + ".bak.nn" + Date.now();
fs.copyFileSync(FILE, bak);
const out = lines.slice(0, at + 1).concat(LINES).concat(lines.slice(at + 1)).join("\n");
fs.writeFileSync(FILE, out);

const v = fs.readFileSync(FILE, "utf8");
const vn = countIn(v, "NN-DELIVERY");
if (vn !== 2 || !wellPlaced(v) || !syntaxOK(FILE)) {
  fs.copyFileSync(bak, FILE);
  console.error("ABORT: post-write verification failed (count=" + vn + ", syntax=" + (syntaxOK(FILE) ? "OK" : "BROKEN") + ") - ROLLED BACK from " + bak + ". Paste this to the agent.");
  process.exit(1);
}
console.log("INSERTED OK - after line " + (at + 1) + ": " + String(lines[at]).trim().slice(0, 100));
console.log("            - next line: " + String(lines[at + 1]).trim().slice(0, 100));
console.log("NN-DELIVERY count: 2 | placement: OK | node --check: PASSED");
console.log("Pre-insert backup: " + bak);
console.log("Now run: pm2 restart nagnail-backend");

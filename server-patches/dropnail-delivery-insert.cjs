#!/usr/bin/env node
// ============================================================
// NN-DELIVERY INSERT (by Arena agent)
// Safely inserts the delivery_charge save (2 lines) right
// after the NN-PHONE2 line inside POST /api/dropnail/orders.
// - Refuses to run twice (idempotent - safe against double paste)
// - Refuses if the NN-PHONE2 anchor is not unique
// - Explicit newline handling (no sed quirks / no line gluing)
// Usage: node dropnail-delivery-insert.js [server.js path]
// ============================================================
const fs = require("fs");
const FILE = process.argv[2] || "/var/www/nagnail/server/server.js";

const LINES = [
  '    const nnDlv = Math.max(0, Math.min(100000, Math.round((parseFloat(req.body.delivery_charge) || 0) * 100) / 100)); // NN-DELIVERY separate field (never in profit)',
  '    if (nnDlv > 0) await db.query("UPDATE dropship_orders SET delivery_charge = ? WHERE id = ?", [nnDlv, result.insertId]); // NN-DELIVERY'
];

const src = fs.readFileSync(FILE, "utf8");

const count = (src.match(/NN-DELIVERY/g) || []).length;
if (count !== 0) {
  console.log("SKIP: NN-DELIVERY already present (" + count + " occurrences) - nothing to do.");
  process.exit(0);
}

const phoneCount = (src.match(/NN-PHONE2/g) || []).length;
if (phoneCount !== 1) {
  console.error("ABORT: expected exactly 1 'NN-PHONE2' anchor, found " + phoneCount + " - restore from backup and tell the agent.");
  process.exit(1);
}

const idx = src.indexOf("NN-PHONE2");
const lineEnd = src.indexOf("\n", idx);
if (lineEnd === -1) {
  console.error("ABORT: no newline after NN-PHONE2 anchor.");
  process.exit(1);
}

const out = src.slice(0, lineEnd + 1) + LINES.join("\n") + "\n" + src.slice(lineEnd + 1);
fs.writeFileSync(FILE, out);

const verify = (fs.readFileSync(FILE, "utf8").match(/NN-DELIVERY/g) || []).length;
if (verify !== 2) {
  console.error("FAILED: count after insert is " + verify + " (expected 2) - RESTORE FROM BACKUP!");
  process.exit(1);
}
console.log("INSERTED OK - NN-DELIVERY count: 2");
console.log("Now run: node --check " + FILE + " && pm2 restart nagnail-backend");

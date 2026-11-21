// NN-SPECS shared helpers (copied into each frontend)
export const TEMPLATES = {
  Camera: ["Type","Resolution","Viewing Angle","Sensor","Night Vision","Zoom","Storage","Connectivity","Device Support","App","Battery Backup Time","Color","Origin","Special Feature","Private Mold","Brand","Packaging"],
  "Smart Watch": ["Display","Screen Size","Battery Life","Charging","Water Resistance","Connectivity","Compatible With","App","Health Features","Strap Material","Color","Brand","Packaging"],
  Earbuds: ["Type","Bluetooth Version","Driver Size","Noise Cancellation","Playtime","Charging Case Battery","Charging Port","Water Resistance","Microphone","Compatible With","Color","Brand","Packaging"],
  "Power Bank": ["Capacity","Output","Input","Fast Charging","Ports","Wireless Charging","Battery Type","Weight","Size","Color","Brand","Packaging"],
  General: ["Type","Material","Size","Weight","Power","Color","Brand","Origin","Special Feature","Packaging"],
};
const BLOCK = /(price|\bmoq\b|min(imum)?\.? ?order|supplier|company|manufacturer name|contact|phone number|e-?mail|whatsapp|wechat|skype|alibaba|1688|aliexpress|\bfob\b|\bexw\b|\bcif\b|^port$|port of (loading|shipment|origin)|payment|lead ?time|\bsample|shipping|freight|supply ability|model number|model no|\bstore\b|\bshop\b|\bseller\b|\busd\b|\$|¥|\brmb\b|trade ?assurance|customi[sz]ed logo|\boem\b|\bodm\b)/i;
export function parsePaste(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").map(s => s.replace(/https?:\/\/\S+/g, "").trim()).filter(Boolean);
  const out = []; const seen = new Set();
  const push = (k, v) => {
    k = k.replace(/[:：]\s*$/, "").trim(); v = (v || "").trim();
    if (!k || !v || k.length > 40 || v.length > 200) return;
    if (BLOCK.test(k) || BLOCK.test(v)) return;
    const key = k.toLowerCase(); if (seen.has(key)) return; seen.add(key);
    out.push({ k, v });
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m = l.match(/^([^:：\t]{1,40})[:：\t]\s*(.+)$/);
    if (m) { push(m[1], m[2]); continue; }
    if (i + 1 < lines.length && l.length <= 40 && !/[:：\t]/.test(lines[i + 1])) { push(l, lines[i + 1]); i++; }
  }
  return out;
}
export function specsText(name, specs) {
  const items = (specs?.items || []).filter(r => r.k && r.v);
  let t = `*${String(name || "").trim()}*\n\n📋 *Specifications*\n` + items.map(r => `✅ ${r.k}: ${r.v}`).join("\n");
  if (specs?.package) t += `\n\n📦 *Package includes:* ${specs.package}`;
  return t;
}

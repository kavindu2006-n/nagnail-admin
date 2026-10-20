// ============================================================
// DROPSHIP CUSTOMER INVOICE PDF - v2 lib (by Arena agent)
// Deploy to: /var/www/nagnail/server/lib/dropshipInvoice.js
//
// buildCustomerInvoicePDF(order, brand) -> Promise<Buffer>
//
// order fields used: order_number, created_at, product_name,
//   quantity, selling_price, customer_name, customer_phone,
//   customer_phone2, customer_address, customer_city
// brand (all optional): { name, phone, email }
//
// Customer-facing: SELLING PRICE ONLY (never base price / profit).
// Neutral branding: shows the DROPSHIPPER's own business name -
// no NagNail / DropNail names, logos or links anywhere.
// Fixed column grid: every column has an exact right edge, so
// all numbers line up perfectly regardless of price length.
// ============================================================
function buildCustomerInvoicePDF(order, brand) {
  brand = brand || {};
  var PDFDocument = require("pdfkit");

  var qty = parseInt(order.quantity) || 1;
  var unit = parseFloat(order.selling_price) || 0;
  var total = Math.round(unit * qty * 100) / 100;
  var dlv = Math.max(0, parseFloat(order.delivery_charge) || 0); // NN-DELIVERY separate field
  var grand = Math.round((total + dlv) * 100) / 100; // NN-DELIVERY customer total
  function fmt(n) {
    return "Rs. " + Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  var dateStr = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  var DARK = "#1a1a2e", INK = "#111111", SOFT = "#444444", GRAY = "#8a8f98";
  var LINE = "#e5e8ee", HEADBG = "#f5f6f8", GREEN = "#1c8a5a", MUTED = "#aab0c0";

  var doc = new PDFDocument({
    size: "A4", margin: 0,
    info: {
      Title: "Invoice " + (order.order_number || ""),
      Author: brand.name || "Seller",
      Subject: "Invoice for Order " + (order.order_number || "")
    }
  });

  var W = doc.page.width;      // 595.28 (A4)
  var M = 48;                  // page margin
  var RIGHT = W - M;           // right edge of all content
  var CW = W - M * 2;          // content width

  // ---------- header band ----------
  doc.rect(0, 0, W, 110).fill(DARK);

  if (brand.name) {
    var bn = String(brand.name).trim();
    var bfs = 24;
    doc.font("Helvetica-Bold").fontSize(bfs);
    while (bfs > 13 && doc.widthOfString(bn) > 300) { bfs -= 1; doc.fontSize(bfs); }
    while (bn.length > 8 && doc.widthOfString(bn) > 306) bn = bn.slice(0, -2);
    doc.fillColor("#ffffff").fontSize(bfs).text(bn, M, 34, { width: 306, lineBreak: false });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED)
      .text("Official Invoice", M, 34 + bfs + 12, { width: 306, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(21).fillColor("#ffffff")
      .text("INVOICE", RIGHT - 230, 34, { width: 230, align: "right", lineBreak: false });
  } else {
    doc.font("Helvetica-Bold").fontSize(24).fillColor("#ffffff")
      .text("INVOICE", M, 36, { lineBreak: false });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED)
      .text("Official Invoice", M, 68, { lineBreak: false });
  }

  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
  doc.text("Order No: " + (order.order_number || "-"), RIGHT - 230, 66, { width: 230, align: "right", lineBreak: false });
  if (dateStr) doc.text(dateStr, RIGHT - 230, 82, { width: 230, align: "right", lineBreak: false });

  // ---------- bill to + invoice details ----------
  var y = 134;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY).text("BILL TO", M, y, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK)
    .text(order.customer_name || "-", M, y + 14, { width: 250, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(SOFT);
  doc.text([order.customer_address, order.customer_city].filter(Boolean).join(", ") || "-", M, y + 32, { width: 250, lineGap: 2 });
  var leftEnd = doc.y + 6;
  var phones = [order.customer_phone, order.customer_phone2].filter(Boolean).join(" / ");
  if (phones) {
    doc.text("Phone: " + phones, M, leftEnd, { width: 250, lineBreak: false });
    leftEnd = doc.y + 6;
  }

  var dRows = [["Invoice Date", dateStr || "-"], ["Payment Method", "Cash on Delivery"]];
  var ry = y + 14;
  dRows.forEach(function (r) {
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(r[0], RIGHT - 210, ry, { width: 96, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(r[1], RIGHT - 110, ry, { width: 110, align: "right", lineBreak: false });
    ry += 17;
  });

  y = Math.max(leftEnd, ry, y + 64) + 22;

  // ---------- items table (fixed column grid) ----------
  // exact right edges: AMOUNT -> RIGHT, UNIT PRICE -> RIGHT-120, QTY -> RIGHT-230
  var AMT_RE = RIGHT, UNIT_RE = RIGHT - 120, QTY_RE = RIGHT - 230;
  var ITEM_X = M + 12, ITEM_W = QTY_RE - 38 - ITEM_X;

  doc.rect(M, y, CW, 26).fill(HEADBG);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#555a66");
  doc.text("ITEM", ITEM_X, y + 9, { lineBreak: false });
  doc.text("QTY", QTY_RE - 30, y + 9, { width: 30, align: "right", lineBreak: false });
  doc.text("UNIT PRICE", UNIT_RE - 90, y + 9, { width: 90, align: "right", lineBreak: false });
  doc.text("AMOUNT", AMT_RE - 90, y + 9, { width: 90, align: "right", lineBreak: false });
  doc.moveTo(M, y + 26).lineTo(RIGHT, y + 26).lineWidth(1).strokeColor(LINE).stroke();
  y += 26;

  var items = [{ name: order.product_name || "Item", qty: qty, unit: unit }];
  items.forEach(function (it) {
    var top = y + 10;
    doc.font("Helvetica").fontSize(10).fillColor(INK);
    // single-line names sit on the same baseline as the numbers;
    // multi-line names are top-aligned, numbers vertically centered
    var oneLine = doc.widthOfString(it.name) <= ITEM_W;
    var iy = oneLine ? top + 9 : top + 2;
    doc.text(it.name, ITEM_X, iy, { width: ITEM_W, lineGap: 2 });
    var rowH = Math.max(doc.y - top + 4, 26);
    var nY = top + rowH / 2 - 4;
    doc.font("Helvetica").fontSize(10).fillColor(INK);
    doc.text(String(it.qty), QTY_RE - 30, nY, { width: 30, align: "right", lineBreak: false });
    doc.text(fmt(it.unit), UNIT_RE - 90, nY, { width: 90, align: "right", lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(fmt(it.qty * it.unit), AMT_RE - 90, nY, { width: 90, align: "right", lineBreak: false });
    y = top + rowH;
    doc.moveTo(M, y).lineTo(RIGHT, y).lineWidth(0.6).strokeColor(LINE).stroke();
  });
  y += 12;

  // ---------- totals (all values right-aligned to the SAME edge) ----------
  var VAL_W = 130, VAL_X = RIGHT - 14 - VAL_W, LBL_X = RIGHT - 286;

  doc.font("Helvetica").fontSize(10).fillColor(SOFT).text("Subtotal", LBL_X, y, { lineBreak: false });
  doc.font("Helvetica").fontSize(10).fillColor(INK).text(fmt(total), VAL_X, y, { width: VAL_W, align: "right", lineBreak: false });
  y += 17;
  doc.font("Helvetica").fontSize(10).fillColor(SOFT).text("Delivery", LBL_X, y, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(10).fillColor(dlv > 0 ? INK : GREEN).text(dlv > 0 ? fmt(dlv) : "FREE", VAL_X, y, { width: VAL_W, align: "right", lineBreak: false });
  y += 24;

  doc.rect(RIGHT - 300, y, 300, 34).fill(DARK);
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#ffffff");
  doc.text("TOTAL", RIGHT - 286, y + 11, { lineBreak: false });
  doc.text(fmt(grand), VAL_X, y + 11, { width: VAL_W, align: "right", lineBreak: false });
  y += 34 + 26;

  // ---------- payment ----------
  doc.font("Helvetica").fontSize(9.5).fillColor(SOFT);
  doc.text("Payment Method: Cash on Delivery (COD)", M, y, { lineBreak: false });

  // ---------- footer ----------
  var fy = Math.max(y + 30, doc.page.height - 104);
  doc.moveTo(M, fy - 18).lineTo(RIGHT, fy - 18).lineWidth(0.6).strokeColor(LINE).stroke();
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK);
  doc.text(brand.name ? "Thank you for shopping with " + brand.name + "!" : "Thank you for your order!", M, fy, { width: CW, align: "center" });
  var contact = [brand.phone ? "Call / WhatsApp: " + brand.phone : null, brand.email || null].filter(Boolean).join("   |   ");
  if (contact) {
    doc.font("Helvetica").fontSize(9).fillColor(GRAY);
    doc.text(contact, M, fy + 20, { width: CW, align: "center" });
  }

  // ---------- stream out ----------
  return new Promise(function (resolve, reject) {
    var chunks = [];
    doc.on("data", function (c) { chunks.push(c); });
    doc.on("error", reject);
    doc.on("end", function () { resolve(Buffer.concat(chunks)); });
    doc.end();
  });
}

module.exports = buildCustomerInvoicePDF;

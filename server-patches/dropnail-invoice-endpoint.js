// ============================================================
// DROPNAIL CUSTOMER INVOICE (appended by Arena agent)
// GET /api/dropnail/orders/:id/invoice
// - Dropshipper can only download invoices for THEIR OWN orders
// - Customer-facing: SELLING PRICE ONLY (no base price, no profit)
// - Self-contained PDFKit generator (NagNail branding)
// ============================================================
app.get("/api/dropnail/orders/:id/invoice", authenticateDropshipper, async (req, res) => {
  try {
    const [[o]] = await db.query(
      "SELECT o.*, p.name AS product_name, p.image_url FROM dropship_orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.id = ? AND o.dropshipper_id = ?",
      [req.params.id, req.dropshipper.id]
    );
    if (!o) return res.status(404).json({ success: false, error: "Order not found" });

    const qty = parseInt(o.quantity) || 1;
    const unit = parseFloat(o.selling_price) || 0;
    const total = Math.round(unit * qty * 100) / 100;
    const fmtLKR = (n) => "Rs. " + Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const PDFDocument = require("pdfkit");
    const fs = require("fs");
    const path = require("path");
    const LOGO_PATH = path.join(__dirname, "../public/images/logo.png");
    const BRAND = "#D4006A", DARK = "#1a1a2e", GRAY = "#6c757d", LINE = "#e9ecef";

    const doc = new PDFDocument({
      size: "A4", margin: 0,
      info: { Title: "NagNail Invoice - " + o.order_number, Author: "NagNail.lk", Subject: "Invoice for Order " + o.order_number }
    });
    const buffers = [];
    doc.on("data", (c) => buffers.push(c));
    doc.on("error", (e) => res.status(500).json({ success: false, error: e.message }));
    doc.on("end", () => {
      const pdf = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="NagNail-Invoice-' + o.order_number + '.pdf"');
      res.setHeader("Content-Length", pdf.length);
      res.send(pdf);
    });

    const W = doc.page.width, M = 40, CW = W - M * 2;

    // ── Header band ──
    doc.rect(0, 0, W, 130).fill(DARK);
    let logoX = M;
    if (fs.existsSync(LOGO_PATH)) {
      try { doc.image(LOGO_PATH, M, 38, { height: 54 }); logoX = M + 140; } catch (e) {}
    }
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(26).text("NagNail.lk", logoX, 40);
    doc.font("Helvetica").fontSize(10).fillColor("#b9b9c8").text("Premium Beauty & Nail Products", logoX, 74);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("INVOICE", M, 46, { width: CW, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#b9b9c8").text("Order " + o.order_number, M, 70, { width: CW, align: "right" });

    // ── Meta row: date + bill to ──
    let y = 150;
    doc.fillColor(GRAY).fontSize(8).font("Helvetica-Bold").text("INVOICE DATE", M, y);
    doc.fillColor("#111111").fontSize(11).text(new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), M, y + 13);

    doc.fillColor(GRAY).fontSize(8).font("Helvetica-Bold").text("BILL TO", M + 200, y);
    doc.fillColor("#111111").fontSize(11).font("Helvetica-Bold").text(o.customer_name || "-", M + 200, y + 13);
    doc.font("Helvetica").fontSize(9).fillColor("#333333");
    doc.text([o.customer_address, o.customer_city].filter(Boolean).join(", "), M + 200, y + 30, { width: 240 });
    doc.moveDown(0.2);
    doc.text("Phone: " + (o.customer_phone || "-"), M + 200, doc.y, { width: 240 });

    y = Math.max(doc.y, y + 100) + 24;

    // ── Items table ──
    doc.rect(M, y, CW, 26).fill("#f8f9fa");
    doc.fillColor(GRAY).fontSize(9).font("Helvetica-Bold");
    doc.text("ITEM", M + 10, y + 8);
    doc.text("QTY", M + CW - 230, y + 8, { width: 60, align: "center" });
    doc.text("UNIT PRICE", M + CW - 160, y + 8, { width: 100, align: "right" });
    doc.text("AMOUNT", M + CW - 50, y + 8, { width: 40, align: "right" });
    y += 26;

    const rowY = y + 12;
    doc.fillColor("#111111").font("Helvetica").fontSize(10);
    doc.text(o.product_name || "Item", M + 10, rowY, { width: CW - 260 });
    doc.text(String(qty), M + CW - 230, rowY, { width: 60, align: "center" });
    doc.text(fmtLKR(unit), M + CW - 160, rowY, { width: 100, align: "right" });
    doc.text(fmtLKR(total), M + CW - 50, rowY, { width: 40, align: "right" });
    y = Math.max(doc.y, rowY + 16);
    doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(0.75).strokeColor(LINE).stroke();

    // ── Totals ──
    y += 20;
    const totX = M + CW - 240;
    doc.fontSize(10).fillColor("#333333").font("Helvetica");
    doc.text("Subtotal", totX, y, { width: 130 });
    doc.text(fmtLKR(total), totX + 130, y, { width: 110, align: "right" });
    y += 18;
    doc.text("Delivery", totX, y, { width: 130 });
    doc.text("FREE", totX + 130, y, { width: 110, align: "right" });
    y += 26;
    doc.rect(totX - 12, y - 8, 252, 32).fill(BRAND);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
    doc.text("TOTAL", totX, y, { width: 130 });
    doc.text(fmtLKR(total), totX + 130, y, { width: 110, align: "right" });

    // ── Payment + footer ──
    y += 48;
    doc.fillColor(GRAY).fontSize(9).font("Helvetica");
    doc.text("Payment Method: Cash on Delivery (COD)", M, y, { width: CW });
    doc.fontSize(10).fillColor("#111111").font("Helvetica-Bold");
    doc.text("Thank you for shopping with NagNail!", M, doc.page.height - 96, { width: CW, align: "center" });
    doc.fillColor(GRAY).fontSize(8).font("Helvetica");
    doc.text("Track your order: https://nagnail.lk/track?order=" + o.order_number, M, doc.page.height - 76, { width: CW, align: "center" });
    doc.fontSize(7).fillColor("#aaaaaa");
    doc.text("This invoice was generated by NagNail.lk.", M, doc.page.height - 58, { width: CW, align: "center" });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

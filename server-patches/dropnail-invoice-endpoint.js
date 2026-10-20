// ============================================================
// DROPNAIL CUSTOMER INVOICE v2 (appended by Arena agent)
// GET /api/dropnail/orders/:id/invoice
// - Dropshipper can only download invoices for THEIR OWN orders
// - Customer-facing: SELLING PRICE ONLY (no base price, no profit)
// - Branded with the DROPSHIPPER's own business name -
//   no NagNail / DropNail names, logos or links anywhere
// - Layout engine lives in ./lib/dropshipInvoice.js (v2 grid)
// ============================================================
const __dropshipInvoicePDF = require("./lib/dropshipInvoice");
app.get("/api/dropnail/orders/:id/invoice", authenticateDropshipper, async (req, res) => {
  try {
    const [[o]] = await db.query(
      "SELECT o.*, p.name AS product_name, p.image_url FROM dropship_orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.id = ? AND o.dropshipper_id = ?",
      [req.params.id, req.dropshipper.id]
    );
    if (!o) return res.status(404).json({ success: false, error: "Order not found" });

    // dropshipper's own brand info (tolerant to column naming)
    let brand = {};
    try {
      const [[ds]] = await db.query("SELECT * FROM dropshippers WHERE id = ? LIMIT 1", [req.dropshipper.id]);
      if (ds) brand = {
        name: ds.business_name || ds.shop_name || ds.store_name || ds.brand_name || ds.company_name || ds.outlet_name || ds.page_name || ds.fb_page_name || ds.display_name || ds.name || null,
        phone: ds.phone || ds.whatsapp || ds.whatsapp_number || ds.contact_number || ds.mobile || null,
        email: ds.email || null
      };
    } catch (e) { /* dropshippers table/columns not found -> neutral invoice */ }
    if (!brand.name && o.dropshipper_name) brand.name = o.dropshipper_name;

    const pdf = await __dropshipInvoicePDF(o, brand);
    const slug = String(brand.name || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="' + (slug ? slug + "-" : "") + "Invoice-" + o.order_number + '.pdf"');
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

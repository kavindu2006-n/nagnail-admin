// ============================================================
// ADMIN: DELETE FAKE DROPSHIP ORDER (appended by Arena agent)
// DELETE /api/admin/dropship-orders/:id
//   ?group=1  -> also delete every row in the same parcel group
// - Permanently removes fake/test orders (wrong address, junk details)
// - Auto-detects the SAME admin auth used by the existing
//   /api/admin/dropship-orders routes (safe append, no name guessing)
// - Refuses to delete 'delivered' orders (profit/wallet records)
// - Cancel already exists separately: PUT /api/admin/dropship-orders/:id/status
// ============================================================
(function () {
  function findAdminAuth(router, pathRe) {
    try {
      var stack = router && (router.stack || (router._router && router._router.stack));
      if (!stack) return null;
      for (var i = 0; i < stack.length; i++) {
        var layer = stack[i];
        if (layer && layer.route && layer.route.methods && layer.route.methods.get &&
            typeof layer.route.path === "string" && pathRe.test(layer.route.path)) {
          var mws = layer.route.stack || [];
          for (var j = 0; j < mws.length; j++) {
            var h = mws[j] && mws[j].handle;
            if (typeof h === "function" && h.length >= 3) return h;
          }
        }
        var nested = layer && layer.handle && layer.handle.stack ? layer.handle : null;
        if (nested) { var f = findAdminAuth(nested, pathRe); if (f) return f; }
      }
    } catch (e) {}
    return null;
  }

  var __dsOrderAdminAuth =
    findAdminAuth(app._router || app.router, /\/dropship-orders\/?$/) ||
    findAdminAuth(app._router || app.router, /\/dropshippers\/?$/) ||
    (typeof authenticateAdmin !== "undefined" ? authenticateAdmin :
     typeof verifyAdmin !== "undefined" ? verifyAdmin :
     typeof adminAuth !== "undefined" ? adminAuth : null);

  if (__dsOrderAdminAuth) {
    app.delete("/api/admin/dropship-orders/:id", __dsOrderAdminAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (!id || id < 1) return res.status(400).json({ success: false, error: "Invalid order id" });

        const [[o]] = await db.query(
          "SELECT id, order_number, group_no, status, dropshipper_id, customer_name FROM dropship_orders WHERE id = ? LIMIT 1",
          [id]
        );
        if (!o) return res.status(404).json({ success: false, error: "Order not found" });

        if (o.status === "delivered") {
          return res.status(409).json({
            success: false,
            error: "Cannot delete a DELIVERED order (profit/wallet records). Pending/cancelled/shipped orders can be deleted."
          });
        }

        let sql = "DELETE FROM dropship_orders WHERE id = ?";
        let params = [id];
        let groupDeleted = false;

        if (req.query.group === "1" && o.group_no) {
          sql = "DELETE FROM dropship_orders WHERE group_no = ?";
          params = [o.group_no];
          groupDeleted = true;
        }

        const [r] = await db.query(sql, params);
        res.json({
          success: true,
          deleted: r.affectedRows,
          group: groupDeleted,
          message: "Deleted " + r.affectedRows + " order row" + (r.affectedRows === 1 ? "" : "s") +
            (groupDeleted ? " (whole parcel group " + o.group_no + ")" : "") + " - " + (o.order_number || "#" + id)
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
    console.log("[admin-dropship-order-delete] DELETE /api/admin/dropship-orders/:id registered");
  } else {
    console.warn("[admin-dropship-order-delete] admin auth middleware not found - endpoint NOT registered");
  }
})();

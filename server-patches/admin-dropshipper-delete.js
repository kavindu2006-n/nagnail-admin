// ============================================================
// ADMIN: DELETE DROPSHIPPER (appended by Arena agent)
// DELETE /api/admin/dropshippers/:id
// - Permanently deletes a dropshipper account so they can
//   re-register fresh (e.g. forgotten password)
// - Re-uses the SAME admin auth as the existing
//   GET /api/admin/dropshippers route (auto-detected from the
//   Express router - no hard-coded middleware name, safe append)
// - Safety: refuses to delete if the dropshipper has any orders
// ============================================================
(function () {
  function findDropshipperAdminAuth(router, wantAdminPath) {
    try {
      var stack = router && (router.stack || (router._router && router._router.stack));
      if (!stack) return null;
      for (var i = 0; i < stack.length; i++) {
        var layer = stack[i];
        if (layer && layer.route && layer.route.methods && layer.route.methods.get &&
            typeof layer.route.path === "string" && /\/dropshippers\/?$/.test(layer.route.path) &&
            (!wantAdminPath || layer.route.path.indexOf("/admin") !== -1)) {
          var mws = layer.route.stack || [];
          for (var j = 0; j < mws.length; j++) {
            var h = mws[j] && mws[j].handle;
            if (typeof h === "function" && h.length >= 3) return h; // first middleware = admin auth
          }
        }
        var nested = layer && layer.handle && layer.handle.stack ? layer.handle : null;
        if (nested) {
          var found = findDropshipperAdminAuth(nested, wantAdminPath);
          if (found) return found;
        }
      }
    } catch (e) {}
    return null;
  }

  var __dsAdminAuth =
    findDropshipperAdminAuth(app._router || app.router, true) ||
    findDropshipperAdminAuth(app._router || app.router, false) ||
    (typeof authenticateAdmin !== "undefined" ? authenticateAdmin :
     typeof verifyAdmin !== "undefined" ? verifyAdmin :
     typeof adminAuth !== "undefined" ? adminAuth :
     typeof requireAdmin !== "undefined" ? requireAdmin : null);

  if (__dsAdminAuth) {
    app.delete("/api/admin/dropshippers/:id", __dsAdminAuth, async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (!id || id < 1) return res.status(400).json({ success: false, error: "Invalid dropshipper id" });

        const [[ds]] = await db.query(
          "SELECT id, full_name, business_name, email FROM dropshippers WHERE id = ? LIMIT 1",
          [id]
        );
        if (!ds) return res.status(404).json({ success: false, error: "Dropshipper not found" });

        const [[oc]] = await db.query(
          "SELECT COUNT(*) AS n FROM dropship_orders WHERE dropshipper_id = ?",
          [id]
        );
        if (oc && oc.n > 0) {
          return res.status(409).json({
            success: false,
            error: "Cannot delete - " + (ds.business_name || ds.full_name) + " has " + oc.n +
              " order(s). Use Suspend instead, or the order history will be lost."
          });
        }

        await db.query("DELETE FROM dropshippers WHERE id = ?", [id]);
        res.json({
          success: true,
          message: (ds.business_name || ds.full_name || ds.email) + " deleted permanently - they can register again"
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
    console.log("[admin-dropshipper-delete] DELETE /api/admin/dropshippers/:id registered");
  } else {
    console.warn("[admin-dropshipper-delete] admin auth middleware not found - endpoint NOT registered");
  }
})();

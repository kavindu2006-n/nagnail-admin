
// ============================================================
// REAL PROFIT DASHBOARD ENDPOINT (appended by Arena agent)
// Calculates NagNail's REAL profit using actual PO costs
// from erp_product_batches — no more 45% guess!
// ============================================================
app.get("/api/admin/erp/dashboard/real-profit", adminAuth, async (req, res) => {
  try {
    // Cost expression: latest PO batch landed cost, fallback = 50% of retail price (same convention as profit-breakdown endpoint)
    const costOf = (pidAlias) =>
      `COALESCE((SELECT b.unit_landed_cost FROM erp_product_batches b WHERE b.product_id = ${pidAlias} ORDER BY b.id DESC LIMIT 1), p.price * 0.5)`;

    // ---- 1. Sales today (web + drop) ----
    const [[webToday]] = await db.query("SELECT COALESCE(SUM(total_amount),0) as val, COUNT(*) as orders FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'");
    const [[dropToday]] = await db.query("SELECT COALESCE(SUM(selling_price * quantity),0) as val, COUNT(*) as orders FROM dropship_orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'");

    // ---- 2. Month revenue split ----
    const [[webMonth]] = await db.query("SELECT COALESCE(SUM(total_amount),0) as val FROM orders WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW()) AND status != 'cancelled'");
    const [[dropMonthSell]] = await db.query("SELECT COALESCE(SUM(selling_price * quantity),0) as val FROM dropship_orders WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW()) AND status != 'cancelled'");
    const [[dropMonthBase]] = await db.query("SELECT COALESCE(SUM(base_price * quantity),0) as val FROM dropship_orders WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW()) AND status != 'cancelled'");

    // ---- 3. REAL PROFIT — WEBSITE (delivered orders this month) ----
    // Seller-aware: own items (seller_id NULL) = unit - landed cost;
    // seller items = commission only (unit - seller_earning, no COGS).
    // Manual orders write seller_earning = full line even for own items — ignored via CASE.
    const [[webP]] = await db.query(`
      SELECT
        COALESCE(SUM(oi.quantity * oi.unit_price),0) as revenue,
        COALESCE(SUM(CASE WHEN oi.seller_id IS NULL THEN oi.quantity * ${costOf("oi.product_id")} ELSE 0 END),0) as product_cost,
        COALESCE(SUM(CASE WHEN oi.seller_id IS NOT NULL THEN COALESCE(oi.seller_earning,0) ELSE 0 END),0) as seller_commission
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'delivered' AND MONTH(o.created_at) = MONTH(NOW()) AND YEAR(o.created_at) = YEAR(NOW())
        AND COALESCE(oi.item_status,'') NOT IN ('cancelled','returned')
    `);
    const webProfit = parseFloat(webP.revenue) - parseFloat(webP.product_cost) - parseFloat(webP.seller_commission);

    // ---- 4. REAL PROFIT — DROPSHIP (delivered this month, NagNail share = base_price - cost) ----
    const [[dropP]] = await db.query(`
      SELECT
        COALESCE(SUM(o.base_price * o.quantity),0) as nagnail_revenue,
        COALESCE(SUM(o.quantity * ${costOf("o.product_id")}),0) as product_cost,
        COALESCE(SUM(o.profit),0) as dropshipper_earnings
      FROM dropship_orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.status = 'delivered' AND MONTH(o.created_at) = MONTH(NOW()) AND YEAR(o.created_at) = YEAR(NOW())
    `);
    const dropProfit = parseFloat(dropP.nagnail_revenue) - parseFloat(dropP.product_cost);

    // ---- 5. Today's real profit ----
    const [[webPToday]] = await db.query(`
      SELECT COALESCE(SUM(oi.quantity * (oi.unit_price - CASE WHEN oi.seller_id IS NULL THEN ${costOf("oi.product_id")} ELSE 0 END) - CASE WHEN oi.seller_id IS NOT NULL THEN COALESCE(oi.seller_earning,0) ELSE 0 END),0) as profit
      FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'delivered' AND DATE(o.created_at) = CURDATE()
        AND COALESCE(oi.item_status,'') NOT IN ('cancelled','returned')
    `);
    const [[dropPToday]] = await db.query(`
      SELECT COALESCE(SUM(o.quantity * (o.base_price - ${costOf("o.product_id")})),0) as profit
      FROM dropship_orders o JOIN products p ON o.product_id = p.id
      WHERE o.status = 'delivered' AND DATE(o.created_at) = CURDATE()
    `);

    // ---- 6. Expenses (month) + by category ----
    const [[monthExp]] = await db.query("SELECT COALESCE(SUM(amount),0) as val FROM erp_expenses WHERE MONTH(expense_date) = MONTH(NOW()) AND YEAR(expense_date) = YEAR(NOW())");
    const [expensesByCategory] = await db.query(`
      SELECT ec.name, SUM(e.amount) as amount FROM erp_expenses e
      JOIN erp_expense_categories ec ON e.category_id = ec.id
      WHERE MONTH(e.expense_date) = MONTH(NOW()) AND YEAR(e.expense_date) = YEAR(NOW())
      GROUP BY ec.id ORDER BY amount DESC
    `);

    const netRealProfit = webProfit + dropProfit - parseFloat(monthExp.val);

    // ---- 7. Inventory / payables / COD pending / counts ----
    const [[invVal]] = await db.query("SELECT COALESCE(SUM(qty_remaining * unit_landed_cost),0) as val FROM erp_product_batches WHERE qty_remaining > 0");
    const [[payables]] = await db.query("SELECT COALESCE(SUM(total_amount - paid_amount),0) as val FROM erp_purchases WHERE status != 'cancelled' AND payment_status != 'paid'");
    const [[codWeb]] = await db.query("SELECT COALESCE(SUM(total_amount),0) as val FROM orders WHERE payment_method = 'cod' AND payment_status = 'unpaid' AND status != 'cancelled'");
    const [[codDrop]] = await db.query("SELECT COALESCE(SUM(selling_price * quantity),0) as val FROM dropship_orders WHERE status IN ('confirmed','processing','shipped')");
    const [[pendingOrders]] = await db.query("SELECT (SELECT COUNT(*) FROM orders WHERE status = 'pending') + (SELECT COUNT(*) FROM dropship_orders WHERE status = 'pending') as count");
    const [[lowStock]] = await db.query("SELECT COUNT(*) as count FROM products WHERE is_nagnail_official = 1 AND is_active = 1 AND stock_qty <= 5");
    const [[customers]] = await db.query("SELECT COUNT(*) as total_customers FROM users");
    const [[dropshippers]] = await db.query("SELECT COUNT(*) as total_dropshippers FROM dropshippers");
    const [[pendingDropshippers]] = await db.query("SELECT COUNT(*) as pending_dropshippers FROM dropshippers WHERE status='pending'");

    // ---- 8. Trends (30 days) ----
    const [webRevTrend] = await db.query("SELECT DATE(created_at) as date, COALESCE(SUM(total_amount),0) as web FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status != 'cancelled' GROUP BY DATE(created_at)");
    const [dropRevTrend] = await db.query("SELECT DATE(created_at) as date, COALESCE(SUM(selling_price * quantity),0) as drop_rev FROM dropship_orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status != 'cancelled' GROUP BY DATE(created_at)");
    const [webProfitTrend] = await db.query(`
      SELECT DATE(o.created_at) as date, COALESCE(SUM(oi.quantity * (oi.unit_price - CASE WHEN oi.seller_id IS NULL THEN ${costOf("oi.product_id")} ELSE 0 END) - CASE WHEN oi.seller_id IS NOT NULL THEN COALESCE(oi.seller_earning,0) ELSE 0 END),0) as web
      FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'delivered' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND COALESCE(oi.item_status,'') NOT IN ('cancelled','returned') GROUP BY DATE(o.created_at)
    `);
    const [dropProfitTrend] = await db.query(`
      SELECT DATE(o.created_at) as date, COALESCE(SUM(o.quantity * (o.base_price - ${costOf("o.product_id")})),0) as drop_p
      FROM dropship_orders o JOIN products p ON o.product_id = p.id
      WHERE o.status = 'delivered' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(o.created_at)
    `);
    const mergeTrend = (a, b, keys) => {
      const map = {};
      [...a, ...b].forEach((r) => { const d = new Date(r.date).toISOString().slice(0,10); map[d] = map[d] || { date: d }; Object.assign(map[d], r, { date: d }); });
      return Object.values(map).sort((x, y) => x.date.localeCompare(y.date)).map((r) => { keys.forEach((k) => { r[k] = parseFloat(r[k] || 0); }); return r; });
    };
    const revenue_trend = mergeTrend(webRevTrend, dropRevTrend.map((r) => ({ date: r.date, drop: r.drop_rev })), ["web", "drop"]).map((r) => ({ ...r, total: r.web + r.drop }));
    const profit_trend = mergeTrend(webProfitTrend, dropProfitTrend.map((r) => ({ date: r.date, drop: r.drop_p })), ["web", "drop"]).map((r) => ({ ...r, net: r.web + r.drop }));

    // ---- 9. Statuses + customers chart ----
    const [order_status] = await db.query("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
    const [dropship_status] = await db.query("SELECT status, COUNT(*) as count FROM dropship_orders GROUP BY status");
    const [customers_chart] = await db.query("SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date ASC");

    // ---- 10. Top lists ----
    const [top_products] = await db.query(`
      SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.quantity * oi.unit_price) as revenue,
        SUM(oi.quantity * (oi.unit_price - CASE WHEN oi.seller_id IS NULL THEN ${costOf("oi.product_id")} ELSE 0 END) - CASE WHEN oi.seller_id IS NOT NULL THEN COALESCE(oi.seller_earning,0) ELSE 0 END) as profit
      FROM order_items oi JOIN orders o ON oi.order_id = o.id JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'delivered' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND COALESCE(oi.item_status,'') NOT IN ('cancelled','returned')
      GROUP BY p.id ORDER BY profit DESC LIMIT 5
    `);
    const [top_dropshippers] = await db.query(`
      SELECT d.full_name, d.business_name, COUNT(*) as orders,
        COALESCE(SUM(o.base_price * o.quantity),0) as nagnail_revenue,
        COALESCE(SUM(o.profit),0) as earnings
      FROM dropship_orders o JOIN dropshippers d ON o.dropshipper_id = d.id
      WHERE o.status = 'delivered' AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY d.id ORDER BY nagnail_revenue DESC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        today_sales: parseFloat(webToday.val) + parseFloat(dropToday.val),
        today_orders: parseInt(webToday.orders) + parseInt(dropToday.orders),
        today_profit: parseFloat(webPToday.profit) + parseFloat(dropPToday.profit),
        month_sales: parseFloat(webMonth.val) + parseFloat(dropMonthSell.val),
        month_web_sales: parseFloat(webMonth.val),
        month_drop_sales: parseFloat(dropMonthSell.val),
        month_drop_base_sales: parseFloat(dropMonthBase.val),
        profit_web: webProfit,
        profit_drop: dropProfit,
        web_detail: { revenue: parseFloat(webP.revenue), product_cost: parseFloat(webP.product_cost), seller_commission: parseFloat(webP.seller_commission) },
        drop_detail: { nagnail_revenue: parseFloat(dropP.nagnail_revenue), product_cost: parseFloat(dropP.product_cost), dropshipper_earnings: parseFloat(dropP.dropshipper_earnings) },
        dropshipper_earnings_month: parseFloat(dropP.dropshipper_earnings),
        expenses_month: parseFloat(monthExp.val),
        expenses_by_category: expensesByCategory,
        net_real_profit: netRealProfit,
        inventory_value: parseFloat(invVal.val),
        supplier_payables: parseFloat(payables.val),
        cod_pending: parseFloat(codWeb.val) + parseFloat(codDrop.val),
        pending_orders: pendingOrders.count,
        low_stock_count: lowStock.count,
        total_customers: customers.total_customers,
        total_dropshippers: dropshippers.total_dropshippers,
        pending_dropshippers: pendingDropshippers.pending_dropshippers,
        revenue_trend, profit_trend, order_status, dropship_status, customers_chart, top_products, top_dropshippers
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

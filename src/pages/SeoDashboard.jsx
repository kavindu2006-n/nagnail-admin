import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/config";
import Layout from "../components/Layout";

const clean = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const bool = (v) => v === 1 || v === true || v === "1";
const safeCsv = (value) => {
  const str = String(value ?? "");
  const escaped = /^[=+@\-\t\r]/.test(str) ? "'" + str : str;
  return '"' + escaped.replace(/"/g, '""') + '"';
};

function audit(product) {
  const issues = [];
  const name = clean(product.name);
  const metaTitle = clean(product.meta_title);
  const description = clean(product.description);
  const metaDescription = clean(product.meta_description);
  const brand = product.brand_id;
  const sku = clean(product.sku);
  const image = clean(product.image_url);
  const gtin = clean(product.gtin);
  const mpn = clean(product.mpn);
  const price = Number(product.sale_price || product.price || 0);
  const add = (key, label, points, priority, action) => issues.push({ key, label, points, priority, action });
  if (!name) add("name", "Product name missing", 20, "High", "Add a clear product title");
  else if (name.length > 150) add("name_long", "Product title is very long", 5, "Medium", "Shorten the product title without losing key details");
  if (!metaTitle) add("meta_title", "SEO meta title missing", 15, "High", "Add a unique, descriptive meta title");
  else if (metaTitle.length > 65) add("meta_title_long", "Meta title is long", 4, "Low", "Consider a shorter title; Google may rewrite it");
  else if (metaTitle.length < 25) add("meta_title_short", "Meta title may be too short", 4, "Low", "Describe the product more specifically");
  if (!description || description.length < 80) add("description", "Product description is missing or thin", 15, "High", "Write accurate features, usage and specifications");
  if (!metaDescription) add("meta_description", "Meta description missing", 10, "Medium", "Write a useful search snippet");
  else if (metaDescription.length < 70 || metaDescription.length > 170) add("meta_description_length", "Meta description length needs review", 3, "Low", "Improve clarity rather than optimizing for a fixed character count");
  if (!image) add("image", "Main product image missing", 15, "High", "Upload a genuine clear product photo");
  if (!brand) add("brand", "Manufacturer brand not assigned", 8, "Medium", "Assign verified brand, or leave unbranded when appropriate");
  if (!sku) add("sku", "SKU missing", 5, "Low", "Add your real stock keeping unit if available");
  if (!price || price <= 0) add("price", "Valid selling price missing", 10, "High", "Set a valid selling price");
  // GTIN / MPN are optional: absence is informational, not a quality penalty.
  const identifiers = gtin ? "GTIN supplied" : mpn ? "MPN supplied" : "No GTIN/MPN supplied (optional)";
  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + issue.points, 0));
  const severity = issues.some(x => x.priority === "High") ? "High" : issues.some(x => x.priority === "Medium") ? "Medium" : "Low";
  return { product, issues, score, severity, identifiers, active: bool(product.is_active) };
}

function Metric({label,value,detail,onClick,tone="indigo"}) {
  const colors = {indigo:"text-indigo-600",rose:"text-rose-600",amber:"text-amber-600",emerald:"text-emerald-600"};
  return <button type="button" onClick={onClick} disabled={!onClick} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left shadow-sm transition hover:shadow-md disabled:cursor-default disabled:hover:shadow-sm">
    <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-2xl sm:text-3xl font-black ${colors[tone]}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p>
  </button>;
}
const ISSUE_OPTIONS = [
  ["all","All SEO issues"],["high","High priority"],["missing_meta","Any meta gap"],
  ["meta_title","Missing meta title"],["meta_description","Missing meta description"],
  ["description","Thin description"],["missing_image","Missing image"],
  ["sku","Missing SKU"],["unbranded","Brand unassigned"],["good","Score 85+"]
];
const selectClass = "min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const chip = priority => priority === "High" ? "bg-rose-50 text-rose-700" : priority === "Medium" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600";
export default function SeoDashboard() {
  const [items,setItems] = useState([]);
  const [categories,setCategories] = useState([]);
  const [brands,setBrands] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [issueFilter,setIssueFilter] = useState("all");
  const [sort,setSort] = useState("priority");
  const [includeHidden,setIncludeHidden] = useState(false);
  const [sourceFilter,setSourceFilter] = useState("all");
  const [categoryFilter,setCategoryFilter] = useState("all");
  const [brandFilter,setBrandFilter] = useState("all");
  const [minScore,setMinScore] = useState("");
  const [maxScore,setMaxScore] = useState("");
  const [expanded,setExpanded] = useState(null);
  const [page,setPage] = useState(1);
  const perPage = 20;
  async function refresh() {
    setLoading(true); setError("");
    try {
      const result = await API.get("/products");
      const products = Array.isArray(result.data) ? result.data : result.data?.products;
      if (!Array.isArray(products)) throw new Error("Unexpected products API response");
      setItems(products.map(audit));
      const extras = await Promise.allSettled([API.get("/categories"),API.get("/brands")]);
      if (extras[0].status === "fulfilled") { const d=extras[0].value.data; setCategories(Array.isArray(d)?d:(d?.categories||[])); }
      if (extras[1].status === "fulfilled") { const d=extras[1].value.data; setBrands(Array.isArray(d)?d:(d?.brands||[])); }
    } catch (err) { setError(err?.response?.data?.error || err.message || "Unable to load products"); }
    finally { setLoading(false); }
  }
  useEffect(()=>{refresh();},[]);
  const audited = useMemo(()=>items.filter(x=>includeHidden||x.active),[items,includeHidden]);
  const summary = useMemo(()=>({
    total:audited.length,
    high:audited.filter(x=>x.severity==="High").length,
    metaMissing:audited.filter(x=>x.issues.some(y=>["meta_title","meta_description"].includes(y.key))).length,
    noImage:audited.filter(x=>x.issues.some(y=>y.key==="image")).length,
    average:audited.length ? Math.round(audited.reduce((n,x)=>n+x.score,0)/audited.length) : 0,
    healthy:audited.filter(x=>x.score>=85).length
  }),[audited]);
  const issueCounts = useMemo(()=>{
    const counts=new Map();
    audited.forEach(item=>item.issues.forEach(issue=>counts.set(issue.key,{...issue,count:(counts.get(issue.key)?.count||0)+1})));
    return [...counts.values()].sort((a,b)=>b.count-a.count).slice(0,6);
  },[audited]);
  const filtered = useMemo(()=>{
    const q=search.trim().toLowerCase();
    const has=(x,key)=>x.issues.some(i=>i.key===key);
    let data=audited.filter(x=>{
      const p=x.product;
      if(q&&!`${p.id} ${p.name||""} ${p.sku||""}`.toLowerCase().includes(q)) return false;
      if(sourceFilter==="warehouse"&&Number(p.is_nagnail_official)!==1)return false;
      if(sourceFilter==="dropship"&&Number(p.is_nagnail_official)!==0)return false;
      if(categoryFilter!=="all"&&String(p.category_id??"")!==categoryFilter)return false;
      if(brandFilter!=="all"&&String(p.brand_id??"")!==brandFilter)return false;
      if(minScore!==""&&x.score<Number(minScore))return false;
      if(maxScore!==""&&x.score>Number(maxScore))return false;
      if(issueFilter==="high"&&x.severity!=="High")return false;
      if(issueFilter==="missing_meta"&&!(["meta_title","meta_description"].some(k=>has(x,k))))return false;
      if(issueFilter==="missing_image"&&!has(x,"image"))return false;
      if(issueFilter==="unbranded"&&!has(x,"brand"))return false;
      if(issueFilter==="good"&&x.score<85)return false;
      if(["meta_title","meta_description","description","sku"].includes(issueFilter)&&!has(x,issueFilter))return false;
      return true;
    });
    data=[...data];
    if(sort==="priority")data.sort((a,b)=>a.score-b.score);
    if(sort==="best")data.sort((a,b)=>b.score-a.score);
    if(sort==="newest")data.sort((a,b)=>Number(b.product.id)-Number(a.product.id));
    if(sort==="oldest")data.sort((a,b)=>Number(a.product.id)-Number(b.product.id));
    if(sort==="name")data.sort((a,b)=>String(a.product.name||"").localeCompare(String(b.product.name||"")));
    return data;
  },[audited,search,sourceFilter,categoryFilter,brandFilter,minScore,maxScore,issueFilter,sort]);
  const pages=Math.max(1,Math.ceil(filtered.length/perPage));
  const currentPage=Math.min(page,pages);
  const visible=filtered.slice((currentPage-1)*perPage,currentPage*perPage);
  const reset=()=>{setSearch("");setIssueFilter("all");setSourceFilter("all");setCategoryFilter("all");setBrandFilter("all");setMinScore("");setMaxScore("");setSort("priority");setPage(1);};
  const setIssue=(value)=>{setIssueFilter(value);setExpanded(null);setPage(1);};
  function exportCsv() {
    const rows=[["ID","Product","Visibility","Source","Score","Priority","Missing / Review","Identifier status","Public URL"],
      ...filtered.map(x=>[x.product.id,x.product.name,x.active?"Active":"Hidden",Number(x.product.is_nagnail_official)===1?"Warehouse":"Dropshipping",x.score,x.severity,x.issues.map(y=>y.label).join("; "),x.identifiers,`https://nagnail.lk/product/${x.product.id}`])];
    const blob=new Blob(["\ufeff"+rows.map(row=>row.map(safeCsv).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="nagnail-seo-v4-filtered.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  return <Layout><div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-6 px-4 pb-12 pt-6 sm:px-6 lg:px-10">
    <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
      <div className="flex flex-wrap items-center justify-between gap-5"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.2em] text-indigo-600">● NAGNAIL / SEO INTELLIGENCE</p><h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">SEO Management</h1><p className="mt-2 text-sm text-slate-500">Find content gaps, prioritize product improvements and export your work queue.</p></div><div className="flex flex-wrap gap-2"><button onClick={refresh} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">{loading?"Refreshing…":"↻ Refresh audit"}</button><button onClick={exportCsv} disabled={!filtered.length} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">Export CSV</button></div></div>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><span><b>Internal content audit only.</b> Scores do not measure Google rankings, indexing or Merchant Center approval. GTIN/MPN absence is not penalized.</span><label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-amber-200 bg-white/70 px-3 py-2 font-bold"><input type="checkbox" checked={includeHidden} onChange={e=>{setIncludeHidden(e.target.checked);setPage(1);setExpanded(null);}} className="h-4 w-4 accent-indigo-600"/> Include hidden products</label></div>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error} <button className="ml-2 font-bold underline" onClick={refresh}>Retry</button></div>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <Metric label="Products audited" value={summary.total} detail={includeHidden?"Including hidden":"Active products only"}/>
      <Metric label="Average score" value={`${summary.average}/100`} detail="Content completeness" tone="indigo"/>
      <Metric label="High priority" value={summary.high} detail="Click to review" tone="rose" onClick={()=>setIssue("high")}/>
      <Metric label="Meta gaps" value={summary.metaMissing} detail="Missing title/description" tone="amber" onClick={()=>setIssue("missing_meta")}/>
      <Metric label="Missing images" value={summary.noImage} detail="Primary product photo" tone="rose" onClick={()=>setIssue("missing_image")}/>
      <Metric label="Score ≥ 85" value={summary.healthy} detail="Good documentation" tone="emerald" onClick={()=>setIssue("good")}/>
    </section>
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-slate-900">Most common SEO gaps</h2><span className="text-xs text-slate-500">{summary.total} products in audit</span></div><div className="mt-5 space-y-4">{issueCounts.length?issueCounts.map(issue=><div key={issue.key}><div className="flex justify-between gap-3 text-sm"><span className="min-w-0 text-slate-700">{issue.label}</span><b className="shrink-0 text-slate-900">{issue.count}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${summary.total?issue.count/summary.total*100:0}%`}}/></div></div>):<p className="text-sm text-slate-500">No content gaps detected for this selection.</p>}</div></div>
      <div className="flex flex-col justify-between rounded-2xl bg-slate-950 p-6 text-white shadow-sm"><div><p className="text-xs font-extrabold tracking-widest text-indigo-300">YOUR SEO WORKFLOW</p><h2 className="mt-3 text-xl font-black">Fix important products first.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Start with high-priority items, expand a product to read the specific recommendations and update verified information in the Products Catalog.</p></div><button type="button" onClick={()=>{setIssue("high");document.getElementById("seo-work-queue")?.scrollIntoView({behavior:"smooth",block:"start"});}} className="mt-5 rounded-xl bg-indigo-600 px-4 py-3 text-left text-sm font-bold text-white hover:bg-indigo-500">Review high-priority queue →</button></div>
    </section>
    <section id="seo-work-queue" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black text-slate-900">Product SEO fix queue</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} matching · Showing {visible.length} on this page</p></div><button type="button" onClick={reset} className="text-sm font-bold text-slate-500 hover:text-indigo-600">↺ Clear filters</button></div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search product, SKU or ID" aria-label="Search SEO products" className={`${selectClass} sm:col-span-2`}/><select value={issueFilter} onChange={e=>setIssue(e.target.value)} aria-label="Issue type" className={selectClass}>{ISSUE_OPTIONS.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select><select value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}} aria-label="Sort SEO audit" className={selectClass}><option value="priority">Lowest score first</option><option value="best">Highest score first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select>
          <select value={sourceFilter} onChange={e=>{setSourceFilter(e.target.value);setPage(1);}} aria-label="Product source" className={selectClass}><option value="all">All sources</option><option value="warehouse">NagNail warehouse</option><option value="dropship">Dropshipping</option></select>
          <select value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1);}} aria-label="Category" className={selectClass}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>
          <select value={brandFilter} onChange={e=>{setBrandFilter(e.target.value);setPage(1);}} aria-label="Brand" className={selectClass}><option value="all">All brands</option>{brands.map(b=><option key={b.id} value={String(b.id)}>{b.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input type="number" min="0" max="100" value={minScore} onChange={e=>{setMinScore(e.target.value);setPage(1);}} placeholder="Min score" aria-label="Minimum score" className={selectClass}/><input type="number" min="0" max="100" value={maxScore} onChange={e=>{setMaxScore(e.target.value);setPage(1);}} placeholder="Max score" aria-label="Maximum score" className={selectClass}/></div>
        </div>
      </div>
      <div className="divide-y divide-slate-100">{visible.map(x=><div key={x.product.id} className="min-w-0 px-4 py-4 sm:px-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><p className="line-clamp-2 font-bold text-slate-900">{x.product.name||"Untitled product"}</p><p className="mt-1 text-xs text-slate-500">ID #{x.product.id} · {x.active?"Active":"Hidden"} · {Number(x.product.is_nagnail_official)===1?"Warehouse":"Dropshipping"} · SKU: {x.product.sku||"Missing"}</p></div><div className="flex flex-wrap items-center gap-3 lg:justify-end"><div className="w-24"><p className={`text-sm font-black ${x.score<60?"text-rose-600":x.score<85?"text-amber-600":"text-emerald-600"}`}>{x.score}/100</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${x.score}%`}}/></div></div><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${chip(x.severity)}`}>{x.severity}</span><span className="text-xs text-slate-500">{x.issues.length} issues</span><button type="button" aria-expanded={expanded===x.product.id} onClick={()=>setExpanded(expanded===x.product.id?null:x.product.id)} className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">{expanded===x.product.id?"Hide details":"Review issues"}</button><Link to="/products" className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Open catalog</Link></div></div>
        {expanded===x.product.id&&<div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Recommended actions</p><div className="grid gap-2 md:grid-cols-2">{x.issues.map(issue=><div key={issue.key} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap gap-2"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${chip(issue.priority)}`}>{issue.priority}</span><b className="text-sm text-slate-900">{issue.label}</b></div><p className="mt-2 text-xs leading-5 text-slate-600">{issue.action}</p></div>)}{!x.issues.length&&<span className="text-sm font-semibold text-emerald-700">All current content checks passed.</span>}</div><p className="mt-3 text-xs text-slate-500">Identifiers: {x.identifiers}. <a href={`https://nagnail.lk/product/${encodeURIComponent(x.product.id)}`} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">View public product ↗</a></p></div>}</div>)}
      {!loading&&!visible.length&&<div className="px-6 py-12 text-center text-sm text-slate-500">No matching products. Try changing the filters.</div>}{loading&&<div className="px-6 py-10 text-center text-sm text-slate-500">Refreshing audit…</div>}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4"><span className="text-xs text-slate-500">Page {currentPage} of {pages} · {filtered.length} results</span><div className="flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={currentPage<=1} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold disabled:opacity-40">Previous</button><button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={currentPage>=pages} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold disabled:opacity-40">Next</button></div></div>
    </section>
  </div></Layout>;
}

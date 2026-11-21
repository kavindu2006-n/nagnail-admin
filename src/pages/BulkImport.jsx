import { useState } from "react";
import API from "../api/config";
import Layout from "../components/Layout";

export default function BulkImport() {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,'').toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g,''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || "");
      return obj;
    }).filter(p => p.name);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      setPreview(parseCSV(text).slice(0, 5));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const products = parseCSV(csvText);
    if (!products.length) return setError("No valid products found");
    setImporting(true); setError(""); setResult(null);
    try {
      const res = await API.post("/products/bulk-import", { products });
      if (res.data.success) setResult(res.data);
      else setError(res.data.error);
    } catch(err) { setError(err.response?.data?.error || "Import failed"); }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const csv = `name,price,sale_price,stock_qty,category,description
"Example Product 1",1500,1200,100,Electronics,"Product description here"
"Example Product 2",2500,,50,Fashion,"Another product"`;
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "product-import-template.csv";
    a.click();
  };

  return (
    <Layout>
      <div className="mb-5">
        <h2 className="text-2xl font-black text-gray-800">📤 Bulk Product Import</h2>
        <p className="text-gray-500 text-sm mt-1">Import multiple products at once via CSV file</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
        <h3 className="font-black text-blue-800 mb-3">📋 How to Import</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>1. Download the CSV template below</p>
          <p>2. Fill in your product data (name and price are required)</p>
          <p>3. Upload the CSV file and preview</p>
          <p>4. Click Import to add all products</p>
        </div>
        <button onClick={downloadTemplate}
          className="mt-3 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700">
          📥 Download Template
        </button>
      </div>

      {/* CSV Columns */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <h3 className="font-black text-gray-800 mb-3">Required CSV Columns</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { col:"name", req:true, desc:"Product name" },
            { col:"price", req:true, desc:"Regular price (LKR)" },
            { col:"sale_price", req:false, desc:"Sale price (optional)" },
            { col:"stock_qty", req:false, desc:"Stock quantity" },
            { col:"category", req:false, desc:"Category name or slug" },
            { col:"description", req:false, desc:"Product description" },
          ].map(c => (
            <div key={c.col} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-bold text-[#16a34a] bg-green-50 px-2 py-0.5 rounded">{c.col}</code>
                {c.req && <span className="text-xs text-red-500 font-bold">Required</span>}
              </div>
              <p className="text-xs text-gray-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <h3 className="font-black text-gray-800 mb-4">Upload CSV File</h3>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-8 cursor-pointer hover:border-[#16a34a] hover:bg-green-50 transition-all">
          <span className="text-4xl mb-2">📁</span>
          <span className="text-sm font-bold text-gray-600">Click to upload CSV file</span>
          <span className="text-xs text-gray-400 mt-1">or drag and drop</span>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </label>

        {preview.length > 0 && (
          <div className="mt-4">
            <h4 className="font-bold text-gray-700 text-sm mb-2">Preview (first 5 rows):</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map(h => (
                      <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 border border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 border border-gray-200 text-gray-700 truncate max-w-32">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">Total rows: {parseCSV(csvText).length}</p>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm font-semibold">❌ {error}</div>}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5">
          <p className="font-black text-green-800 text-lg mb-2">✅ Import Complete!</p>
          <p className="text-green-700 text-sm">{result.imported} products imported successfully</p>
          {result.errors?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-orange-600 font-bold">Skipped {result.errors.length} rows:</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs text-orange-500">{e}</p>)}
            </div>
          )}
        </div>
      )}

      {csvText && (
        <button onClick={handleImport} disabled={importing}
          className="w-full bg-[#16a34a] text-white py-3.5 rounded-2xl font-black text-sm hover:bg-[#15803d] disabled:opacity-50">
          {importing ? "⏳ Importing..." : `📤 Import ${parseCSV(csvText).length} Products`}
        </button>
      )}
    </Layout>
  );
}

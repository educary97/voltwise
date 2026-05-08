"use client";
// apps/web/app/page.tsx — Main application page

import { useState } from "react";
import { InvoiceUpload } from "@/components/invoice/InvoiceUpload";
import { OffersDashboard } from "@/components/dashboard/OffersDashboard";
import type { InvoiceData } from "@voltwise/invoice-parser/claude-parser";

type Step = "upload" | "form" | "loading" | "results";

const POWERS = [1.15, 2.3, 3.45, 4.6, 5.75, 6.9, 10.35, 13.8, 17.25, 20.7];
const SUPPLIERS = ["EDP", "Endesa", "Galp", "Goldenergy", "Iberdrola", "Repsol", "Plenitude", "MUON", "Other"];

export default function Home() {
  const [step,         setStep]         = useState<Step>("upload");
  const [extracted,    setExtracted]    = useState<Partial<InvoiceData>>({});
  const [formData,     setFormData]     = useState({ supplier: "", powerKva: 6.9, kwhMonth: "", bill: "", tariff: "simple", peak: "", offpeak: "" });
  const [results,      setResults]      = useState<any>(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingMsg,   setLoadingMsg]   = useState("");

  const handleExtracted = (data: Partial<InvoiceData>) => {
    setExtracted(data);
    setFormData((f) => ({
      ...f,
      supplier: data.supplier ?? f.supplier,
      powerKva: data.powerKva ?? f.powerKva,
      kwhMonth: String(data.kwhMonth ?? f.kwhMonth),
      bill:     String(data.billTotal ?? f.bill),
      tariff:   data.tariffType ?? f.tariff,
      peak:     String(data.peakKwh ?? f.peak),
      offpeak:  String(data.offpeakKwh ?? f.offpeak),
    }));
    setStep("form");
  };

  const handleCompare = async () => {
    const kwh  = parseFloat(formData.kwhMonth);
    const bill = parseFloat(formData.bill);
    if (!kwh || !bill) { alert("Please enter monthly consumption and bill total."); return; }

    setLoading(true);
    setStep("loading");
    const msgs = ["Fetching ERSE data...", "Calculating grid tariffs...", "Ranking all 15 suppliers...", "Generating recommendation..."];
    let mi = 0;
    setLoadingMsg(msgs[0]);
    const iv = setInterval(() => setLoadingMsg(msgs[Math.min(++mi, msgs.length - 1)]), 700);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier:    formData.supplier || undefined,
          powerKva:    formData.powerKva,
          kwhMonth:    kwh,
          currentBill: bill,
          tariffType:  formData.tariff,
          peakKwh:     formData.peak ? parseFloat(formData.peak) : undefined,
          offpeakKwh:  formData.offpeak ? parseFloat(formData.offpeak) : undefined,
        }),
      });
      clearInterval(iv);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults({ ...data, currentMonthlyBill: bill, currentSupplier: formData.supplier });
      setStep("results");
    } catch (e) {
      clearInterval(iv);
      alert("Comparison failed. Please try again.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const stepNum = { upload: 1, form: 2, loading: 3, results: 3 }[step];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-gray-200 mb-6">
        <div className="text-xl font-semibold tracking-tight">Voltwise<span className="text-green-600">.</span></div>
        <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">ERSE official data</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[["1","Invoice"],["2","Review"],["3","Results"]].map(([n,l],i)=>(
          <div key={n} className="flex items-center gap-1.5">
            {i>0 && <div className="w-6 h-px bg-gray-200" />}
            <div className={`flex items-center gap-1.5 text-xs ${stepNum===i+1?"font-medium text-gray-900":stepNum>i+1?"text-green-600":"text-gray-400"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold border
                ${stepNum===i+1?"bg-gray-900 text-white border-gray-900":stepNum>i+1?"bg-green-600 text-white border-green-600":"bg-white text-gray-400 border-gray-200"}`}>{n}</div>
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* Upload screen */}
      {step === "upload" && (
        <div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              How much could you <span className="text-green-600 italic">save</span> on electricity?
            </h1>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Upload your invoice. Claude reads it, we compare every offer in Portugal.
            </p>
          </div>
          <InvoiceUpload onExtracted={handleExtracted} onManual={() => setStep("form")} />
        </div>
      )}

      {/* Form screen */}
      {step === "form" && (
        <div>
          {extracted.summary && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm text-green-700">
              <span className="text-base">✅</span>
              <span><strong>Extracted:</strong> {extracted.summary}</span>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3 space-y-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your current contract</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Current supplier</label>
                <select value={formData.supplier} onChange={e=>setFormData(f=>({...f,supplier:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {SUPPLIERS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Contracted power</label>
                <select value={formData.powerKva} onChange={e=>setFormData(f=>({...f,powerKva:parseFloat(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {POWERS.map(p=><option key={p} value={p}>{p} kVA</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Monthly consumption (kWh)</label>
                <input type="number" value={formData.kwhMonth} onChange={e=>setFormData(f=>({...f,kwhMonth:e.target.value}))} placeholder="e.g. 320" className={`w-full border rounded-lg px-3 py-2 text-sm ${extracted.kwhMonth?"bg-green-50 border-green-300":"border-gray-200"}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Monthly bill total (€)</label>
                <input type="number" value={formData.bill} onChange={e=>setFormData(f=>({...f,bill:e.target.value}))} placeholder="e.g. 78.50" step="0.01" className={`w-full border rounded-lg px-3 py-2 text-sm ${extracted.billTotal?"bg-green-50 border-green-300":"border-gray-200"}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tariff cycle</label>
                <select value={formData.tariff} onChange={e=>setFormData(f=>({...f,tariff:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="simple">Simple (single rate)</option>
                  <option value="bihorario">Bi-hourly (peak / off-peak)</option>
                  <option value="trihorario">Tri-hourly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Postal code (optional)</label>
                <input type="text" placeholder="e.g. 1300" maxLength={7} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Hourly breakdown (optional)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Off-peak (kWh/mo)</label>
                <input type="number" value={formData.offpeak} onChange={e=>setFormData(f=>({...f,offpeak:e.target.value}))} placeholder="e.g. 100" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Peak (kWh/mo)</label>
                <input type="number" value={formData.peak} onChange={e=>setFormData(f=>({...f,peak:e.target.value}))} placeholder="e.g. 220" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <button onClick={handleCompare} className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
            Compare with the market →
          </button>
          <button onClick={()=>setStep("upload")} className="w-full py-2.5 mt-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
            ← Back
          </button>
        </div>
      )}

      {/* Loading screen */}
      {step === "loading" && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-5" />
          <h2 className="text-xl font-medium mb-2">Comparing the market</h2>
          <p className="text-sm text-gray-400">{loadingMsg}</p>
          <div className="w-48 h-1 bg-gray-100 rounded-full mx-auto mt-5 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-pulse" style={{width:"70%"}} />
          </div>
        </div>
      )}

      {/* Results screen */}
      {step === "results" && results && (
        <div>
          <OffersDashboard
            offers={results.offers}
            summary={results.summary}
            recommendation={results.recommendation}
            currentSupplier={results.currentSupplier}
            currentMonthlyBill={parseFloat(results.currentMonthlyBill)}
          />
          <button onClick={()=>{setStep("upload");setResults(null);setExtracted({})}} className="w-full mt-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700">
            ← New comparison
          </button>
        </div>
      )}
    </main>
  );
}

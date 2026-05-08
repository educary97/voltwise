"use client";
import { useState } from "react";

type Step = "upload"|"form"|"loading"|"results";
const POWERS = [1.15,2.3,3.45,4.6,5.75,6.9,10.35,13.8,17.25,20.7];
const SUPPLIERS = ["EDP","Endesa","Galp","Goldenergy","Iberdrola","Repsol","Plenitude","MUON","Other"];
const PC: Record<string,string> = {EDP:"#003c8f",Endesa:"#00a651",Galp:"#e30613",Goldenergy:"#f7a800",Iberdrola:"#3b8a29",Repsol:"#ff6600",Plenitude:"#5c2d91",MUON:"#0ea5e9"};
const EUR = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const EUR2 = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n);

export default function Home() {
  const [step,      setStep]      = useState<Step>("upload");
  const [extracted, setExtracted] = useState<Record<string,unknown>>({});
  const [extractMsg,setExtractMsg]= useState("");
  const [form,      setForm]      = useState({supplier:"",powerKva:6.9,kwhMonth:"",bill:"",tariff:"simple",peak:"",offpeak:""});
  const [results,   setResults]   = useState<any>(null);
  const [loadMsg,   setLoadMsg]   = useState("");
  const [expanded,  setExpanded]  = useState<Set<number>>(new Set());
  const [filter,    setFilter]    = useState("all");

  const toggle = (id:number) => setExpanded(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  async function handleFile(file: File) {
    setStep("loading"); setLoadMsg("Reading your invoice with Claude AI...");
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/extract",{method:"POST",body:fd});
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        setExtracted(d);
        setExtractMsg(d.summary);
        setForm(f=>({...f,
          supplier:  d.supplier  ?? f.supplier,
          powerKva:  d.powerKva  ?? f.powerKva,
          kwhMonth:  d.kwhMonth  ? String(d.kwhMonth)  : f.kwhMonth,
          bill:      d.billTotal ? String(d.billTotal) : f.bill,
          tariff:    d.tariffType ?? f.tariff,
          peak:      d.peakKwh   ? String(d.peakKwh)   : f.peak,
          offpeak:   d.offpeakKwh? String(d.offpeakKwh): f.offpeak,
        }));
      } else {
        setExtractMsg(json.error ?? "Could not read invoice — please enter details manually.");
      }
    } catch { setExtractMsg("Upload failed — please enter details manually."); }
    setStep("form");
  }

  async function handleCompare() {
    const kwh = parseFloat(form.kwhMonth), bill = parseFloat(form.bill);
    if (!kwh||!bill) { alert("Please enter monthly consumption and bill total."); return; }
    setStep("loading");
    const msgs = ["Fetching ERSE data...","Calculating grid tariffs...","Ranking all suppliers...","Generating recommendation..."];
    let mi=0; setLoadMsg(msgs[0]);
    const iv = setInterval(()=>setLoadMsg(msgs[Math.min(++mi,msgs.length-1)]),700);
    try {
      const res = await fetch("/api/compare",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({supplier:form.supplier||undefined,powerKva:form.powerKva,kwhMonth:kwh,currentBill:bill,tariffType:form.tariff,
          peakKwh:form.peak?parseFloat(form.peak):undefined,offpeakKwh:form.offpeak?parseFloat(form.offpeak):undefined})});
      clearInterval(iv);
      const data = await res.json();
      setResults({...data,currentBill:bill,currentSupplier:form.supplier});
      setFilter("all"); setStep("results");
    } catch { clearInterval(iv); alert("Comparison failed. Please try again."); setStep("form"); }
  }

  const stepNum = {upload:1,form:2,loading:step==="loading"&&extractMsg?2:3,results:3}[step] ?? 1;
  const filteredOffers = results?.offers?.filter((o:any)=>filter==="all"||( filter==="green"&&o.green)||(filter==="fixed"&&o.type==="fixed")||(filter==="indexed"&&o.type==="indexed")) ?? [];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-gray-200 mb-6">
        <div className="text-xl font-semibold tracking-tight">Voltwise<span className="text-green-600">.</span></div>
        <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">ERSE official data</span>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[["1","Invoice"],["2","Review"],["3","Results"]].map(([n,l],i)=>(
          <div key={n} className="flex items-center gap-1.5">
            {i>0&&<div className="w-6 h-px bg-gray-200"/>}
            <div className={`flex items-center gap-1.5 text-xs ${stepNum===i+1?"font-medium text-gray-900":stepNum>i+1?"text-green-600":"text-gray-400"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold border ${stepNum===i+1?"bg-gray-900 text-white border-gray-900":stepNum>i+1?"bg-green-600 text-white border-green-600":"bg-white text-gray-400 border-gray-200"}`}>{n}</div>
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* Upload */}
      {step==="upload"&&(
        <div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">How much could you <span className="text-green-600 italic">save</span> on electricity?</h1>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Upload your invoice or enter your details. We compare every offer in Portugal using ERSE official data.</p>
          </div>
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer bg-gray-50 hover:border-green-400 hover:bg-green-50 transition-colors mb-3">
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            <div className="text-4xl mb-3">📄</div>
            <p className="text-base font-medium text-gray-800 mb-1">Drop your electricity invoice here</p>
            <p className="text-sm text-gray-400">PDF, PNG, JPG or screenshot — up to 10 MB</p>
          </label>
          <div className="flex gap-2 justify-center flex-wrap mb-2">
            {["PDF","PNG","JPG","Screenshot"].map(f=><span key={f} className="text-xs bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md text-gray-500">{f}</span>)}
          </div>
          <button onClick={()=>setStep("form")} className="w-full text-center py-2.5 text-sm text-green-600 font-medium hover:text-green-700 underline underline-offset-2">Enter details manually instead →</button>
        </div>
      )}

      {/* Form */}
      {step==="form"&&(
        <div>
          {extractMsg&&<div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm text-green-700"><span>✅</span><span><strong>Extracted:</strong> {extractMsg}</span></div>}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Your current contract</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Current supplier</label>
                <select value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>{SUPPLIERS.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Contracted power</label>
                <select value={form.powerKva} onChange={e=>setForm(f=>({...f,powerKva:parseFloat(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {POWERS.map(p=><option key={p} value={p}>{p} kVA</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Monthly consumption (kWh)</label>
                <input type="number" value={form.kwhMonth} onChange={e=>setForm(f=>({...f,kwhMonth:e.target.value}))} placeholder="e.g. 320" className={`w-full border rounded-lg px-3 py-2 text-sm ${(extracted as any).kwhMonth?"bg-green-50 border-green-300":"border-gray-200"}`}/></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Monthly bill total (€)</label>
                <input type="number" value={form.bill} onChange={e=>setForm(f=>({...f,bill:e.target.value}))} placeholder="e.g. 78.50" step="0.01" className={`w-full border rounded-lg px-3 py-2 text-sm ${(extracted as any).billTotal?"bg-green-50 border-green-300":"border-gray-200"}`}/></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Tariff cycle</label>
                <select value={form.tariff} onChange={e=>setForm(f=>({...f,tariff:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="simple">Simple (single rate)</option>
                  <option value="bihorario">Bi-hourly (peak / off-peak)</option>
                  <option value="trihorario">Tri-hourly</option></select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Postal code (optional)</label>
                <input type="text" placeholder="e.g. 1300" maxLength={7} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/></div>
            </div>
          </div>
          <button onClick={handleCompare} className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">Compare with the market →</button>
          <button onClick={()=>setStep("upload")} className="w-full py-2.5 mt-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:text-gray-700">← Back</button>
        </div>
      )}

      {/* Loading */}
      {step==="loading"&&(
        <div className="text-center py-16">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-5"/>
          <h2 className="text-xl font-medium mb-2">Working on it</h2>
          <p className="text-sm text-gray-400">{loadMsg}</p>
        </div>
      )}

      {/* Results */}
      {step==="results"&&results&&(
        <div>
          <div className="mb-5">
            <h2 className="text-2xl font-semibold mb-1">Comparison results</h2>
            <p className="text-sm text-gray-400">Based on ERSE data · {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current / year</div>
              <div className="text-2xl font-semibold">{EUR(results.summary.currentAnnualCost)}</div>
              <div className="text-xs text-gray-400 mt-1">{results.currentSupplier||"Current supplier"}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Best offer / year</div>
              <div className="text-2xl font-semibold text-green-700">{EUR(results.summary.bestAnnualCost)}</div>
              <div className="text-xs text-gray-400 mt-1">{results.summary.bestProvider}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Potential saving</div>
              <div className="text-2xl font-semibold">{EUR(results.summary.potentialSaving)}</div>
              <div className="text-xs text-gray-400 mt-1">{results.summary.savingPercent.toFixed(0)}% reduction</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm text-amber-800 mb-4">
            <div><strong>Current plan:</strong> {results.currentSupplier||"Current supplier"} · {EUR2(results.currentBill)}/month · {EUR(results.currentBill*12)}/year</div>
            <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">current</span>
          </div>

          {results.recommendation&&(
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Claude&apos;s recommendation</div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700">{results.recommendation}</div>
            </div>
          )}

          <div className="flex gap-2 items-center flex-wrap mb-3">
            <span className="text-xs text-gray-400">Filter:</span>
            {["all","green","fixed","indexed"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filter===f?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                {f==="green"?"🌱 Green energy":f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredOffers.map((o:any,i:number)=>{
              const isBest=i===0&&o.annualSaving>0;
              const isCur=results.currentSupplier?.toLowerCase()===o.provider.toLowerCase();
              const bg=PC[o.provider]??"#374151";
              const isOpen=expanded.has(o.id);
              return (
                <div key={o.id} onClick={()=>toggle(o.id)} className={`border rounded-xl p-4 cursor-pointer transition-colors grid grid-cols-[1fr_auto] gap-3 items-start ${isBest?"border-2 border-green-500 bg-green-50":isCur?"border-2 border-amber-400 bg-amber-50":"border-gray-200 bg-white hover:border-gray-300"}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{background:bg}}>{o.provider.slice(0,3).toUpperCase()}</div>
                      <div>
                        <div className="text-sm font-medium leading-tight">
                          {isBest&&<span className="inline text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-semibold mr-1.5">Best deal</span>}
                          {isCur&&<span className="inline text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-semibold mr-1.5">current</span>}
                          {o.name}
                        </div>
                        <div className="text-xs text-gray-400">{o.provider}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {o.tags.map((t:string)=><span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.green&&t.includes("renewable")?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{t}</span>)}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.type==="indexed"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700"}`}>{o.type==="indexed"?"indexed price":"fixed price"}</span>
                    </div>
                    {isOpen&&(
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[["Energy price",`${(o.pricePerKwh*100).toFixed(3)} c€/kWh`],["Fixed charge",o.fixedMonthly>0?`${EUR2(o.fixedMonthly)}/mo`:"included"],["1st yr discount",o.firstYearDiscount>0?`${(o.firstYearDiscount*100).toFixed(0)}%`:"—"],["Price type",o.type==="indexed"?"OMIE indexed":"Fixed"],["Green energy",o.green?"Yes (100%)":"No"],["Data","ERSE official"]].map(([l,v])=>(
                            <div key={l} className="bg-gray-50 rounded-lg p-2"><div className="text-[10px] text-gray-400 mb-0.5">{l}</div><div className="text-xs font-medium">{v}</div></div>
                          ))}
                        </div>
                        <button onClick={e=>{e.stopPropagation();window.open(o.contactUrl,"_blank")}} className="text-xs bg-gray-900 text-white px-3 py-2 rounded-lg font-medium hover:bg-gray-700">Switch to {o.provider} →</button>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-semibold">{EUR2(o.monthlyEstimate)}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                    <div className="text-xs text-gray-400 mt-0.5">{EUR(o.annualEstimate)}/year</div>
                    {o.annualSaving!==0&&<div className={`text-xs font-semibold mt-1 ${o.annualSaving>0?"text-green-600":"text-red-600"}`}>{o.annualSaving>0?"+":""}{EUR(o.annualSaving)}/yr</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center pt-4 border-t border-gray-100 mt-4 leading-relaxed">
            Data from the <a href="https://simuladorprecos.erse.pt/eletricidade/" target="_blank" rel="noopener" className="text-green-600">ERSE official simulator</a>. Estimates based on supplier-declared data. Review contract terms before switching.
          </p>
          <button onClick={()=>{setStep("upload");setResults(null);setExtracted({});setExtractMsg("");}} className="w-full mt-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700">← New comparison</button>
        </div>
      )}
    </main>
  );
}

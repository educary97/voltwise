"use client";
import { useState, useEffect } from "react";

type Step = "upload"|"form"|"loading"|"results";
const POWERS = [1.15,2.3,3.45,4.6,5.75,6.9,10.35,13.8,17.25,20.7];
const SUPPLIERS = ["EDP","Endesa","Galp","Goldenergy","Iberdrola","Repsol","Plenitude","MUON","Other"];
const PC: Record<string,string> = {EDP:"#003c8f",Endesa:"#00a651",Galp:"#e30613",Goldenergy:"#f7a800",Iberdrola:"#3b8a29",Repsol:"#ff6600",Plenitude:"#5c2d91",MUON:"#0ea5e9"};
const EUR = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const EUR2 = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n);

const loadingMessages = [
  "Checking every supplier in Portugal…",
  "Crunching the ERSE numbers…",
  "Finding your best deal…",
  "Almost there…",
];

export default function Home() {
  const [step,       setStep]       = useState<Step>("upload");
  const [extracted,  setExtracted]  = useState<Record<string,unknown>>({});
  const [extractMsg, setExtractMsg] = useState("");
  const [form,       setForm]       = useState({supplier:"",powerKva:6.9,kwhMonth:"",bill:"",tariff:"simple",peak:"",offpeak:""});
  const [results,    setResults]    = useState<any>(null);
  const [loadMsg,    setLoadMsg]    = useState("");
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());
  const [filter,     setFilter]     = useState("all");
  const [visible,    setVisible]    = useState(false);
  const [dragOver,   setDragOver]   = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const toggle = (id:number) => setExpanded(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  async function handleFile(file: File) {
    setStep("loading"); setLoadMsg(loadingMessages[0]);
    let mi = 0;
    const iv = setInterval(() => setLoadMsg(loadingMessages[Math.min(++mi, loadingMessages.length-1)]), 900);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/extract",{method:"POST",body:fd});
      const json = await res.json();
      clearInterval(iv);
      if (json.success) {
        const d = json.data;
        setExtracted(d);
        setExtractMsg(d.summary);
        setForm(f=>({...f,
          supplier:  d.supplier   ?? f.supplier,
          powerKva:  d.powerKva   ?? f.powerKva,
          kwhMonth:  d.kwhMonth   ? String(d.kwhMonth)   : f.kwhMonth,
          bill:      d.billTotal  ? String(d.billTotal)  : f.bill,
          tariff:    d.tariffType ?? f.tariff,
          peak:      d.peakKwh    ? String(d.peakKwh)    : f.peak,
          offpeak:   d.offpeakKwh ? String(d.offpeakKwh) : f.offpeak,
        }));
      } else {
        setExtractMsg("Couldn't read the invoice — please fill in your details below.");
      }
    } catch { clearInterval(iv); setExtractMsg("Upload failed — please enter details manually."); }
    setStep("form");
  }

  async function handleCompare() {
    const kwh = parseFloat(form.kwhMonth), bill = parseFloat(form.bill);
    if (!kwh||!bill) { alert("Please enter monthly consumption and bill total."); return; }
    setStep("loading");
    let mi=0; setLoadMsg(loadingMessages[0]);
    const iv = setInterval(()=>setLoadMsg(loadingMessages[Math.min(++mi,loadingMessages.length-1)]),900);
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

  const stepNum = step==="upload"?1:step==="form"?2:step==="loading"?2:3;
  const filteredOffers = results?.offers?.filter((o:any)=>filter==="all"||(filter==="green"&&o.green)||(filter==="fixed"&&o.type==="fixed")||(filter==="indexed"&&o.type==="indexed")) ?? [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #FAFAF7;
          color: #1a1a1a;
          min-height: 100vh;
        }

        .page { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .page.visible { opacity: 1; transform: translateY(0); }

        .wrap { max-width: 640px; margin: 0 auto; padding: 0 20px 80px; }

        /* Header */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 28px 0 24px;
          border-bottom: 1px solid #e8e6df;
          margin-bottom: 32px;
        }
        .logo {
          font-family: 'Lora', serif;
          font-size: 22px; font-weight: 600; letter-spacing: -0.02em; color: #1a1a1a;
        }
        .logo span { color: #6abf69; }
        .badge {
          font-size: 11px; font-weight: 500; color: #6abf69;
          background: #f0faf0; border: 1px solid #c8e6c8;
          padding: 4px 12px; border-radius: 20px; letter-spacing: 0.02em;
        }

        /* Steps */
        .steps { display: flex; align-items: center; gap: 8px; margin-bottom: 36px; }
        .step-item { display: flex; align-items: center; gap: 8px; }
        .step-dot {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600; flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .step-dot.done { background: #6abf69; color: white; }
        .step-dot.active { background: #1a1a1a; color: white; }
        .step-dot.inactive { background: #eeede8; color: #aaa; }
        .step-label { font-size: 13px; font-weight: 500; }
        .step-label.active { color: #1a1a1a; }
        .step-label.inactive { color: #bbb; }
        .step-line { flex: 1; height: 1px; background: #e8e6df; margin: 0 4px; }

        /* Upload zone */
        .upload-hero { text-align: center; padding: 12px 0 32px; }
        .upload-title {
          font-family: 'Lora', serif;
          font-size: 36px; font-weight: 600; line-height: 1.15;
          letter-spacing: -0.03em; color: #1a1a1a; margin-bottom: 12px;
        }
        .upload-title em { color: #6abf69; font-style: italic; }
        .upload-sub { font-size: 15px; color: #888; line-height: 1.6; max-width: 380px; margin: 0 auto 32px; }

        .drop-zone {
          border: 2px dashed #d5d2c8;
          border-radius: 20px;
          padding: 52px 32px;
          text-align: center;
          cursor: pointer;
          background: white;
          transition: all 0.2s ease;
          margin-bottom: 12px;
        }
        .drop-zone:hover, .drop-zone.drag { border-color: #6abf69; background: #f7fdf7; }
        .drop-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: #f0faf0; border: 1px solid #c8e6c8;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; margin: 0 auto 16px;
        }
        .drop-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }
        .drop-sub { font-size: 13px; color: #aaa; }

        .manual-link {
          display: block; text-align: center; padding: 12px;
          font-size: 14px; color: #6abf69; font-weight: 500;
          cursor: pointer; text-decoration: none;
          transition: color 0.2s;
        }
        .manual-link:hover { color: #4a9f4a; }

        /* Form */
        .extract-banner {
          background: #f0faf0; border: 1px solid #c8e6c8;
          border-radius: 14px; padding: 14px 18px;
          display: flex; gap: 10px; align-items: flex-start;
          margin-bottom: 20px; font-size: 14px; color: #3a7a3a;
          line-height: 1.5;
        }

        .card {
          background: white; border: 1px solid #e8e6df;
          border-radius: 20px; padding: 24px; margin-bottom: 14px;
        }
        .card-title {
          font-size: 11px; font-weight: 600; color: #bbb;
          text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px;
        }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-field label {
          display: block; font-size: 12px; font-weight: 500;
          color: #888; margin-bottom: 6px;
        }
        .form-field input, .form-field select {
          width: 100%; border: 1.5px solid #e8e6df;
          border-radius: 10px; padding: 10px 14px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          color: #1a1a1a; background: white;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none; appearance: none;
        }
        .form-field input:focus, .form-field select:focus {
          border-color: #6abf69; box-shadow: 0 0 0 3px rgba(106,191,105,0.12);
        }
        .form-field input.prefilled { background: #f7fdf7; border-color: #c8e6c8; }

        .btn-primary {
          width: 100%; padding: 16px 24px;
          background: #1a1a1a; color: white;
          border: none; border-radius: 14px;
          font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.2s ease;
          letter-spacing: -0.01em;
        }
        .btn-primary:hover { background: #333; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
        .btn-primary:active { transform: translateY(0); }

        .btn-ghost {
          width: 100%; padding: 13px 24px;
          background: white; color: #888;
          border: 1.5px solid #e8e6df; border-radius: 14px;
          font-size: 14px; font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.2s;
          margin-top: 10px;
        }
        .btn-ghost:hover { border-color: #ccc; color: #555; }

        /* Loading */
        .loading-wrap { text-align: center; padding: 80px 0; }
        .spinner {
          width: 44px; height: 44px;
          border: 2.5px solid #e8e6df;
          border-top-color: #6abf69;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 24px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-title {
          font-family: 'Lora', serif;
          font-size: 22px; font-weight: 600; margin-bottom: 8px;
        }
        .loading-sub { font-size: 14px; color: #aaa; }

        /* Results */
        .results-header { margin-bottom: 28px; }
        .results-title {
          font-family: 'Lora', serif;
          font-size: 28px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 4px;
        }
        .results-sub { font-size: 13px; color: #aaa; }

        .savings-hero {
          background: #1a1a1a; border-radius: 24px;
          padding: 32px; margin-bottom: 16px;
          position: relative; overflow: hidden;
        }
        .savings-hero::before {
          content: ''; position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(106,191,105,0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        .savings-label { font-size: 12px; font-weight: 500; color: #666; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 8px; }
        .savings-amount {
          font-family: 'Lora', serif;
          font-size: 56px; font-weight: 600; color: #6abf69;
          letter-spacing: -0.03em; line-height: 1; margin-bottom: 6px;
        }
        .savings-per { font-size: 14px; color: #555; margin-bottom: 20px; }
        .savings-per span { color: #6abf69; font-weight: 600; }
        .savings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .savings-stat {
          background: rgba(255,255,255,0.05); border-radius: 12px;
          padding: 14px 16px;
        }
        .savings-stat-label { font-size: 11px; color: #555; margin-bottom: 4px; }
        .savings-stat-value { font-size: 18px; font-weight: 600; color: white; }
        .savings-stat-sub { font-size: 11px; color: #444; margin-top: 2px; }

        .current-plan {
          background: #fffbf0; border: 1px solid #f0e6c0;
          border-radius: 14px; padding: 16px 20px;
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px; font-size: 14px;
        }
        .current-plan-info { color: #8a7a50; }
        .current-plan-badge {
          font-size: 10px; font-weight: 700; color: #8a6a20;
          background: #f5d97a; padding: 3px 10px; border-radius: 20px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }

        .recommendation {
          background: white; border: 1px solid #e8e6df;
          border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;
        }
        .recommendation-label {
          font-size: 11px; font-weight: 600; color: #bbb;
          text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;
        }
        .recommendation p { font-size: 14px; color: #555; line-height: 1.7; }

        .filters { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
        .filter-label { font-size: 12px; color: #bbb; font-weight: 500; }
        .filter-btn {
          padding: 6px 14px; border-radius: 20px; font-size: 13px;
          font-weight: 500; border: 1.5px solid #e8e6df;
          background: white; color: #888; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s ease;
        }
        .filter-btn:hover { border-color: #bbb; color: #555; }
        .filter-btn.active { background: #1a1a1a; color: white; border-color: #1a1a1a; }

        /* Offer cards */
        .offers { display: flex; flex-direction: column; gap: 10px; }
        .offer-card {
          background: white; border: 1.5px solid #e8e6df;
          border-radius: 18px; padding: 18px 20px;
          cursor: pointer; transition: all 0.2s ease;
        }
        .offer-card:hover { border-color: #ccc; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .offer-card.best {
          border-color: #6abf69; border-width: 2px;
          background: linear-gradient(135deg, #f7fdf7 0%, white 100%);
          box-shadow: 0 2px 20px rgba(106,191,105,0.12);
        }
        .offer-card.current { border-color: #f5d97a; border-width: 2px; background: #fffdf5; }

        .offer-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .offer-left { display: flex; gap: 12px; align-items: flex-start; flex: 1; }
        .offer-logo {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; color: white; flex-shrink: 0;
        }
        .offer-name { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 2px; line-height: 1.3; }
        .offer-provider { font-size: 12px; color: #aaa; }
        .offer-right { text-align: right; flex-shrink: 0; }
        .offer-price { font-family: 'Lora', serif; font-size: 22px; font-weight: 600; color: #1a1a1a; }
        .offer-price span { font-size: 12px; font-weight: 400; color: #aaa; font-family: 'DM Sans', sans-serif; }
        .offer-year { font-size: 12px; color: #aaa; margin-top: 2px; }
        .offer-saving { font-size: 13px; font-weight: 600; color: #6abf69; margin-top: 3px; }
        .offer-saving.neg { color: #e05a5a; }

        .offer-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .tag {
          font-size: 11px; padding: 3px 10px; border-radius: 20px;
          font-weight: 500;
        }
        .tag.green { background: #f0faf0; color: #4a9f4a; }
        .tag.fixed { background: #eef4ff; color: #4a6abf; }
        .tag.indexed { background: #fff8ee; color: #bf8a4a; }
        .tag.best-tag { background: #6abf69; color: white; }
        .tag.current-tag { background: #f5d97a; color: #8a6a20; }
        .tag.generic { background: #f5f5f2; color: #888; }

        .offer-details {
          margin-top: 16px; padding-top: 16px;
          border-top: 1px solid #f0ede6;
        }
        .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
        .detail-cell {
          background: #fafaf7; border-radius: 10px; padding: 10px 12px;
        }
        .detail-label { font-size: 10px; color: #bbb; margin-bottom: 3px; }
        .detail-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }

        .switch-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; background: #1a1a1a; color: white;
          border: none; border-radius: 10px; font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: all 0.2s;
        }
        .switch-btn:hover { background: #333; }

        .footer-note {
          font-size: 12px; color: #bbb; text-align: center;
          padding-top: 24px; border-top: 1px solid #f0ede6;
          margin-top: 24px; line-height: 1.7;
        }
        .footer-note a { color: #6abf69; text-decoration: none; }

        @media (max-width: 480px) {
          .upload-title { font-size: 28px; }
          .savings-amount { font-size: 44px; }
          .form-grid { grid-template-columns: 1fr; }
          .savings-grid { grid-template-columns: 1fr; }
          .details-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className={`page ${visible ? "visible" : ""}`}>
        <div className="wrap">

          {/* Header */}
          <div className="header">
            <div className="logo">Voltwise<span>.</span></div>
            <div className="badge">ERSE official data</div>
          </div>

          {/* Steps */}
          <div className="steps">
            {[["1","Invoice"],["2","Review"],["3","Results"]].map(([n,l],i) => (
              <div key={n} className="step-item" style={{flex: i<2 ? "1" : "0"}}>
                <div className={`step-dot ${stepNum>i+1?"done":stepNum===i+1?"active":"inactive"}`}>
                  {stepNum>i+1 ? "✓" : n}
                </div>
                <span className={`step-label ${stepNum===i+1?"active":"inactive"}`}>{l}</span>
                {i < 2 && <div className="step-line" />}
              </div>
            ))}
          </div>

          {/* UPLOAD */}
          {step==="upload" && (
            <div>
              <div className="upload-hero">
                <h1 className="upload-title">Find out how much you could <em>save</em> on electricity</h1>
                <p className="upload-sub">Upload your bill and we compare every offer in Portugal using official ERSE data — in seconds.</p>
              </div>

              <label
                className={`drop-zone ${dragOver ? "drag" : ""}`}
                onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
              >
                <input type="file" style={{display:"none"}} accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
                <div className="drop-icon">📄</div>
                <div className="drop-title">Drop your electricity bill here</div>
                <div className="drop-sub">PDF, PNG or JPG · up to 10 MB</div>
              </label>

              <a className="manual-link" onClick={()=>setStep("form")}>Enter details manually instead →</a>
            </div>
          )}

          {/* FORM */}
          {step==="form" && (
            <div>
              {extractMsg && (
                <div className="extract-banner">
                  <span>✅</span>
                  <span><strong>Invoice read.</strong> {extractMsg} Check the details below and adjust if needed.</span>
                </div>
              )}

              <div className="card">
                <div className="card-title">Your current contract</div>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Current supplier</label>
                    <select value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))}>
                      <option value="">Select…</option>
                      {SUPPLIERS.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Contracted power</label>
                    <select value={form.powerKva} onChange={e=>setForm(f=>({...f,powerKva:parseFloat(e.target.value)}))}>
                      {POWERS.map(p=><option key={p} value={p}>{p} kVA</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Monthly consumption (kWh)</label>
                    <input type="number" value={form.kwhMonth} onChange={e=>setForm(f=>({...f,kwhMonth:e.target.value}))}
                      placeholder="e.g. 320" className={(extracted as any).kwhMonth ? "prefilled" : ""}/>
                  </div>
                  <div className="form-field">
                    <label>Monthly bill total (€)</label>
                    <input type="number" value={form.bill} onChange={e=>setForm(f=>({...f,bill:e.target.value}))}
                      placeholder="e.g. 78.50" step="0.01" className={(extracted as any).billTotal ? "prefilled" : ""}/>
                  </div>
                  <div className="form-field">
                    <label>Tariff cycle</label>
                    <select value={form.tariff} onChange={e=>setForm(f=>({...f,tariff:e.target.value}))}>
                      <option value="simple">Simple (single rate)</option>
                      <option value="bihorario">Bi-hourly (peak / off-peak)</option>
                      <option value="trihorario">Tri-hourly</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Postal code (optional)</label>
                    <input type="text" placeholder="e.g. 1300" maxLength={7}/>
                  </div>
                </div>
              </div>

              <button className="btn-primary" onClick={handleCompare}>Compare with the market →</button>
              <button className="btn-ghost" onClick={()=>setStep("upload")}>← Back</button>
            </div>
          )}

          {/* LOADING */}
          {step==="loading" && (
            <div className="loading-wrap">
              <div className="spinner"/>
              <h2 className="loading-title">On it</h2>
              <p className="loading-sub">{loadMsg}</p>
            </div>
          )}

          {/* RESULTS */}
          {step==="results" && results && (
            <div>
              <div className="results-header">
                <h2 className="results-title">Here's what we found</h2>
                <p className="results-sub">Based on ERSE data · {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</p>
              </div>

              {/* Savings hero */}
              <div className="savings-hero">
                <div className="savings-label">Potential annual saving</div>
                <div className="savings-amount">{EUR(results.summary.potentialSaving)}</div>
                <div className="savings-per">by switching to <span>{results.summary.bestProvider}</span></div>
                <div className="savings-grid">
                  <div className="savings-stat">
                    <div className="savings-stat-label">You pay now</div>
                    <div className="savings-stat-value">{EUR(results.summary.currentAnnualCost)}/yr</div>
                    <div className="savings-stat-sub">{results.currentSupplier || "Current supplier"}</div>
                  </div>
                  <div className="savings-stat">
                    <div className="savings-stat-label">Best offer</div>
                    <div className="savings-stat-value">{EUR(results.summary.bestAnnualCost)}/yr</div>
                    <div className="savings-stat-sub">{results.summary.bestProvider} · {results.summary.savingPercent.toFixed(0)}% less</div>
                  </div>
                </div>
              </div>

              {/* Current plan pill */}
              <div className="current-plan">
                <div className="current-plan-info">
                  <strong>{results.currentSupplier || "Current supplier"}</strong> · {EUR2(results.currentBill)}/month · {EUR(results.currentBill*12)}/year
                </div>
                <div className="current-plan-badge">Current</div>
              </div>

              {/* Recommendation */}
              {results.recommendation && (
                <div className="recommendation">
                  <div className="recommendation-label">Recommendation</div>
                  <p>{results.recommendation}</p>
                </div>
              )}

              {/* Filters */}
              <div className="filters">
                <span className="filter-label">Show:</span>
                {[["all","All offers"],["green","🌱 Green"],["fixed","Fixed price"],["indexed","Indexed"]].map(([f,l])=>(
                  <button key={f} className={`filter-btn ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>{l}</button>
                ))}
              </div>

              {/* Offer cards */}
              <div className="offers">
                {filteredOffers.map((o:any,i:number)=>{
                  const isBest = i===0 && o.annualSaving>0;
                  const isCurrent = results.currentSupplier?.toLowerCase()===o.provider.toLowerCase();
                  const isOpen = expanded.has(o.id);
                  const bg = PC[o.provider] ?? "#374151";

                  return (
                    <div key={o.id} className={`offer-card ${isBest?"best":isCurrent?"current":""}`} onClick={()=>toggle(o.id)}>
                      <div className="offer-top">
                        <div className="offer-left">
                          <div className="offer-logo" style={{background:bg}}>{o.provider.slice(0,3).toUpperCase()}</div>
                          <div>
                            <div className="offer-name">{o.name}</div>
                            <div className="offer-provider">{o.provider}</div>
                          </div>
                        </div>
                        <div className="offer-right">
                          <div className="offer-price">{EUR2(o.monthlyEstimate)}<span>/mo</span></div>
                          <div className="offer-year">{EUR(o.annualEstimate)}/year</div>
                          {o.annualSaving!==0 && (
                            <div className={`offer-saving ${o.annualSaving<0?"neg":""}`}>
                              {o.annualSaving>0?`Save ${EUR(o.annualSaving)}/yr`:`+${EUR(Math.abs(o.annualSaving))}/yr more`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="offer-tags">
                        {isBest && <span className="tag best-tag">Best deal</span>}
                        {isCurrent && <span className="tag current-tag">Your plan</span>}
                        {o.green && <span className="tag green">🌱 100% renewable</span>}
                        <span className={`tag ${o.type==="indexed"?"indexed":"fixed"}`}>{o.type==="indexed"?"Indexed price":"Fixed price"}</span>
                        {o.tags.filter((t:string)=>!t.includes("renewable")).map((t:string)=>(
                          <span key={t} className="tag generic">{t}</span>
                        ))}
                      </div>

                      {isOpen && (
                        <div className="offer-details">
                          <div className="details-grid">
                            {[
                              ["Energy price", `${(o.pricePerKwh*100).toFixed(3)} c€/kWh`],
                              ["Fixed charge", o.fixedMonthly>0 ? `${EUR2(o.fixedMonthly)}/mo` : "Included"],
                              ["1st yr discount", o.firstYearDiscount>0 ? `${(o.firstYearDiscount*100).toFixed(0)}%` : "—"],
                              ["Price type", o.type==="indexed" ? "OMIE indexed" : "Fixed"],
                              ["Green energy", o.green ? "Yes (100%)" : "No"],
                              ["Source", "ERSE official"],
                            ].map(([l,v])=>(
                              <div key={l} className="detail-cell">
                                <div className="detail-label">{l}</div>
                                <div className="detail-value">{v}</div>
                              </div>
                            ))}
                          </div>
                          <button className="switch-btn" onClick={e=>{e.stopPropagation();window.open(o.contactUrl,"_blank")}}>
                            Switch to {o.provider} →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="footer-note">
                Prices from the <a href="https://simuladorprecos.erse.pt/eletricidade/" target="_blank" rel="noopener">ERSE official simulator</a>.<br/>
                Estimates based on supplier-declared data. Review contract terms before switching.
              </div>

              <button className="btn-ghost" style={{marginTop:"16px"}} onClick={()=>{setStep("upload");setResults(null);setExtracted({});setExtractMsg("");}}>
                ← Start a new comparison
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
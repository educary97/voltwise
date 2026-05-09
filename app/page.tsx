"use client";
import { useState, useEffect } from "react";

type Step = "upload"|"form"|"loading"|"results";
const POWERS = [1.15,2.3,3.45,4.6,5.75,6.9,10.35,13.8,17.25,20.7];
const SUPPLIERS = ["EDP","Endesa","Galp","Goldenergy","Iberdrola","Repsol","Plenitude","MUON","Other"];
const PC: Record<string,string> = {EDP:"#003c8f",Endesa:"#00a651",Galp:"#e30613",Goldenergy:"#f7a800",Iberdrola:"#3b8a29",Repsol:"#ff6600",Plenitude:"#5c2d91",MUON:"#0ea5e9"};
const EUR = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const EUR2 = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n);
const loadingMessages = ["Checking every supplier in Portugal…","Crunching the ERSE numbers…","Finding your best deal…","Almost there…"];

const s = {
  body: { fontFamily:"'DM Sans', 'Helvetica Neue', Arial, sans-serif", background:"#FAFAF7", minHeight:"100vh", color:"#1a1a1a" } as React.CSSProperties,
  wrap: { maxWidth:640, margin:"0 auto", padding:"0 20px 80px" } as React.CSSProperties,
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"28px 0 24px", borderBottom:"1px solid #e8e6df", marginBottom:"32px" } as React.CSSProperties,
  logo: { fontSize:22, fontWeight:700, letterSpacing:"-0.02em", color:"#1a1a1a" } as React.CSSProperties,
  logoSpan: { color:"#6abf69" } as React.CSSProperties,
  badge: { fontSize:11, fontWeight:500, color:"#6abf69", background:"#f0faf0", border:"1px solid #c8e6c8", padding:"4px 12px", borderRadius:20 } as React.CSSProperties,
  steps: { display:"flex", alignItems:"center", marginBottom:36 } as React.CSSProperties,
  stepLine: { flex:1, height:1, background:"#e8e6df", margin:"0 8px" } as React.CSSProperties,
  stepItem: { display:"flex", alignItems:"center", gap:8 } as React.CSSProperties,
  uploadHero: { textAlign:"center" as const, padding:"12px 0 32px" } as React.CSSProperties,
  title: { fontFamily:"Georgia, 'Times New Roman', serif", fontSize:34, fontWeight:700, lineHeight:1.2, letterSpacing:"-0.02em", color:"#1a1a1a", marginBottom:12 } as React.CSSProperties,
  titleGreen: { color:"#6abf69", fontStyle:"italic" } as React.CSSProperties,
  sub: { fontSize:15, color:"#888", lineHeight:1.6, maxWidth:380, margin:"0 auto 32px" } as React.CSSProperties,
  dropZone: (hover:boolean): React.CSSProperties => ({ border:`2px dashed ${hover?"#6abf69":"#d5d2c8"}`, borderRadius:20, padding:"52px 32px", textAlign:"center", cursor:"pointer", background:hover?"#f7fdf7":"white", transition:"all 0.2s ease", marginBottom:12, display:"block" }),
  dropIcon: { width:56, height:56, borderRadius:16, background:"#f0faf0", border:"1px solid #c8e6c8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 16px" } as React.CSSProperties,
  dropTitle: { fontSize:16, fontWeight:600, color:"#1a1a1a", marginBottom:6 } as React.CSSProperties,
  dropSub: { fontSize:13, color:"#aaa" } as React.CSSProperties,
  manualLink: { display:"block", textAlign:"center" as const, padding:12, fontSize:14, color:"#6abf69", fontWeight:500, cursor:"pointer" } as React.CSSProperties,
  extractBanner: { background:"#f0faf0", border:"1px solid #c8e6c8", borderRadius:14, padding:"14px 18px", display:"flex", gap:10, alignItems:"flex-start", marginBottom:20, fontSize:14, color:"#3a7a3a", lineHeight:1.5 } as React.CSSProperties,
  card: { background:"white", border:"1px solid #e8e6df", borderRadius:20, padding:24, marginBottom:14 } as React.CSSProperties,
  cardTitle: { fontSize:11, fontWeight:600, color:"#bbb", textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:20 } as React.CSSProperties,
  formGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 } as React.CSSProperties,
  label: { display:"block", fontSize:12, fontWeight:500, color:"#888", marginBottom:6 } as React.CSSProperties,
  input: (prefilled?:boolean): React.CSSProperties => ({ width:"100%", border:`1.5px solid ${prefilled?"#c8e6c8":"#e8e6df"}`, borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"inherit", color:"#1a1a1a", background:prefilled?"#f7fdf7":"white", outline:"none", boxSizing:"border-box" }),
  btnPrimary: { width:"100%", padding:"16px 24px", background:"#1a1a1a", color:"white", border:"none", borderRadius:14, fontSize:15, fontWeight:600, fontFamily:"inherit", cursor:"pointer" } as React.CSSProperties,
  btnGhost: { width:"100%", padding:"13px 24px", background:"white", color:"#888", border:"1.5px solid #e8e6df", borderRadius:14, fontSize:14, fontWeight:500, fontFamily:"inherit", cursor:"pointer", marginTop:10 } as React.CSSProperties,
  loadingWrap: { textAlign:"center" as const, padding:"80px 0" } as React.CSSProperties,
  loadingTitle: { fontFamily:"Georgia, serif", fontSize:22, fontWeight:600, marginBottom:8 } as React.CSSProperties,
  loadingSub: { fontSize:14, color:"#aaa" } as React.CSSProperties,
  savingsHero: { background:"#1a1a1a", borderRadius:24, padding:32, marginBottom:16 } as React.CSSProperties,
  savingsLabel: { fontSize:12, fontWeight:500, color:"#666", letterSpacing:"0.05em", textTransform:"uppercase" as const, marginBottom:8 } as React.CSSProperties,
  savingsAmount: { fontFamily:"Georgia, serif", fontSize:52, fontWeight:700, color:"#6abf69", letterSpacing:"-0.03em", lineHeight:1, marginBottom:6 } as React.CSSProperties,
  savingsPer: { fontSize:14, color:"#555", marginBottom:20 } as React.CSSProperties,
  savingsGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } as React.CSSProperties,
  savingsStat: { background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"14px 16px" } as React.CSSProperties,
  savingsStatLabel: { fontSize:11, color:"#555", marginBottom:4 } as React.CSSProperties,
  savingsStatValue: { fontSize:18, fontWeight:600, color:"white" } as React.CSSProperties,
  savingsStatSub: { fontSize:11, color:"#444", marginTop:2 } as React.CSSProperties,
  currentPlan: { background:"#fffbf0", border:"1px solid #f0e6c0", borderRadius:14, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 } as React.CSSProperties,
  currentPlanBadge: { fontSize:10, fontWeight:700, color:"#8a6a20", background:"#f5d97a", padding:"3px 10px", borderRadius:20, textTransform:"uppercase" as const, letterSpacing:"0.05em", whiteSpace:"nowrap" as const } as React.CSSProperties,
  recommendation: { background:"white", border:"1px solid #e8e6df", borderRadius:14, padding:"18px 20px", marginBottom:20 } as React.CSSProperties,
  recLabel: { fontSize:11, fontWeight:600, color:"#bbb", textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:10 } as React.CSSProperties,
  filters: { display:"flex", gap:8, alignItems:"center", marginBottom:16, flexWrap:"wrap" as const } as React.CSSProperties,
  offerCard: (type:"best"|"current"|"normal"): React.CSSProperties => ({
    background: type==="best"?"linear-gradient(135deg,#f7fdf7 0%,white 100%)":type==="current"?"#fffdf5":"white",
    border:`${type==="normal"?"1.5px":"2px"} solid ${type==="best"?"#6abf69":type==="current"?"#f5d97a":"#e8e6df"}`,
    borderRadius:18, padding:"18px 20px", cursor:"pointer", marginBottom:10,
    boxShadow:type==="best"?"0 2px 20px rgba(106,191,105,0.12)":"none",
  }),
  offerTop: { display:"flex", justifyContent:"space-between", alignItems:"flex-start" } as React.CSSProperties,
  offerLeft: { display:"flex", gap:12, alignItems:"flex-start", flex:1 } as React.CSSProperties,
  offerLogo: (bg:string): React.CSSProperties => ({ width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"white", flexShrink:0, background:bg }),
  offerName: { fontSize:14, fontWeight:600, color:"#1a1a1a", marginBottom:2, lineHeight:1.3 } as React.CSSProperties,
  offerProvider: { fontSize:12, color:"#aaa" } as React.CSSProperties,
  offerRight: { textAlign:"right" as const, flexShrink:0 } as React.CSSProperties,
  offerPrice: { fontFamily:"Georgia, serif", fontSize:22, fontWeight:600, color:"#1a1a1a" } as React.CSSProperties,
  offerYear: { fontSize:12, color:"#aaa", marginTop:2 } as React.CSSProperties,
  offerTags: { display:"flex", gap:6, flexWrap:"wrap" as const, marginTop:10 } as React.CSSProperties,
  tag: (type:string): React.CSSProperties => ({
    fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500,
    background:type==="best"?"#6abf69":type==="current"?"#f5d97a":type==="green"?"#f0faf0":type==="indexed"?"#fff8ee":"#eef4ff",
    color:type==="best"?"white":type==="current"?"#8a6a20":type==="green"?"#4a9f4a":type==="indexed"?"#bf8a4a":"#4a6abf",
  }),
  detailsSection: { marginTop:16, paddingTop:16, borderTop:"1px solid #f0ede6" } as React.CSSProperties,
  detailsGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 } as React.CSSProperties,
  detailCell: { background:"#fafaf7", borderRadius:10, padding:"10px 12px" } as React.CSSProperties,
  detailLabel: { fontSize:10, color:"#bbb", marginBottom:3 } as React.CSSProperties,
  detailValue: { fontSize:13, fontWeight:600, color:"#1a1a1a" } as React.CSSProperties,
  switchBtn: { display:"inline-flex", alignItems:"center", gap:6, padding:"10px 18px", background:"#1a1a1a", color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:600, fontFamily:"inherit", cursor:"pointer" } as React.CSSProperties,
  footerNote: { fontSize:12, color:"#bbb", textAlign:"center" as const, paddingTop:24, borderTop:"1px solid #f0ede6", marginTop:24, lineHeight:1.7 } as React.CSSProperties,
};

function StepDot({n,state}:{n:string,state:"done"|"active"|"inactive"}) {
  const bg=state==="done"?"#6abf69":state==="active"?"#1a1a1a":"#eeede8";
  const color=state==="inactive"?"#aaa":"white";
  return <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,background:bg,color,flexShrink:0}}>{state==="done"?"✓":n}</div>;
}

function FilterBtn({label,active,onClick}:{label:string,active:boolean,onClick:()=>void}) {
  return <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:500,border:`1.5px solid ${active?"#1a1a1a":"#e8e6df"}`,background:active?"#1a1a1a":"white",color:active?"white":"#888",cursor:"pointer",fontFamily:"inherit"}}>{label}</button>;
}

export default function Home() {
  const [step,       setStep]       = useState<Step>("upload");
  const [extracted,  setExtracted]  = useState<Record<string,unknown>>({});
  const [extractMsg, setExtractMsg] = useState("");
  const [form,       setForm]       = useState({supplier:"",powerKva:6.9,kwhMonth:"",bill:"",tariff:"simple",peak:"",offpeak:""});
  const [results,    setResults]    = useState<any>(null);
  const [loadMsg,    setLoadMsg]    = useState("");
  const [expanded,   setExpanded]   = useState<Set<number>>(new Set());
  const [filter,     setFilter]     = useState("all");
  const [dragOver,   setDragOver]   = useState(false);
  const [visible,    setVisible]    = useState(false);

  useEffect(()=>{setTimeout(()=>setVisible(true),50);},[]);

  const toggle=(id:number)=>setExpanded(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  async function handleFile(file:File) {
    setStep("loading");setLoadMsg(loadingMessages[0]);
    let mi=0;const iv=setInterval(()=>setLoadMsg(loadingMessages[Math.min(++mi,3)]),900);
    const fd=new FormData();fd.append("file",file);
    try {
      const res=await fetch("/api/extract",{method:"POST",body:fd});
      const json=await res.json();clearInterval(iv);
      if(json.success){const d=json.data;setExtracted(d);setExtractMsg(d.summary);setForm(f=>({...f,supplier:d.supplier??f.supplier,powerKva:d.powerKva??f.powerKva,kwhMonth:d.kwhMonth?String(d.kwhMonth):f.kwhMonth,bill:d.billTotal?String(d.billTotal):f.bill,tariff:d.tariffType??f.tariff,peak:d.peakKwh?String(d.peakKwh):f.peak,offpeak:d.offpeakKwh?String(d.offpeakKwh):f.offpeak}));}
      else{setExtractMsg("Couldn't read the invoice — please fill in your details below.");}
    } catch{clearInterval(iv);setExtractMsg("Upload failed — please enter details manually.");}
    setStep("form");
  }

  async function handleCompare() {
    const kwh=parseFloat(form.kwhMonth),bill=parseFloat(form.bill);
    if(!kwh||!bill){alert("Please enter monthly consumption and bill total.");return;}
    setStep("loading");let mi=0;setLoadMsg(loadingMessages[0]);
    const iv=setInterval(()=>setLoadMsg(loadingMessages[Math.min(++mi,3)]),900);
    try {
      const res=await fetch("/api/compare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({supplier:form.supplier||undefined,powerKva:form.powerKva,kwhMonth:kwh,currentBill:bill,tariffType:form.tariff,peakKwh:form.peak?parseFloat(form.peak):undefined,offpeakKwh:form.offpeak?parseFloat(form.offpeak):undefined})});
      clearInterval(iv);const data=await res.json();
      setResults({...data,currentBill:bill,currentSupplier:form.supplier});setFilter("all");setStep("results");
    } catch{clearInterval(iv);alert("Comparison failed. Please try again.");setStep("form");}
  }

  const stepNum=step==="upload"?1:step==="form"?2:step==="loading"?2:3;
  const filteredOffers=results?.offers?.filter((o:any)=>filter==="all"||(filter==="green"&&o.green)||(filter==="fixed"&&o.type==="fixed")||(filter==="indexed"&&o.type==="indexed"))??[];

  return (
    <div style={{...s.body,opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",transition:"opacity 0.5s ease, transform 0.5s ease"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        select{-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23aaa' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px !important;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .vw-spinner{width:44px;height:44px;border:2.5px solid #e8e6df;border-top-color:#6abf69;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 24px;}
      `}</style>

      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>Voltwise<span style={s.logoSpan}>.</span></div>
          <div style={s.badge}>ERSE official data</div>
        </div>

        {/* Steps */}
        <div style={s.steps}>
          {[["1","Invoice"],["2","Review"],["3","Results"]].map(([n,l],i)=>(
            <div key={n} style={{display:"flex",alignItems:"center",flex:i<2?1:0}}>
              <div style={s.stepItem}>
                <StepDot n={n} state={stepNum>i+1?"done":stepNum===i+1?"active":"inactive"}/>
                <span style={{fontSize:13,fontWeight:500,color:stepNum===i+1?"#1a1a1a":"#bbb"}}>{l}</span>
              </div>
              {i<2&&<div style={s.stepLine}/>}
            </div>
          ))}
        </div>

        {/* UPLOAD */}
        {step==="upload"&&(
          <div>
            <div style={s.uploadHero}>
              <h1 style={s.title}>Find out how much you could <span style={s.titleGreen}>save</span> on electricity</h1>
              <p style={s.sub}>Upload your bill and we compare every offer in Portugal using official ERSE data — in seconds.</p>
            </div>
            <label style={s.dropZone(dragOver)}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}>
              <input type="file" style={{display:"none"}} accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
              <div style={s.dropIcon}>📄</div>
              <div style={s.dropTitle}>Drop your electricity bill here</div>
              <div style={s.dropSub}>PDF, PNG or JPG · up to 10 MB</div>
            </label>
            <a style={s.manualLink} onClick={()=>setStep("form")}>Enter details manually instead →</a>
          </div>
        )}

        {/* FORM */}
        {step==="form"&&(
          <div>
            {extractMsg&&(
              <div style={s.extractBanner}>
                <span>✅</span>
                <span><strong>Invoice read.</strong> {extractMsg} Check the details below.</span>
              </div>
            )}
            <div style={s.card}>
              <div style={s.cardTitle}>Your current contract</div>
              <div style={s.formGrid}>
                <div><label style={s.label}>Current supplier</label>
                  <select style={s.input()} value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))}>
                    <option value="">Select…</option>{SUPPLIERS.map(sup=><option key={sup}>{sup}</option>)}
                  </select></div>
                <div><label style={s.label}>Contracted power</label>
                  <select style={s.input()} value={form.powerKva} onChange={e=>setForm(f=>({...f,powerKva:parseFloat(e.target.value)}))}>
                    {POWERS.map(p=><option key={p} value={p}>{p} kVA</option>)}
                  </select></div>
                <div><label style={s.label}>Monthly consumption (kWh)</label>
                  <input style={s.input(!!(extracted as any).kwhMonth)} type="number" value={form.kwhMonth} onChange={e=>setForm(f=>({...f,kwhMonth:e.target.value}))} placeholder="e.g. 320"/></div>
                <div><label style={s.label}>Monthly bill total (€)</label>
                  <input style={s.input(!!(extracted as any).billTotal)} type="number" value={form.bill} onChange={e=>setForm(f=>({...f,bill:e.target.value}))} placeholder="e.g. 78.50" step="0.01"/></div>
                <div><label style={s.label}>Tariff cycle</label>
                  <select style={s.input()} value={form.tariff} onChange={e=>setForm(f=>({...f,tariff:e.target.value}))}>
                    <option value="simple">Simple (single rate)</option>
                    <option value="bihorario">Bi-hourly (peak / off-peak)</option>
                    <option value="trihorario">Tri-hourly</option>
                  </select></div>
                <div><label style={s.label}>Postal code (optional)</label>
                  <input style={s.input()} type="text" placeholder="e.g. 1300" maxLength={7}/></div>
              </div>
            </div>
            <button style={s.btnPrimary} onClick={handleCompare}>Compare with the market →</button>
            <button style={s.btnGhost} onClick={()=>setStep("upload")}>← Back</button>
          </div>
        )}

        {/* LOADING */}
        {step==="loading"&&(
          <div style={s.loadingWrap}>
            <div className="vw-spinner"/>
            <h2 style={s.loadingTitle}>On it</h2>
            <p style={s.loadingSub}>{loadMsg}</p>
          </div>
        )}

        {/* RESULTS */}
        {step==="results"&&results&&(
          <div>
            <div style={{marginBottom:28}}>
              <h2 style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:700,letterSpacing:"-0.02em",marginBottom:4}}>Here&apos;s what we found</h2>
              <p style={{fontSize:13,color:"#aaa"}}>Based on ERSE data · {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</p>
            </div>

            <div style={s.savingsHero}>
              <div style={s.savingsLabel}>Potential annual saving</div>
              <div style={s.savingsAmount}>{EUR(results.summary.potentialSaving)}</div>
              <div style={s.savingsPer}>by switching to <span style={{color:"#6abf69",fontWeight:600}}>{results.summary.bestProvider}</span></div>
              <div style={s.savingsGrid}>
                <div style={s.savingsStat}>
                  <div style={s.savingsStatLabel}>You pay now</div>
                  <div style={s.savingsStatValue}>{EUR(results.summary.currentAnnualCost)}/yr</div>
                  <div style={s.savingsStatSub}>{results.currentSupplier||"Current supplier"}</div>
                </div>
                <div style={s.savingsStat}>
                  <div style={s.savingsStatLabel}>Best offer</div>
                  <div style={s.savingsStatValue}>{EUR(results.summary.bestAnnualCost)}/yr</div>
                  <div style={s.savingsStatSub}>{results.summary.bestProvider} · {results.summary.savingPercent.toFixed(0)}% less</div>
                </div>
              </div>
            </div>

            <div style={s.currentPlan}>
              <div style={{fontSize:14,color:"#8a7a50"}}><strong>{results.currentSupplier||"Current supplier"}</strong> · {EUR2(results.currentBill)}/month · {EUR(results.currentBill*12)}/year</div>
              <div style={s.currentPlanBadge}>Current</div>
            </div>

            {results.recommendation&&(
              <div style={s.recommendation}>
                <div style={s.recLabel}>Recommendation</div>
                <p style={{fontSize:14,color:"#555",lineHeight:1.7}}>{results.recommendation}</p>
              </div>
            )}

            <div style={s.filters}>
              <span style={{fontSize:12,color:"#bbb",fontWeight:500}}>Show:</span>
              {[["all","All offers"],["green","🌱 Green"],["fixed","Fixed price"],["indexed","Indexed"]].map(([f,l])=>(
                <FilterBtn key={f} label={l} active={filter===f} onClick={()=>setFilter(f)}/>
              ))}
            </div>

            <div>
              {filteredOffers.map((o:any,i:number)=>{
                const isBest=i===0&&o.annualSaving>0;
                const isCurrent=results.currentSupplier?.toLowerCase()===o.provider.toLowerCase();
                const isOpen=expanded.has(o.id);
                const bg=PC[o.provider]??"#374151";
                const cardType=isBest?"best":isCurrent?"current":"normal";
                return (
                  <div key={o.id} style={s.offerCard(cardType)} onClick={()=>toggle(o.id)}>
                    <div style={s.offerTop}>
                      <div style={s.offerLeft}>
                        <div style={s.offerLogo(bg)}>{o.provider.slice(0,3).toUpperCase()}</div>
                        <div>
                          <div style={s.offerName}>{o.name}</div>
                          <div style={s.offerProvider}>{o.provider}</div>
                        </div>
                      </div>
                      <div style={s.offerRight}>
                        <div style={s.offerPrice}>{EUR2(o.monthlyEstimate)}<span style={{fontSize:12,fontWeight:400,color:"#aaa",fontFamily:"inherit"}}>/mo</span></div>
                        <div style={s.offerYear}>{EUR(o.annualEstimate)}/year</div>
                        {o.annualSaving!==0&&<div style={{fontSize:13,fontWeight:600,marginTop:3,color:o.annualSaving>0?"#6abf69":"#e05a5a"}}>{o.annualSaving>0?`Save ${EUR(o.annualSaving)}/yr`:`+${EUR(Math.abs(o.annualSaving))}/yr`}</div>}
                      </div>
                    </div>
                    <div style={s.offerTags}>
                      {isBest&&<span style={s.tag("best")}>Best deal</span>}
                      {isCurrent&&<span style={s.tag("current")}>Your plan</span>}
                      {o.green&&<span style={s.tag("green")}>🌱 Renewable</span>}
                      <span style={s.tag(o.type==="indexed"?"indexed":"fixed")}>{o.type==="indexed"?"Indexed":"Fixed price"}</span>
                    </div>
                    {isOpen&&(
                      <div style={s.detailsSection}>
                        <div style={s.detailsGrid}>
                          {[["Energy price",`${(o.pricePerKwh*100).toFixed(3)} c€/kWh`],["Fixed charge",o.fixedMonthly>0?`${EUR2(o.fixedMonthly)}/mo`:"Included"],["1st yr discount",o.firstYearDiscount>0?`${(o.firstYearDiscount*100).toFixed(0)}%`:"—"],["Price type",o.type==="indexed"?"OMIE indexed":"Fixed"],["Green energy",o.green?"Yes (100%)":"No"],["Source","ERSE official"]].map(([l,v])=>(
                            <div key={l} style={s.detailCell}>
                              <div style={s.detailLabel}>{l}</div>
                              <div style={s.detailValue}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <button style={s.switchBtn} onClick={e=>{e.stopPropagation();window.open(o.contactUrl,"_blank")}}>Switch to {o.provider} →</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={s.footerNote}>
              Prices from the <a href="https://simuladorprecos.erse.pt/eletricidade/" target="_blank" rel="noopener" style={{color:"#6abf69"}}>ERSE official simulator</a>.<br/>
              Estimates based on supplier-declared data. Review contract terms before switching.
            </div>
            <button style={{...s.btnGhost,marginTop:16}} onClick={()=>{setStep("upload");setResults(null);setExtracted({});setExtractMsg("");}}>← Start a new comparison</button>
          </div>
        )}
      </div>
    </div>
  );
}

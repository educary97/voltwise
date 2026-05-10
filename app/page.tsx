"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Step = "upload"|"form"|"loading"|"results";
const POWERS = [1.15,2.3,3.45,4.6,5.75,6.9,10.35,13.8,17.25,20.7];
const SUPPLIERS = ["EDP","Endesa","Galp","Goldenergy","Iberdrola","Repsol","Plenitude","MUON","Other"];
const PC: Record<string,string> = {EDP:"#003c8f",Endesa:"#00a651",Galp:"#e30613",Goldenergy:"#f7a800",Iberdrola:"#3b8a29",Repsol:"#ff6600",Plenitude:"#5c2d91",MUON:"#0ea5e9"};
const EUR  = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const EUR2 = (n:number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n);
const EUR4 = (n:number) => n.toFixed(4);
const loadingMessages = ["Checking every supplier in Portugal…","Crunching the 2026 ERSE tariffs…","Finding your best deal…","Almost there…"];

interface MonthData { month: string; kwh: string; bill: string; }

const s = {
  body:             { fontFamily:"'DM Sans','Helvetica Neue',Arial,sans-serif", background:"#FAFAF7", minHeight:"100vh", color:"#1a1a1a" } as React.CSSProperties,
  wrap:             { maxWidth:640, margin:"0 auto", padding:"0 20px 80px" } as React.CSSProperties,
  header:           { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"28px 0 24px", borderBottom:"1px solid #e8e6df", marginBottom:"32px" } as React.CSSProperties,
  logo:             { fontSize:22, fontWeight:700, letterSpacing:"-0.02em", color:"#1a1a1a" } as React.CSSProperties,
  logoSpan:         { color:"#6abf69" } as React.CSSProperties,
  badge:            { fontSize:11, fontWeight:500, color:"#6abf69", background:"#f0faf0", border:"1px solid #c8e6c8", padding:"4px 12px", borderRadius:20 } as React.CSSProperties,
  steps:            { display:"flex", alignItems:"center", marginBottom:36 } as React.CSSProperties,
  stepLine:         { flex:1, height:1, background:"#e8e6df", margin:"0 8px" } as React.CSSProperties,
  stepItem:         { display:"flex", alignItems:"center", gap:8 } as React.CSSProperties,
  uploadHero:       { textAlign:"center" as const, padding:"12px 0 28px" } as React.CSSProperties,
  title:            { fontFamily:"Georgia,'Times New Roman',serif", fontSize:34, fontWeight:700, lineHeight:1.2, letterSpacing:"-0.02em", color:"#1a1a1a", marginBottom:12 } as React.CSSProperties,
  titleGreen:       { color:"#6abf69", fontStyle:"italic" } as React.CSSProperties,
  sub:              { fontSize:15, color:"#888", lineHeight:1.6, maxWidth:380, margin:"0 auto 28px" } as React.CSSProperties,
  dropZone:         (hover:boolean,hasFiles:boolean): React.CSSProperties => ({ border:`2px dashed ${hover?"#6abf69":hasFiles?"#6abf69":"#d5d2c8"}`, borderRadius:20, padding:"40px 32px", textAlign:"center", cursor:"pointer", background:hover?"#f7fdf7":hasFiles?"#f7fdf7":"white", transition:"all 0.2s ease", marginBottom:12, display:"block" }),
  dropIcon:         { width:52, height:52, borderRadius:14, background:"#f0faf0", border:"1px solid #c8e6c8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 14px" } as React.CSSProperties,
  dropTitle:        { fontSize:16, fontWeight:600, color:"#1a1a1a", marginBottom:6 } as React.CSSProperties,
  dropSub:          { fontSize:13, color:"#aaa" } as React.CSSProperties,
  fileList:         { display:"flex", flexDirection:"column" as const, gap:6, marginTop:14 } as React.CSSProperties,
  fileItem:         { display:"flex", alignItems:"center", justifyContent:"space-between", background:"white", border:"1px solid #c8e6c8", borderRadius:10, padding:"8px 14px", fontSize:13 } as React.CSSProperties,
  manualLink:       { display:"block", textAlign:"center" as const, padding:12, fontSize:14, color:"#6abf69", fontWeight:500, cursor:"pointer" } as React.CSSProperties,
  agentLink:        { display:"block", textAlign:"center" as const, padding:"6px", fontSize:13, color:"#bbb", cursor:"pointer" } as React.CSSProperties,
  extractBanner:    { background:"#f0faf0", border:"1px solid #c8e6c8", borderRadius:14, padding:"14px 18px", display:"flex", gap:10, alignItems:"flex-start", marginBottom:20, fontSize:14, color:"#3a7a3a", lineHeight:1.5 } as React.CSSProperties,
  userBanner:       { background:"#1a1a1a", borderRadius:16, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 } as React.CSSProperties,
  card:             { background:"white", border:"1px solid #e8e6df", borderRadius:20, padding:24, marginBottom:14 } as React.CSSProperties,
  cardTitle:        { fontSize:11, fontWeight:600, color:"#bbb", textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:20 } as React.CSSProperties,
  formGrid:         { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 } as React.CSSProperties,
  label:            { display:"block", fontSize:12, fontWeight:500, color:"#888", marginBottom:6 } as React.CSSProperties,
  input:            (prefilled?:boolean): React.CSSProperties => ({ width:"100%", border:`1.5px solid ${prefilled?"#c8e6c8":"#e8e6df"}`, borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"inherit", color:"#1a1a1a", background:prefilled?"#f7fdf7":"white", outline:"none", boxSizing:"border-box" }),
  btnPrimary:       { width:"100%", padding:"16px 24px", background:"#1a1a1a", color:"white", border:"none", borderRadius:14, fontSize:15, fontWeight:600, fontFamily:"inherit", cursor:"pointer" } as React.CSSProperties,
  btnGhost:         { width:"100%", padding:"13px 24px", background:"white", color:"#888", border:"1.5px solid #e8e6df", borderRadius:14, fontSize:14, fontWeight:500, fontFamily:"inherit", cursor:"pointer", marginTop:10 } as React.CSSProperties,
  btnSmall:         { padding:"6px 14px", background:"white", color:"#888", border:"1.5px solid #e8e6df", borderRadius:8, fontSize:12, fontWeight:500, fontFamily:"inherit", cursor:"pointer" } as React.CSSProperties,
  expandToggle:     { display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#6abf69", fontWeight:500, cursor:"pointer", padding:"10px 0 4px", background:"none", border:"none", fontFamily:"inherit" } as React.CSSProperties,
  loadingWrap:      { textAlign:"center" as const, padding:"80px 0" } as React.CSSProperties,
  loadingTitle:     { fontFamily:"Georgia,serif", fontSize:22, fontWeight:600, marginBottom:8 } as React.CSSProperties,
  loadingSub:       { fontSize:14, color:"#aaa" } as React.CSSProperties,
  savingsHero:      { background:"#1a1a1a", borderRadius:24, padding:32, marginBottom:16 } as React.CSSProperties,
  savingsLabel:     { fontSize:12, fontWeight:500, color:"#666", letterSpacing:"0.05em", textTransform:"uppercase" as const, marginBottom:8 } as React.CSSProperties,
  savingsAmount:    { fontFamily:"Georgia,serif", fontSize:52, fontWeight:700, color:"#6abf69", letterSpacing:"-0.03em", lineHeight:1, marginBottom:6 } as React.CSSProperties,
  savingsPer:       { fontSize:14, color:"#555", marginBottom:20 } as React.CSSProperties,
  savingsGrid:      { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } as React.CSSProperties,
  savingsStat:      { background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"14px 16px" } as React.CSSProperties,
  savingsStatLabel: { fontSize:11, color:"#555", marginBottom:4 } as React.CSSProperties,
  savingsStatValue: { fontSize:18, fontWeight:600, color:"white" } as React.CSSProperties,
  savingsStatSub:   { fontSize:11, color:"#444", marginTop:2 } as React.CSSProperties,
  currentPlan:      { background:"#fffbf0", border:"1px solid #f0e6c0", borderRadius:14, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 } as React.CSSProperties,
  currentPlanBadge: { fontSize:10, fontWeight:700, color:"#8a6a20", background:"#f5d97a", padding:"3px 10px", borderRadius:20, textTransform:"uppercase" as const, letterSpacing:"0.05em", whiteSpace:"nowrap" as const } as React.CSSProperties,
  recommendation:   { background:"white", border:"1px solid #e8e6df", borderRadius:14, padding:"18px 20px", marginBottom:20 } as React.CSSProperties,
  recLabel:         { fontSize:11, fontWeight:600, color:"#bbb", textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:10 } as React.CSSProperties,
  sliderCard:       { background:"white", border:"1px solid #e8e6df", borderRadius:16, padding:"18px 20px", marginBottom:20 } as React.CSSProperties,
  filters:          { display:"flex", gap:8, alignItems:"center", marginBottom:16, flexWrap:"wrap" as const } as React.CSSProperties,
  offerCard:        (type:"best"|"current"|"normal"): React.CSSProperties => ({
    background: type==="best"?"linear-gradient(135deg,#f7fdf7 0%,white 100%)":type==="current"?"#fffdf5":"white",
    border:`${type==="normal"?"1.5px":"2px"} solid ${type==="best"?"#6abf69":type==="current"?"#f5d97a":"#e8e6df"}`,
    borderRadius:18, padding:"18px 20px", cursor:"pointer", marginBottom:10,
    boxShadow:type==="best"?"0 2px 20px rgba(106,191,105,0.12)":"none",
  }),
  offerTop:         { display:"flex", justifyContent:"space-between", alignItems:"flex-start" } as React.CSSProperties,
  offerLeft:        { display:"flex", gap:12, alignItems:"flex-start", flex:1 } as React.CSSProperties,
  offerLogo:        (bg:string): React.CSSProperties => ({ width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"white", flexShrink:0, background:bg }),
  offerName:        { fontSize:14, fontWeight:600, color:"#1a1a1a", marginBottom:2, lineHeight:1.3 } as React.CSSProperties,
  offerProvider:    { fontSize:12, color:"#aaa" } as React.CSSProperties,
  offerRight:       { textAlign:"right" as const, flexShrink:0 } as React.CSSProperties,
  offerPrice:       { fontFamily:"Georgia,serif", fontSize:22, fontWeight:600, color:"#1a1a1a" } as React.CSSProperties,
  offerYear:        { fontSize:12, color:"#aaa", marginTop:2 } as React.CSSProperties,
  offerTags:        { display:"flex", gap:6, flexWrap:"wrap" as const, marginTop:10 } as React.CSSProperties,
  tag:              (type:string): React.CSSProperties => ({
    fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500,
    background:type==="best"?"#6abf69":type==="current"?"#f5d97a":type==="green"?"#f0faf0":type==="indexed"?"#fff8ee":"#eef4ff",
    color:type==="best"?"white":type==="current"?"#8a6a20":type==="green"?"#4a9f4a":type==="indexed"?"#bf8a4a":"#4a6abf",
  }),
  detailsSection:   { marginTop:16, paddingTop:16, borderTop:"1px solid #f0ede6" } as React.CSSProperties,
  detailsGrid:      { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 } as React.CSSProperties,
  detailCell:       { background:"#fafaf7", borderRadius:10, padding:"10px 12px" } as React.CSSProperties,
  detailLabel:      { fontSize:10, color:"#bbb", marginBottom:3 } as React.CSSProperties,
  detailValue:      { fontSize:13, fontWeight:600, color:"#1a1a1a" } as React.CSSProperties,
  breakdownBar:     { marginTop:12, marginBottom:14 } as React.CSSProperties,
  switchBtn:        { display:"inline-flex", alignItems:"center", gap:6, padding:"10px 18px", background:"#1a1a1a", color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:600, fontFamily:"inherit", cursor:"pointer" } as React.CSSProperties,
  footerNote:       { fontSize:12, color:"#bbb", textAlign:"center" as const, paddingTop:24, borderTop:"1px solid #f0ede6", marginTop:24, lineHeight:1.7 } as React.CSSProperties,
  monthRow:         { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10, alignItems:"end" } as React.CSSProperties,
};

function StepDot({n,state}:{n:string,state:"done"|"active"|"inactive"}) {
  const bg=state==="done"?"#6abf69":state==="active"?"#1a1a1a":"#eeede8";
  return <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,background:bg,color:state==="inactive"?"#aaa":"white",flexShrink:0}}>{state==="done"?"✓":n}</div>;
}

function FilterBtn({label,active,onClick}:{label:string,active:boolean,onClick:()=>void}) {
  return <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:500,border:`1.5px solid ${active?"#1a1a1a":"#e8e6df"}`,background:active?"#1a1a1a":"white",color:active?"white":"#888",cursor:"pointer",fontFamily:"inherit"}}>{label}</button>;
}

function BreakdownBar({fixed,variable,taxes}:{fixed:number,variable:number,taxes:number}) {
  const total = fixed + variable + taxes;
  const fp = (fixed/total*100).toFixed(0);
  const vp = (variable/total*100).toFixed(0);
  const tp = (taxes/total*100).toFixed(0);
  return (
    <div style={s.breakdownBar}>
      <div style={{display:"flex",height:6,borderRadius:6,overflow:"hidden",gap:2,marginBottom:6}}>
        <div style={{width:`${fp}%`,background:"#6abf69",borderRadius:"6px 0 0 6px"}}/>
        <div style={{width:`${vp}%`,background:"#4a9f4a"}}/>
        <div style={{width:`${tp}%`,background:"#aaa",borderRadius:"0 6px 6px 0"}}/>
      </div>
      <div style={{display:"flex",gap:12,fontSize:10,color:"#888"}}>
        <span>🟢 Fixed {fp}% ({EUR2(fixed)})</span>
        <span>🌿 Energy {vp}% ({EUR2(variable)})</span>
        <span>⬜ Taxes {tp}% ({EUR2(taxes)})</span>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step,          setStep]          = useState<Step>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extracted,     setExtracted]     = useState<Record<string,unknown>>({});
  const [extractMsg,    setExtractMsg]    = useState("");
  const [months,        setMonths]        = useState<MonthData[]>([
    {month:"Month 1",kwh:"",bill:""},
    {month:"Month 2",kwh:"",bill:""},
    {month:"Month 3",kwh:"",bill:""},
  ]);
  const [form,          setForm]          = useState({
    supplier:"", powerKva:6.9, tariff:"simple",
  });
  const [showComponents, setShowComponents] = useState(false);
  const [components,    setComponents]    = useState({ pricePerKwh:"", fixedMonthly:"" });
  const [consumFactor,  setConsumFactor]  = useState(1.0);
  const [results,       setResults]       = useState<any>(null);
  const [loadMsg,       setLoadMsg]       = useState("");
  const [expanded,      setExpanded]      = useState<Set<number>>(new Set());
  const [filter,        setFilter]        = useState("all");
  const [dragOver,      setDragOver]      = useState(false);
  const [visible,       setVisible]       = useState(false);
  const [userName,      setUserName]      = useState<string|null>(null);
  const [userPrefilled, setUserPrefilled] = useState(false);

  useEffect(()=>{
    setTimeout(()=>setVisible(true),50);
    const email = localStorage.getItem("voltwise_user_email");
    if(email){
      fetch(`/api/user?email=${encodeURIComponent(email)}`)
        .then(r=>r.json())
        .then(data=>{
          if(data.found){
            setUserName(data.name?.split(" ")[0]??null);
            setForm(f=>({...f,supplier:data.currentSupplier??f.supplier,powerKva:data.powerKva??f.powerKva}));
            setMonths(m=>{
              const updated=[...m];
              if(data.monthlyKwh) updated[0]={...updated[0],kwh:String(data.monthlyKwh)};
              if(data.monthlyCost) updated[0]={...updated[0],bill:String(data.monthlyCost)};
              return updated;
            });
            setUserPrefilled(true);
          }
        }).catch(()=>{});
    }
  },[]);

  const toggle=(id:number)=>setExpanded(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  // Average non-empty months
  function getAverages() {
    const filled = months.filter(m=>m.kwh&&m.bill);
    if(!filled.length) return {kwhMonth:0, currentBill:0};
    const kwhMonth   = filled.reduce((s,m)=>s+parseFloat(m.kwh),0)/filled.length;
    const currentBill= filled.reduce((s,m)=>s+parseFloat(m.bill),0)/filled.length;
    return {kwhMonth, currentBill};
  }

  async function processFiles(files: File[]) {
    const limited = files.slice(0,3);
    setUploadedFiles(limited);
    setStep("loading"); setLoadMsg("Reading your invoices with Claude AI…");

    const results: any[] = [];
    for(let i=0;i<limited.length;i++){
      setLoadMsg(`Reading invoice ${i+1} of ${limited.length}…`);
      const fd=new FormData(); fd.append("file",limited[i]);
      try{
        const res=await fetch("/api/extract",{method:"POST",body:fd});
        const json=await res.json();
        if(json.success) results.push(json.data);
      }catch{}
    }

    if(results.length>0){
      // Average the extracted values
      const avgKwh  = results.reduce((s,d)=>s+(d.kwhMonth??0),0)/results.filter(d=>d.kwhMonth).length||0;
      const avgBill = results.reduce((s,d)=>s+(d.billTotal??0),0)/results.filter(d=>d.billTotal).length||0;
      const supplier= results[0].supplier ?? "";
      const powerKva= results[0].powerKva ?? 6.9;
      const tariff  = results[0].tariffType ?? "simple";
      const pricePerKwh = results[0].pricePerKwh ?? "";
      const fixedMonthly= results[0].fixedMonthly ?? "";

      setExtracted(results[0]);
      setExtractMsg(`Read ${results.length} invoice${results.length>1?"s":""} — averaged your consumption and spend.`);
      setForm(f=>({...f, supplier:supplier||f.supplier, powerKva:powerKva||f.powerKva, tariff:tariff||f.tariff}));

      // Populate months with extracted data
      setMonths(m=>{
        const updated=[...m];
        results.forEach((d,i)=>{
          if(i<3){
            updated[i]={
              month:`Month ${i+1}`,
              kwh:  d.kwhMonth  ? String(Math.round(d.kwhMonth))  : updated[i].kwh,
              bill: d.billTotal ? String(d.billTotal.toFixed(2))   : updated[i].bill,
            };
          }
        });
        return updated;
      });

      if(pricePerKwh) setComponents(c=>({...c,pricePerKwh:String(pricePerKwh)}));
      if(fixedMonthly) setComponents(c=>({...c,fixedMonthly:String(fixedMonthly)}));
    } else {
      setExtractMsg("Couldn't read the invoices — please fill in the details below.");
    }
    setStep("form");
  }

  async function handleCompare() {
    const {kwhMonth, currentBill} = getAverages();
    if(!kwhMonth||!currentBill){alert("Please enter at least one month's consumption and bill.");return;}
    setStep("loading"); let mi=0; setLoadMsg(loadingMessages[0]);
    const iv=setInterval(()=>setLoadMsg(loadingMessages[Math.min(++mi,3)]),900);
    try{
      const res=await fetch("/api/compare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        supplier:           form.supplier||undefined,
        powerKva:           form.powerKva,
        kwhMonth,
        currentBill,
        tariffType:         form.tariff,
        currentPricePerKwh: components.pricePerKwh ? parseFloat(components.pricePerKwh) : undefined,
        currentFixedMonthly:components.fixedMonthly? parseFloat(components.fixedMonthly): undefined,
        consumptionFactor:  consumFactor,
      })});
      clearInterval(iv);
      const data=await res.json();
      setResults({...data,currentBill,currentSupplier:form.supplier});
      setFilter("all"); setStep("results");
    }catch{clearInterval(iv);alert("Comparison failed. Please try again.");setStep("form");}
  }

  const stepNum = step==="upload"?1:step==="form"?2:step==="loading"?2:3;
  const filteredOffers = results?.offers?.filter((o:any)=>filter==="all"||(filter==="green"&&o.green)||(filter==="fixed"&&o.type==="fixed")||(filter==="indexed"&&o.type==="indexed"))??[];
  const adjustedKwh = results ? results.adjustedKwh : 0;

  return (
    <div style={{...s.body,opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",transition:"opacity 0.5s ease, transform 0.5s ease"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:4px;background:#e8e6df;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#6abf69;cursor:pointer;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.15);}
        select{-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23aaa' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px !important;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .vw-spinner{width:44px;height:44px;border:2.5px solid #e8e6df;border-top-color:#6abf69;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 24px;}
      `}</style>

      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>Voltwise<span style={s.logoSpan}>.</span></div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {userName&&<span style={{fontSize:13,color:"#888"}}>👋 {userName}</span>}
            <div style={s.badge}>ERSE official data</div>
          </div>
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
            {userPrefilled&&userName&&(
              <div style={s.userBanner}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"white",marginBottom:3}}>Welcome back, {userName}!</div>
                  <div style={{fontSize:12,color:"#666"}}>Your details are pre-filled. Upload a bill or compare directly.</div>
                </div>
                <button onClick={()=>setStep("form")} style={{padding:"8px 16px",background:"#6abf69",color:"white",border:"none",borderRadius:10,fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer",whiteSpace:"nowrap"}}>Compare now →</button>
              </div>
            )}
            <div style={s.uploadHero}>
              <h1 style={s.title}>Find out how much you could <span style={s.titleGreen}>save</span> on electricity</h1>
              <p style={s.sub}>Upload up to 3 months of bills for a more accurate comparison. We use the 2026 ERSE official tariffs.</p>
            </div>

            <label style={s.dropZone(dragOver, uploadedFiles.length>0)}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const files=Array.from(e.dataTransfer.files).slice(0,3);if(files.length)processFiles(files);}}>
              <input ref={fileInputRef} type="file" style={{display:"none"}} accept=".pdf,.png,.jpg,.jpeg,.webp" multiple onChange={e=>{const files=Array.from(e.target.files??[]).slice(0,3);if(files.length)processFiles(files);}}/>
              <div style={s.dropIcon}>{uploadedFiles.length>0?"✅":"📄"}</div>
              <div style={s.dropTitle}>
                {uploadedFiles.length>0 ? `${uploadedFiles.length} invoice${uploadedFiles.length>1?"s":""} ready` : "Drop up to 3 electricity bills here"}
              </div>
              <div style={s.dropSub}>{uploadedFiles.length>0 ? "Click to change" : "PDF, PNG or JPG · up to 3 files · 10 MB each"}</div>
              {uploadedFiles.length>0&&(
                <div style={s.fileList} onClick={e=>e.preventDefault()}>
                  {uploadedFiles.map((f,i)=>(
                    <div key={i} style={s.fileItem}>
                      <span>📄 {f.name}</span>
                      <span style={{color:"#aaa",fontSize:12}}>{(f.size/1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </label>

            <a style={s.manualLink} onClick={()=>setStep("form")}>Enter details manually instead →</a>
            <a style={s.agentLink} onClick={()=>router.push("/signup")}>Join the monthly switching agent →</a>
          </div>
        )}

        {/* FORM */}
        {step==="form"&&(
          <div>
            {extractMsg&&(
              <div style={s.extractBanner}>
                <span>✅</span>
                <span><strong>Invoices read.</strong> {extractMsg}</span>
              </div>
            )}
            {userPrefilled&&!extractMsg&&(
              <div style={s.extractBanner}>
                <span>👤</span>
                <span><strong>Details pre-filled</strong> from your agent profile. Adjust if needed.</span>
              </div>
            )}

            {/* Contract basics */}
            <div style={s.card}>
              <div style={s.cardTitle}>Your contract</div>
              <div style={s.formGrid}>
                <div><label style={s.label}>Current supplier</label>
                  <select style={s.input(userPrefilled)} value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))}>
                    <option value="">Select…</option>{SUPPLIERS.map(sup=><option key={sup}>{sup}</option>)}
                  </select></div>
                <div><label style={s.label}>Contracted power</label>
                  <select style={s.input(userPrefilled)} value={form.powerKva} onChange={e=>setForm(f=>({...f,powerKva:parseFloat(e.target.value)}))}>
                    {POWERS.map(p=><option key={p} value={p}>{p} kVA</option>)}
                  </select></div>
                <div style={{gridColumn:"1/-1"}}><label style={s.label}>Tariff cycle</label>
                  <select style={s.input()} value={form.tariff} onChange={e=>setForm(f=>({...f,tariff:e.target.value}))}>
                    <option value="simple">Simple (single rate)</option>
                    <option value="bihorario">Bi-hourly (peak / off-peak)</option>
                    <option value="trihorario">Tri-hourly</option>
                  </select></div>
              </div>
            </div>

            {/* Monthly consumption — up to 3 months */}
            <div style={s.card}>
              <div style={s.cardTitle}>Monthly usage — enter up to 3 months</div>
              <div style={{fontSize:12,color:"#aaa",marginBottom:16}}>We'll average them for a more accurate comparison.</div>
              {months.map((m,i)=>(
                <div key={i} style={s.monthRow}>
                  <div>
                    {i===0&&<label style={s.label}>Month</label>}
                    <input style={s.input()} value={m.month} onChange={e=>{const u=[...months];u[i]={...u[i],month:e.target.value};setMonths(u);}} placeholder={`Month ${i+1}`}/>
                  </div>
                  <div>
                    {i===0&&<label style={s.label}>Consumption (kWh)</label>}
                    <input style={s.input(!!(extracted as any).kwhMonth&&i===0)} type="number" value={m.kwh} onChange={e=>{const u=[...months];u[i]={...u[i],kwh:e.target.value};setMonths(u);}} placeholder="e.g. 239"/>
                  </div>
                  <div>
                    {i===0&&<label style={s.label}>Total bill (€)</label>}
                    <input style={s.input(!!(extracted as any).billTotal&&i===0)} type="number" value={m.bill} onChange={e=>{const u=[...months];u[i]={...u[i],bill:e.target.value};setMonths(u);}} placeholder="e.g. 69.23" step="0.01"/>
                  </div>
                </div>
              ))}
              {months.filter(m=>m.kwh&&m.bill).length>1&&(
                <div style={{fontSize:12,color:"#6abf69",marginTop:4}}>
                  ✓ Using average of {months.filter(m=>m.kwh&&m.bill).length} months — {getAverages().kwhMonth.toFixed(0)} kWh/month · €{getAverages().currentBill.toFixed(2)}/month
                </div>
              )}
            </div>

            {/* Price components — expandable */}
            <div style={s.card}>
              <button style={s.expandToggle} onClick={()=>setShowComponents(!showComponents)}>
                <span>{showComponents?"▾":"▸"}</span>
                <span>Price components from your bill (optional but improves accuracy)</span>
              </button>
              {showComponents&&(
                <div style={{marginTop:14}}>
                  <div style={{fontSize:12,color:"#aaa",marginBottom:14,lineHeight:1.6}}>
                    Find these on your bill: the energy price (€/kWh) and the fixed daily power charge. Adding these helps identify whether a switch saves you on energy, fixed costs, or both.
                  </div>
                  <div style={s.formGrid}>
                    <div><label style={s.label}>Energy price (€/kWh)</label>
                      <input style={s.input(!!components.pricePerKwh)} type="number" step="0.0001" value={components.pricePerKwh} onChange={e=>setComponents(c=>({...c,pricePerKwh:e.target.value}))} placeholder="e.g. 0.1127"/></div>
                    <div><label style={s.label}>Fixed monthly charge (€)</label>
                      <input style={s.input(!!components.fixedMonthly)} type="number" step="0.01" value={components.fixedMonthly} onChange={e=>setComponents(c=>({...c,fixedMonthly:e.target.value}))} placeholder="e.g. 6.55"/></div>
                  </div>
                </div>
              )}
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
              <p style={{fontSize:13,color:"#aaa"}}>Based on 2026 ERSE tariffs · {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</p>
            </div>

            {/* Savings hero */}
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

            {/* Current plan */}
            <div style={s.currentPlan}>
              <div style={{fontSize:14,color:"#8a7a50"}}><strong>{results.currentSupplier||"Current supplier"}</strong> · {EUR2(results.currentBill)}/month · {EUR(results.currentBill*12)}/year</div>
              <div style={s.currentPlanBadge}>Current</div>
            </div>

            {/* Consumption adjustment slider */}
            <div style={s.sliderCard}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:600}}>Adjust expected consumption</div>
                <div style={{fontSize:13,color:"#6abf69",fontWeight:600}}>{adjustedKwh.toFixed(0)} kWh/month</div>
              </div>
              <input type="range" min="0.3" max="1.5" step="0.05" value={consumFactor}
                onChange={e=>{setConsumFactor(parseFloat(e.target.value));}}
                onMouseUp={handleCompare} onTouchEnd={handleCompare}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#bbb",marginTop:4}}>
                <span>−70% less</span>
                <span style={{color:consumFactor===1?"#6abf69":"#aaa"}}>{consumFactor===1?"Current usage":`${consumFactor>1?"+":""}${((consumFactor-1)*100).toFixed(0)}%`}</span>
                <span>+50% more</span>
              </div>
            </div>

            {/* Recommendation */}
            {results.recommendation&&(
              <div style={s.recommendation}>
                <div style={s.recLabel}>Recommendation</div>
                <p style={{fontSize:14,color:"#555",lineHeight:1.7}}>{results.recommendation}</p>
              </div>
            )}

            {/* Filters */}
            <div style={s.filters}>
              <span style={{fontSize:12,color:"#bbb",fontWeight:500}}>Show:</span>
              {[["all","All offers"],["green","🌱 Green"],["fixed","Fixed price"],["indexed","Indexed"]].map(([f,l])=>(
                <FilterBtn key={f} label={l} active={filter===f} onClick={()=>setFilter(f)}/>
              ))}
            </div>

            {/* Offer cards */}
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
                        {/* Cost breakdown bar */}
                        {o.breakdown&&(
                          <BreakdownBar
                            fixed={o.breakdown.powerFixed}
                            variable={o.breakdown.energyVariable}
                            taxes={o.breakdown.taxes}
                          />
                        )}
                        <div style={s.detailsGrid}>
                          {[
                            ["Commercial kWh price", `${EUR4(o.commercialPricePerKwh)} €/kWh`],
                            ["Commercial power/day", `${EUR4(o.commercialPowerPerDay)} €/day`],
                            ["1st yr discount",  o.firstYearDiscount>0?`${(o.firstYearDiscount*100).toFixed(0)}%`:"—"],
                            ["Price type",       o.type==="indexed"?"OMIE indexed":"Fixed"],
                            ["Green energy",     o.green?"Yes (100%)":"No"],
                            ["Grid access",      "ERSE 2026 (all suppliers)"],
                          ].map(([l,v])=>(
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
              Calculations use 2026 ERSE-approved network access tariffs (Diretiva n.º 1/2026).<br/>
              Commercial prices from <a href="https://simuladorprecos.erse.pt/eletricidade/" target="_blank" rel="noopener" style={{color:"#6abf69"}}>ERSE official simulator</a>. Review contract terms before switching.
            </div>
            <button style={{...s.btnGhost,marginTop:16}} onClick={()=>{setStep("upload");setResults(null);setExtracted({});setExtractMsg("");setUploadedFiles([]);setConsumFactor(1.0);}}>← Start a new comparison</button>
          </div>
        )}
      </div>
    </div>
  );
}

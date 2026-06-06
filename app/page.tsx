"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
 
type Step = "upload" | "validating" | "form" | "comparing" | "results";
type ExtractionStatus = "idle"|"success"|"partial"|"not_a_bill"|"unreadable"|"api_error"|"wrong_country";
 
const POWERS    = [1.15,2.3,3.45,4.6,5.75,6.9,10.35,13.8,17.25,20.7];
const SUPPLIERS = [
  {id:"EDP",color:"#003c8f"},{id:"Endesa",color:"#00a651"},{id:"Galp",color:"#e30613"},
  {id:"Goldenergy",color:"#f7a800"},{id:"Iberdrola",color:"#3b8a29"},{id:"Repsol",color:"#ff6600"},
  {id:"Plenitude",color:"#5c2d91"},{id:"MUON",color:"#0ea5e9"},{id:"Other",color:"#888"},
];
const PC:Record<string,string> = Object.fromEntries(SUPPLIERS.map(s=>[s.id,s.color]));
const EUR  = (n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const EUR2 = (n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n);
 
const VALIDATION_STEPS = ["Checking file format…","Reading invoice with AI…","Verifying it's a Portuguese electricity bill…","Extracting tariff data…"];
const COMPARE_STEPS    = ["Fetching 2026 ERSE tariffs…","Interrogating 15 suppliers…","Ranking all offers…","Writing your recommendation…"];
 
interface MonthData{label:string;kwh:string;bill:string;}
interface ExtractionResult{status:ExtractionStatus;data?:any;missingFields?:string[];message?:string;}
 
function classifyExtraction(data:any):ExtractionResult{
  const hasBillSignals = data.supplier||data.billTotal||data.kwhMonth;
  if(!hasBillSignals){
    const s=(data.summary??"").toLowerCase();
    if(s.includes("not")||s.includes("unable")||s.includes("cannot")||s.includes("no electricity"))
      return{status:"not_a_bill",message:data.summary};
    return{status:"not_a_bill",message:"This doesn't appear to be a Portuguese electricity bill."};
  }
  const supplier=(data.supplier??"").toLowerCase();
  const summary=(data.summary??"").toLowerCase();
  const knownPT=["edp","endesa","galp","goldenergy","iberdrola","repsol","plenitude","muon","su electricidade"];
  const isForeign=summary.includes("spain")||summary.includes("france")||summary.includes("uk")||summary.includes("british")||summary.includes("edf");
  if(isForeign&&!knownPT.some(s=>supplier.includes(s)))
    return{status:"wrong_country",message:"This looks like a bill from another country. Voltwise compares Portuguese suppliers only."};
  const missing:string[]=[];
  if(!data.kwhMonth)  missing.push("monthly kWh");
  if(!data.billTotal) missing.push("bill total");
  if(!data.powerKva)  missing.push("contracted power");
  if(missing.length>=3) return{status:"partial",data,missingFields:missing,message:"We found a bill but couldn't read most of the data."};
  if(missing.length>0)  return{status:"partial",data,missingFields:missing,message:"Read successfully — fill in the missing fields below."};
  return{status:"success",data};
}
 
export default function Home(){
  const router=useRouter();
  const fileInputRef=useRef<HTMLInputElement>(null);
  const sliderTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const compareAbort=useRef<AbortController|null>(null);
 
  const[step,setStep]=useState<Step>("upload");
  const[uploadedFiles,setUploadedFiles]=useState<File[]>([]);
  const[extraction,setExtraction]=useState<ExtractionResult|null>(null);
  const[validStep,setValidStep]=useState(0);
  const[validDone,setValidDone]=useState<boolean[]>([false,false,false,false]);
  const[compareStep,setCompareStep]=useState(0);
  const[compareDone,setCompareDone]=useState<boolean[]>([false,false,false,false]);
  const[months,setMonths]=useState<MonthData[]>([{label:"This month",kwh:"",bill:""},{label:"Last month",kwh:"",bill:""},{label:"2 months ago",kwh:"",bill:""}]);
  const[form,setForm]=useState({supplier:"",powerKva:6.9,tariff:"simple"});
  const[showComponents,setShowComponents]=useState(false);
  const[components,setComponents]=useState({pricePerKwh:"",fixedMonthly:""});
  const[consumFactor,setConsumFactor]=useState(1.0);
  const[results,setResults]=useState<any>(null);
  const[compareError,setCompareError]=useState<string|null>(null);
  const[expanded,setExpanded]=useState<Set<number>>(new Set());
  const[filter,setFilter]=useState("all");
  const[dragOver,setDragOver]=useState(false);
  const[fileError,setFileError]=useState<string|null>(null);
  const[visible,setVisible]=useState(false);
  const[userName,setUserName]=useState<string|null>(null);
  const[userPrefilled,setUserPrefilled]=useState(false);
  const[isRefining,setIsRefining]=useState(false);
 
  useEffect(()=>{
    setTimeout(()=>setVisible(true),50);
    const email=localStorage.getItem("voltwise_user_email");
    if(email){
      fetch(`/api/user?email=${encodeURIComponent(email)}`).then(r=>r.json()).then(data=>{
        if(data.found){
          setUserName(data.name?.split(" ")[0]??null);
          setForm(f=>({...f,supplier:data.currentSupplier??f.supplier,powerKva:data.powerKva??f.powerKva}));
          setMonths(m=>{const u=[...m];if(data.monthlyKwh)u[0]={...u[0],kwh:String(data.monthlyKwh)};if(data.monthlyCost)u[0]={...u[0],bill:String(data.monthlyCost)};return u;});
          setUserPrefilled(true);
        }
      }).catch(()=>{});
    }
  },[]);
 
  const toggle=(id:number)=>setExpanded(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
 
  function getAverages(){
    const filled=months.filter(m=>m.kwh&&m.bill);
    if(!filled.length)return{kwhMonth:0,currentBill:0};
    return{kwhMonth:filled.reduce((s,m)=>s+parseFloat(m.kwh),0)/filled.length,currentBill:filled.reduce((s,m)=>s+parseFloat(m.bill),0)/filled.length};
  }
 
  function animateSteps(setSt:(n:number)=>void,setDn:(d:boolean[]|((prev:boolean[])=>boolean[]))=>void,count:number,interval=900){
    let i=0;setSt(0);setDn(Array(count).fill(false));
    const tick=()=>{setDn((d:boolean[])=>{const n=[...d];n[i]=true;return n;});;i++;if(i<count)setTimeout(tick,interval);};
    setTimeout(tick,interval);
  }
 
  function validateFile(file:File):string|null{
    if(file.size>10*1024*1024)return`"${file.name}" is too large (${(file.size/1024/1024).toFixed(1)} MB). Max 10 MB.`;
    const ext="."+file.name.split(".").pop()?.toLowerCase();
    const ok=["application/pdf","image/jpeg","image/png","image/webp"];
    const okExt=[".pdf",".jpg",".jpeg",".png",".webp"];
    if(!ok.includes(file.type)&&!okExt.includes(ext))return`"${file.name}" is not supported. Please use PDF, JPG, or PNG.`;
    return null;
  }
 
  async function processFiles(files:File[]){
    setFileError(null);
    for(const f of files){const e=validateFile(f);if(e){setFileError(e);return;}}
    const limited=files.slice(0,3);
    setUploadedFiles(limited);
    setStep("validating");
    animateSteps(setValidStep,setValidDone,4);
    const extracted:any[]=[];
    for(let i=0;i<limited.length;i++){
      const fd=new FormData();fd.append("file",limited[i]);
      try{
        const res=await fetch("/api/extract",{method:"POST",body:fd});
        if(res.status===413){continue;}
        if(res.status===415){continue;}
        if(res.status===503){setExtraction({status:"api_error",message:"AI extraction temporarily unavailable. Enter details manually."});setStep("form");return;}
        const json=await res.json();
        if(json.success)extracted.push(json.data);
      }catch{}
    }
    if(extracted.length===0){
      setExtraction({status:"unreadable",message:"Couldn't read the file. It may be corrupt, password-protected, or an unsupported format."});
      setStep("form");return;
    }
    const result=classifyExtraction(extracted[0]);
    if(result.status==="not_a_bill"||result.status==="wrong_country"){setExtraction(result);setStep("form");return;}
    if(result.data){
      const d=result.data;
      setForm(f=>({...f,supplier:d.supplier??f.supplier,powerKva:d.powerKva??f.powerKva,tariff:d.tariffType??f.tariff}));
      setMonths(m=>{const u=[...m];extracted.forEach((ex,i)=>{if(i<3)u[i]={label:u[i].label,kwh:ex.kwhMonth?String(Math.round(ex.kwhMonth)):u[i].kwh,bill:ex.billTotal?String(ex.billTotal.toFixed(2)):u[i].bill};});return u;});
      if(d.pricePerKwh)setComponents(c=>({...c,pricePerKwh:String(d.pricePerKwh)}));
      if(d.fixedMonthly)setComponents(c=>({...c,fixedMonthly:String(d.fixedMonthly)}));
    }
    setExtraction(result);setStep("form");
  }
 
  const runCompare=useCallback(async(factor:number,silent=false)=>{
    const{kwhMonth,currentBill}=getAverages();
    if(!kwhMonth||!currentBill)return;
    if(compareAbort.current)compareAbort.current.abort();
    compareAbort.current=new AbortController();
    if(!silent)setCompareError(null);
    try{
      const res=await fetch("/api/compare",{method:"POST",headers:{"Content-Type":"application/json"},signal:compareAbort.current.signal,
        body:JSON.stringify({supplier:form.supplier||undefined,powerKva:form.powerKva,kwhMonth,currentBill,tariffType:form.tariff,
          currentPricePerKwh:components.pricePerKwh?parseFloat(components.pricePerKwh):undefined,
          currentFixedMonthly:components.fixedMonthly?parseFloat(components.fixedMonthly):undefined,
          consumptionFactor:factor})});
      if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error??`Server error (${res.status})`);}
      const data=await res.json();
      if(!data.offers||data.offers.length===0)throw new Error("No offers found. Please try again.");
      setResults({...data,currentBill,currentSupplier:form.supplier});setFilter("all");setIsRefining(false);
    }catch(err:any){
      if(err.name==="AbortError")return;
      setIsRefining(false);
      if(!silent){setCompareError(err.message??"Comparison failed. Check your connection and try again.");setStep("form");}
    }
  },[form,components,months]);
 
  async function handleCompare(){
    const{kwhMonth,currentBill}=getAverages();
    if(!kwhMonth||!currentBill){setCompareError("Please enter at least one month's consumption (kWh) and bill total (€).");return;}
    setCompareError(null);setStep("comparing");
    animateSteps(setCompareStep,setCompareDone,4);
    await runCompare(consumFactor);setStep("results");
  }
 
  function handleSlider(val:number){
    setConsumFactor(val);setIsRefining(true);
    if(sliderTimer.current)clearTimeout(sliderTimer.current);
    sliderTimer.current=setTimeout(()=>runCompare(val,true),600);
  }
 
  function resetAll(){
    setStep("upload");setResults(null);setExtraction(null);setUploadedFiles([]);
    setFileError(null);setCompareError(null);setConsumFactor(1.0);setIsRefining(false);
    setMonths([{label:"This month",kwh:"",bill:""},{label:"Last month",kwh:"",bill:""},{label:"2 months ago",kwh:"",bill:""}]);
  }
 
  const stepNum=step==="upload"?1:step==="results"?3:2;
  const filledMonths=months.filter(m=>m.kwh&&m.bill).length;
  const allOffers=results?.offers??[];
  const filteredOffers=allOffers.filter((o:any)=>filter==="all"||(filter==="green"&&o.green)||(filter==="fixed"&&o.type==="fixed")||(filter==="indexed"&&o.type==="indexed"));
  const counts={all:allOffers.length,green:allOffers.filter((o:any)=>o.green).length,fixed:allOffers.filter((o:any)=>o.type==="fixed").length,indexed:allOffers.filter((o:any)=>o.type==="indexed").length};
  const noSavingsFound=results&&allOffers.every((o:any)=>o.annualSaving<=0);
 
  const extractionBanner=(()=>{
    if(!extraction)return null;
    switch(extraction.status){
      case"success":    return{bg:"#f0faf0",border:"#c8e6c8",color:"#3a7a3a",icon:"✅",title:"Invoice read successfully.",sub:`${uploadedFiles.length>1?`${uploadedFiles.length} invoices averaged. `:""}Check the details below.`,canRetry:false};
      case"partial":    return{bg:"#fffbf0",border:"#f0e6c0",color:"#8a6a20",icon:"⚠️",title:"Partially read.",sub:`${extraction.message} Missing: ${extraction.missingFields?.join(", ")}.`,canRetry:false};
      case"not_a_bill": return{bg:"#fef2f2",border:"#fecaca",color:"#dc2626",icon:"❌",title:"This doesn't look like an electricity bill.",sub:extraction.message??"Please upload a Portuguese electricity bill.",canRetry:true};
      case"wrong_country":return{bg:"#fef2f2",border:"#fecaca",color:"#dc2626",icon:"🌍",title:"Bill from another country.",sub:extraction.message??"Voltwise compares Portuguese suppliers only.",canRetry:true};
      case"unreadable": return{bg:"#fef2f2",border:"#fecaca",color:"#dc2626",icon:"📄",title:"Couldn't read the file.",sub:(extraction.message??"")+" Enter your details manually.",canRetry:true};
      case"api_error":  return{bg:"#fff8ee",border:"#f0d090",color:"#8a6a20",icon:"⚙️",title:"AI extraction unavailable.",sub:"Enter your details manually below.",canRetry:true};
      default:return null;
    }
  })();
 
  const css=`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
    *{box-sizing:border-box;}
    input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
    input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:4px;background:#e8e6df;outline:none;}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#6abf69;cursor:pointer;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
    @keyframes checkPop{0%{transform:scale(0);}60%{transform:scale(1.2);}100%{transform:scale(1);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    .vw-fade{animation:fadeIn 0.3s ease forwards;}
    .vw-check{animation:checkPop 0.3s ease forwards;display:inline-block;}
    .vw-pill{padding:8px 12px;border:1.5px solid #e8e6df;border-radius:10px;font-size:13px;font-weight:500;background:white;cursor:pointer;transition:all 0.15s;color:#888;font-family:inherit;white-space:nowrap;}
    .vw-pill:hover{border-color:#6abf69;color:#3a7a3a;}
    .vw-pill.active{background:#1a1a1a;border-color:#1a1a1a;color:white;}
    .vw-sup{border:1.5px solid #e8e6df;border-radius:12px;padding:12px 10px;background:white;cursor:pointer;transition:all 0.15s;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;font-weight:500;color:#888;font-family:inherit;}
    .vw-sup:hover{border-color:#6abf69;transform:translateY(-1px);}
    .vw-sup.active{border-width:2px;color:#1a1a1a;}
    .vw-offer{background:white;border:1.5px solid #e8e6df;border-radius:18px;padding:18px 20px;margin-bottom:10px;transition:all 0.2s;}
    .vw-offer:hover{border-color:#ccc;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
    .vw-offer.best{border:2px solid #6abf69;background:linear-gradient(135deg,#f7fdf7 0%,white 100%);box-shadow:0 2px 20px rgba(106,191,105,0.12);}
    .vw-offer.current{border:2px solid #f5d97a;background:#fffdf5;}
    .vw-sw{padding:9px 16px;background:#6abf69;color:white;border:none;border-radius:9px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
    .vw-sw:hover{background:#4a9f4a;}
    .vw-ex{padding:9px 14px;background:white;color:#888;border:1.5px solid #e8e6df;border-radius:9px;font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;}
    .vw-ex:hover{border-color:#bbb;}
    .chip{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:white;border:1px solid #e8e6df;border-radius:20px;font-size:12px;color:#888;font-weight:500;}
    .refining{animation:pulse 1.2s ease-in-out infinite;}
  `;
 
  const cardStyle={background:"white",border:"1px solid #e8e6df",borderRadius:20,padding:24,marginBottom:14};
  const secLabel={fontSize:11,fontWeight:600,color:"#bbb",textTransform:"uppercase" as const,letterSpacing:"0.08em",marginBottom:16};
  const lbl={display:"block",fontSize:12,fontWeight:500,color:"#888",marginBottom:6};
  const inp=(green?:boolean):React.CSSProperties=>({width:"100%",border:`1.5px solid ${green?"#c8e6c8":"#e8e6df"}`,borderRadius:10,padding:"10px 12px",fontSize:13,fontFamily:"inherit",background:green?"#f7fdf7":"white",outline:"none",boxSizing:"border-box" as const});
  const btnPrimary=(disabled?:boolean):React.CSSProperties=>({width:"100%",padding:"16px 24px",background:disabled?"#ccc":"#1a1a1a",color:"white",border:"none",borderRadius:14,fontSize:15,fontWeight:600,fontFamily:"inherit",cursor:disabled?"not-allowed":"pointer"});
  const btnGhost:React.CSSProperties={width:"100%",padding:"13px 24px",background:"white",color:"#888",border:"1.5px solid #e8e6df",borderRadius:14,fontSize:14,fontWeight:500,fontFamily:"inherit",cursor:"pointer",marginTop:10};
 
  return(
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',Arial,sans-serif",background:"#FAFAF7",minHeight:"100vh",color:"#1a1a1a",opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",transition:"opacity 0.5s ease, transform 0.5s ease"}}>
      <style>{css}</style>
      <div style={{maxWidth:640,margin:"0 auto",padding:"0 20px 80px"}}>
 
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"24px 0 20px",borderBottom:"1px solid #e8e6df",marginBottom:28}}>
          <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",cursor:"pointer"}} onClick={resetAll}>Voltwise<span style={{color:"#6abf69"}}>.</span></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {userName&&<span style={{fontSize:13,color:"#888"}}>👋 {userName}</span>}
            <div style={{fontSize:11,fontWeight:500,color:"#6abf69",background:"#f0faf0",border:"1px solid #c8e6c8",padding:"4px 12px",borderRadius:20}}>ERSE 2026</div>
          </div>
        </div>
 
        {/* Steps */}
        <div style={{display:"flex",alignItems:"center",marginBottom:28}}>
          {[["1","Invoice"],["2","Review"],["3","Results"]].map(([n,l],i)=>{
            const done=stepNum>i+1,active=stepNum===i+1;
            return(<div key={n} style={{display:"flex",alignItems:"center",flex:i<2?1:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?"#6abf69":active?"#1a1a1a":"#eeede8",color:done||active?"white":"#bbb",flexShrink:0,transition:"all 0.3s"}}>{done?"✓":n}</div>
                <span style={{fontSize:12,fontWeight:500,color:active?"#1a1a1a":"#bbb"}}>{l}</span>
              </div>
              {i<2&&<div style={{flex:1,height:1,background:stepNum>i+1?"#6abf69":"#e8e6df",margin:"0 10px",transition:"background 0.3s"}}/>}
            </div>);
          })}
        </div>
 
        {/* ── UPLOAD ── */}
        {step==="upload"&&(
          <div className="vw-fade">
            {userPrefilled&&userName&&(
              <div style={{background:"#1a1a1a",borderRadius:16,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div><div style={{fontSize:13,fontWeight:600,color:"white",marginBottom:3}}>Welcome back, {userName}!</div><div style={{fontSize:12,color:"#666"}}>Your details are pre-filled.</div></div>
                <button onClick={()=>setStep("form")} style={{padding:"8px 16px",background:"#6abf69",color:"white",border:"none",borderRadius:10,fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>Compare now →</button>
              </div>
            )}
            <div style={{textAlign:"center",padding:"8px 0 28px"}}>
              <h1 style={{fontFamily:"Georgia,'Times New Roman',serif",fontSize:34,fontWeight:700,lineHeight:1.2,letterSpacing:"-0.02em",marginBottom:12}}>Find out how much you could <span style={{color:"#6abf69",fontStyle:"italic"}}>save</span> on electricity</h1>
              <p style={{fontSize:15,color:"#888",lineHeight:1.6,maxWidth:380,margin:"0 auto"}}>Upload up to 3 bills for a more accurate comparison.</p>
            </div>
 
            {/* File error */}
            {fileError&&(
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:14,padding:"14px 18px",display:"flex",gap:10,alignItems:"flex-start",marginBottom:16,fontSize:14,color:"#dc2626"}}>
                <span style={{flexShrink:0}}>❌</span>
                <div><strong>File not accepted</strong><br/><span style={{fontSize:13}}>{fileError}</span><div style={{marginTop:6,fontSize:12,color:"#e05a5a"}}>Supported: PDF, JPG, PNG · Max 10 MB each</div></div>
              </div>
            )}
 
            <label style={{border:`2px dashed ${dragOver?"#6abf69":fileError?"#fca5a5":uploadedFiles.length>0?"#6abf69":"#d5d2c8"}`,borderRadius:20,padding:"44px 32px",textAlign:"center",cursor:"pointer",background:dragOver?"#f7fdf7":fileError?"#fff5f5":uploadedFiles.length>0?"#f7fdf7":"white",transition:"all 0.2s ease",marginBottom:12,display:"block"}}
              onDragOver={e=>{e.preventDefault();setDragOver(true);setFileError(null);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=Array.from(e.dataTransfer.files).slice(0,3);if(f.length)processFiles(f);}}>
              <input ref={fileInputRef} type="file" style={{display:"none"}} accept=".pdf,.png,.jpg,.jpeg,.webp" multiple onChange={e=>{const f=Array.from(e.target.files??[]).slice(0,3);if(f.length)processFiles(f);}}/>
              <div style={{width:52,height:52,borderRadius:14,background:fileError?"#fef2f2":"#f0faf0",border:`1px solid ${fileError?"#fecaca":"#c8e6c8"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px"}}>{fileError?"❌":uploadedFiles.length>0?"✅":"📄"}</div>
              <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>{fileError?"Try a different file":uploadedFiles.length>0?`${uploadedFiles.length} invoice${uploadedFiles.length>1?"s":""} ready`:"Drop up to 3 electricity bills here"}</div>
              <div style={{fontSize:13,color:"#aaa"}}>PDF, PNG or JPG · up to 3 files · 10 MB each</div>
            </label>
 
            <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginBottom:16}}>
              <span className="chip">⚡ ERSE official data</span><span className="chip">🏢 15 suppliers</span><span className="chip">✓ Free</span>
            </div>
            <a style={{display:"block",textAlign:"center",padding:12,fontSize:14,color:"#6abf69",fontWeight:500,cursor:"pointer"}} onClick={()=>setStep("form")}>Enter details manually instead →</a>
            <div style={{textAlign:"center",marginTop:8}}>
              <button onClick={()=>router.push("/signup")} style={{padding:"9px 20px",background:"white",color:"#888",border:"1.5px solid #e8e6df",borderRadius:20,fontSize:13,fontWeight:500,fontFamily:"inherit",cursor:"pointer"}}>🤖 Join the monthly switching agent</button>
            </div>
          </div>
        )}
 
        {/* ── VALIDATING ── */}
        {step==="validating"&&(
          <div className="vw-fade" style={{padding:"80px 0",textAlign:"center"}}>
            <div style={{width:52,height:52,border:"2.5px solid #e8e6df",borderTopColor:"#6abf69",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 32px"}}/>
            <h2 style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:600,marginBottom:28}}>Checking your invoice</h2>
            <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:300,margin:"0 auto",textAlign:"left"}}>
              {VALIDATION_STEPS.map((msg,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,opacity:validStep>=i?1:0.25,transition:"opacity 0.4s"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:validDone[i]?"#6abf69":validStep===i?"#1a1a1a":"#e8e6df",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",flexShrink:0,transition:"background 0.3s"}}>
                    {validDone[i]?<span className="vw-check">✓</span>:validStep===i?"…":""}
                  </div>
                  <span style={{fontSize:14,color:validDone[i]?"#1a1a1a":validStep===i?"#1a1a1a":"#aaa",fontWeight:validStep===i?500:400}}>{msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* ── COMPARING ── */}
        {step==="comparing"&&(
          <div className="vw-fade" style={{padding:"80px 0",textAlign:"center"}}>
            <div style={{width:52,height:52,border:"2.5px solid #e8e6df",borderTopColor:"#6abf69",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 32px"}}/>
            <h2 style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:600,marginBottom:28}}>Finding your best deal</h2>
            <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:300,margin:"0 auto",textAlign:"left"}}>
              {COMPARE_STEPS.map((msg,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,opacity:compareStep>=i?1:0.25,transition:"opacity 0.4s"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:compareDone[i]?"#6abf69":compareStep===i?"#1a1a1a":"#e8e6df",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",flexShrink:0,transition:"background 0.3s"}}>
                    {compareDone[i]?<span className="vw-check">✓</span>:compareStep===i?"…":""}
                  </div>
                  <span style={{fontSize:14,color:compareDone[i]?"#1a1a1a":compareStep===i?"#1a1a1a":"#aaa",fontWeight:compareStep===i?500:400}}>{msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* ── FORM ── */}
        {step==="form"&&(
          <div className="vw-fade">
            {extractionBanner&&(
              <div style={{background:extractionBanner.bg,border:`1px solid ${extractionBanner.border}`,borderRadius:14,padding:"14px 18px",display:"flex",gap:10,alignItems:"flex-start",marginBottom:20,fontSize:14,color:extractionBanner.color}}>
                <span style={{flexShrink:0,fontSize:16}}>{extractionBanner.icon}</span>
                <div>
                  <strong>{extractionBanner.title}</strong>{" "}<span style={{fontSize:13}}>{extractionBanner.sub}</span>
                  {extractionBanner.canRetry&&(
                    <div style={{marginTop:8}}>
                      <button onClick={()=>{setStep("upload");setExtraction(null);setUploadedFiles([]);}}
                        style={{fontSize:12,color:extractionBanner.color,background:"none",border:`1px solid ${extractionBanner.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                        ← Try a different file
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {userPrefilled&&!extraction&&(
              <div style={{background:"#f0faf0",border:"1px solid #c8e6c8",borderRadius:14,padding:"14px 18px",display:"flex",gap:10,marginBottom:20,fontSize:14,color:"#3a7a3a"}}>
                <span>👤</span><span><strong>Pre-filled</strong> from your agent profile. Adjust if needed.</span>
              </div>
            )}
            {compareError&&(
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:14,padding:"14px 18px",display:"flex",gap:10,alignItems:"flex-start",marginBottom:20,fontSize:14,color:"#dc2626"}}>
                <span>❌</span><div><strong>Comparison failed</strong><br/><span style={{fontSize:13}}>{compareError}</span></div>
              </div>
            )}
 
            {/* Supplier */}
            <div style={cardStyle}>
              <div style={secLabel}>1 · Current supplier</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {SUPPLIERS.map(sup=>(
                  <button key={sup.id} className={`vw-sup${form.supplier===sup.id?" active":""}`}
                    style={form.supplier===sup.id?{borderColor:sup.color}:{}} onClick={()=>setForm(f=>({...f,supplier:sup.id}))}>
                    <div style={{width:32,height:32,borderRadius:8,background:form.supplier===sup.id?sup.color:"#f5f5f2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:form.supplier===sup.id?"white":"#888",transition:"all 0.15s"}}>
                      {sup.id.slice(0,3).toUpperCase()}
                    </div>
                    <span style={{color:form.supplier===sup.id?"#1a1a1a":"#888"}}>{sup.id}</span>
                  </button>
                ))}
              </div>
            </div>
 
            {/* Power */}
            <div style={cardStyle}>
              <div style={secLabel}>2 · Contracted power</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {POWERS.map(p=>(<button key={p} className={`vw-pill${form.powerKva===p?" active":""}`} onClick={()=>setForm(f=>({...f,powerKva:p}))}>{p} kVA</button>))}
              </div>
              <div style={{marginTop:10,fontSize:12,color:"#aaa"}}>Most homes: <strong style={{color:"#888"}}>3.45</strong> or <strong style={{color:"#888"}}>6.9 kVA</strong></div>
            </div>
 
            {/* Monthly usage */}
            <div style={cardStyle}>
              <div style={secLabel}>3 · Monthly usage</div>
              <div style={{fontSize:12,color:"#aaa",marginBottom:16,marginTop:-10}}>Up to 3 months — we average them.</div>
              {months.map((m,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10,alignItems:"end"}}>
                  <div>{i===0&&<label style={lbl}>Month</label>}<input style={inp()} value={m.label} onChange={e=>{const u=[...months];u[i]={...u[i],label:e.target.value};setMonths(u);}}/></div>
                  <div>{i===0&&<label style={lbl}>kWh used</label>}<input type="number" placeholder="e.g. 239" style={inp(!!m.kwh)} value={m.kwh} onChange={e=>{const u=[...months];u[i]={...u[i],kwh:e.target.value};setMonths(u);}}/></div>
                  <div>{i===0&&<label style={lbl}>Total bill €</label>}<input type="number" step="0.01" placeholder="e.g. 69.23" style={inp(!!m.bill)} value={m.bill} onChange={e=>{const u=[...months];u[i]={...u[i],bill:e.target.value};setMonths(u);}}/></div>
                </div>
              ))}
              {filledMonths>1&&<div style={{fontSize:12,color:"#6abf69",marginTop:6,fontWeight:500}}>✓ Averaging {filledMonths} months — {getAverages().kwhMonth.toFixed(0)} kWh · €{getAverages().currentBill.toFixed(2)}/month</div>}
              {filledMonths===0&&<div style={{fontSize:12,color:"#f59e0b",marginTop:6}}>↑ Fill in at least one month to compare</div>}
            </div>
 
            {/* Tariff */}
            <div style={cardStyle}>
              <div style={secLabel}>4 · Tariff & pricing</div>
              <div style={{marginBottom:16}}>
                <label style={lbl}>Tariff cycle</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[["simple","Simple"],["bihorario","Bi-hourly"],["trihorario","Tri-hourly"]].map(([val,lbl2])=>(<button key={val} className={`vw-pill${form.tariff===val?" active":""}`} onClick={()=>setForm(f=>({...f,tariff:val}))}>{lbl2}</button>))}
                </div>
              </div>
              <button style={{background:"none",border:"none",fontSize:13,color:"#6abf69",fontWeight:500,cursor:"pointer",fontFamily:"inherit",padding:0,display:"flex",alignItems:"center",gap:6}} onClick={()=>setShowComponents(!showComponents)}>
                <span>{showComponents?"▾":"▸"}</span> Price components (optional)
              </button>
              {showComponents&&(
                <div style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div><label style={lbl}>Energy price (€/kWh)</label><input type="number" step="0.0001" placeholder="e.g. 0.1127" style={inp()} value={components.pricePerKwh} onChange={e=>setComponents(c=>({...c,pricePerKwh:e.target.value}))}/><div style={{fontSize:11,color:"#aaa",marginTop:4}}>Comercialização only</div></div>
                  <div><label style={lbl}>Fixed monthly (€)</label><input type="number" step="0.01" placeholder="e.g. 6.55" style={inp()} value={components.fixedMonthly} onChange={e=>setComponents(c=>({...c,fixedMonthly:e.target.value}))}/><div style={{fontSize:11,color:"#aaa",marginTop:4}}>Potência Contratada</div></div>
                </div>
              )}
            </div>
 
            <button style={btnPrimary(filledMonths===0)} onClick={handleCompare} disabled={filledMonths===0}>Compare with the market →</button>
            {filledMonths===0&&<div style={{fontSize:12,color:"#f59e0b",textAlign:"center",marginTop:8}}>Enter at least one month's kWh and bill total to continue</div>}
            <button style={btnGhost} onClick={()=>setStep("upload")}>← Back</button>
          </div>
        )}
 
        {/* ── RESULTS ── */}
        {step==="results"&&results&&(
          <div className="vw-fade">
            <div style={{marginBottom:24}}>
              <h2 style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:700,letterSpacing:"-0.02em",marginBottom:4}}>Here&apos;s what we found</h2>
              <p style={{fontSize:13,color:"#aaa"}}>Based on 2026 ERSE tariffs · {new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</p>
            </div>
 
            {noSavingsFound?(
              <div style={{background:"white",border:"1px solid #e8e6df",borderRadius:20,padding:32,textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:40,marginBottom:16}}>🏆</div>
                <h3 style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,marginBottom:8}}>You&apos;re already on the best deal</h3>
                <p style={{fontSize:14,color:"#888",lineHeight:1.7,marginBottom:20}}>No supplier offers a cheaper plan for your usage right now. The market changes monthly — check back soon.</p>
                <button onClick={resetAll} style={{padding:"10px 20px",background:"#1a1a1a",color:"white",border:"none",borderRadius:10,fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>Start a new comparison</button>
              </div>
            ):(
              <div style={{background:"#1a1a1a",borderRadius:24,padding:28,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:500,color:"#666",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:6}}>Potential annual saving</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:64,fontWeight:700,color:"#6abf69",letterSpacing:"-0.04em",lineHeight:1,marginBottom:6}}>{EUR(results.summary.potentialSaving)}</div>
                <div style={{fontSize:14,color:"#555",marginBottom:20}}>by switching to <span style={{color:"#6abf69",fontWeight:600}}>{results.summary.bestProvider}</span></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[{label:"You pay now",val:`${EUR(results.summary.currentAnnualCost)}/yr`,sub:results.currentSupplier||"Current"},{label:"Best offer",val:`${EUR(results.summary.bestAnnualCost)}/yr`,sub:`${results.summary.bestProvider} · ${results.summary.savingPercent.toFixed(0)}% less`}].map(({label,val,sub})=>(
                    <div key={label} style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#555",marginBottom:4}}>{label}</div>
                      <div style={{fontSize:17,fontWeight:600,color:"white"}}>{val}</div>
                      <div style={{fontSize:11,color:"#444",marginTop:2}}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            <div style={{background:"#fffbf0",border:"1px solid #f0e6c0",borderRadius:14,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:14,color:"#8a7a50"}}><strong>{results.currentSupplier||"Current"}</strong> · {EUR2(results.currentBill)}/month · {EUR(results.currentBill*12)}/year</div>
              <div style={{fontSize:10,fontWeight:700,color:"#8a6a20",background:"#f5d97a",padding:"3px 10px",borderRadius:20,textTransform:"uppercase",letterSpacing:"0.05em"}}>Current</div>
            </div>
 
            <div style={{background:"white",border:"1px solid #e8e6df",borderRadius:16,padding:"16px 20px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:600}}>Adjust expected consumption</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {isRefining&&<div style={{width:12,height:12,border:"1.5px solid #e8e6df",borderTopColor:"#6abf69",borderRadius:"50%",animation:"spin 0.6s linear infinite"}}/>}
                  <div className={isRefining?"refining":""} style={{fontSize:13,color:"#6abf69",fontWeight:600}}>{results.adjustedKwh?.toFixed(0)??getAverages().kwhMonth.toFixed(0)} kWh/month</div>
                </div>
              </div>
              <input type="range" min="0.3" max="1.5" step="0.05" value={consumFactor} onChange={e=>handleSlider(parseFloat(e.target.value))}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#bbb",marginTop:4}}>
                <span>−70%</span>
                <span style={{color:consumFactor===1?"#6abf69":"#aaa"}}>{consumFactor===1?"Current usage":`${consumFactor>1?"+":""}${((consumFactor-1)*100).toFixed(0)}%`}</span>
                <span>+50%</span>
              </div>
            </div>
 
            {results.recommendation&&(
              <div style={{background:"white",border:"1px solid #e8e6df",borderRadius:14,padding:"16px 20px",marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Recommendation</div>
                <p style={{fontSize:14,color:"#555",lineHeight:1.7,margin:0}}>{results.recommendation}</p>
              </div>
            )}
 
            {!noSavingsFound&&(
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#bbb",fontWeight:500}}>Show:</span>
                {([["all","All"],["green","🌱 Green"],["fixed","Fixed"],["indexed","Indexed"]] as [keyof typeof counts,string][]).map(([f,l])=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:500,border:`1.5px solid ${filter===f?"#1a1a1a":"#e8e6df"}`,background:filter===f?"#1a1a1a":"white",color:filter===f?"white":"#888",cursor:"pointer",fontFamily:"inherit"}}>
                    {l} <span style={{opacity:0.6,fontSize:11}}>({counts[f]})</span>
                  </button>
                ))}
              </div>
            )}
 
            {filteredOffers.length===0&&!noSavingsFound&&(
              <div style={{background:"white",border:"1px solid #e8e6df",borderRadius:16,padding:24,textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:32,marginBottom:10}}>🔍</div>
                <p style={{fontSize:14,color:"#888"}}>No offers match this filter. <button onClick={()=>setFilter("all")} style={{color:"#6abf69",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600}}>Show all</button></p>
              </div>
            )}
 
            <div>
              {filteredOffers.map((o:any,i:number)=>{
                const isBest=i===0&&o.annualSaving>0,isCurrent=results.currentSupplier?.toLowerCase()===o.provider.toLowerCase(),isOpen=expanded.has(o.id),bg=PC[o.provider]??"#374151";
                return(
                  <div key={o.id} className={`vw-offer${isBest?" best":isCurrent?" current":""}`}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1}}>
                        <div style={{width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"white",flexShrink:0}}>{o.provider.slice(0,3).toUpperCase()}</div>
                        <div><div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{o.name}</div><div style={{fontSize:12,color:"#aaa"}}>{o.provider}</div></div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {o.supermarketBenefit && o.estimatedMonthlyBenefit ? (
                          <>
                            <div style={{fontSize:12,color:"#aaa",marginBottom:4}}>
                              {EUR2(o.monthlyEstimate)} - {EUR2(o.estimatedMonthlyBenefit)} ({o.supermarketBenefit.supermarket})
                            </div>
                            <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:600}}>{EUR2(o.estimatedMonthlyEurAfterBenefit || o.monthlyEstimate)}<span style={{fontSize:12,fontWeight:400,color:"#aaa",fontFamily:"inherit"}}>/mo</span></div>
                          </>
                        ) : (
                          <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:600}}>{EUR2(o.monthlyEstimate)}<span style={{fontSize:12,fontWeight:400,color:"#aaa",fontFamily:"inherit"}}>/mo</span></div>
                        )}
                        <div style={{fontSize:12,color:"#aaa",marginTop:1}}>{EUR(o.annualEstimate)}/yr</div>
                        <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:600}}>{EUR2(o.monthlyEstimate)}<span style={{fontSize:12,fontWeight:400,color:"#aaa",fontFamily:"inherit"}}>/mo</span></div>
                        <div style={{fontSize:12,color:"#aaa",marginTop:1}}>{EUR(o.annualEstimate)}/yr</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                        {isBest&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:"#6abf69",color:"white"}}>Best deal</span>}
                        {isCurrent&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:"#f5d97a",color:"#8a6a20"}}>Your plan</span>}
                        {o.green&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:500,background:"#f0faf0",color:"#4a9f4a"}}>🌱 Renewable</span>}
                        <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:500,background:o.type==="indexed"?"#fff8ee":"#eef4ff",color:o.type==="indexed"?"#bf8a4a":"#4a6abf"}}>{o.type==="indexed"?"Indexed":"Fixed"}</span>
                        {o.annualSaving>0&&<span style={{fontSize:12,fontWeight:700,color:"#6abf69"}}>Save {EUR(o.annualSaving)}/yr</span>}
                        {o.annualSaving<0&&<span style={{fontSize:12,fontWeight:700,color:"#e05a5a"}}>+{EUR(Math.abs(o.annualSaving))}/yr</span>}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button className="vw-ex" onClick={()=>toggle(o.id)}>{isOpen?"Less ▲":"Details ▾"}</button>
                        <button className="vw-sw" onClick={()=>window.open(o.contactUrl,"_blank")}>Switch →</button>
                      </div>
                    </div>
                    {isOpen&&(
                      <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid #f0ede6"}}>
                        {o.breakdown&&(()=>{
                          const{powerFixed:fixed,energyVariable:variable,taxes}=o.breakdown;
                          const total=fixed+variable+taxes;
                          return(<div style={{marginBottom:14}}>
                            <div style={{display:"flex",height:6,borderRadius:6,overflow:"hidden",gap:2,marginBottom:6}}>
                              <div style={{width:`${(fixed/total*100).toFixed(0)}%`,background:"#6abf69",borderRadius:"6px 0 0 6px"}}/>
                              <div style={{width:`${(variable/total*100).toFixed(0)}%`,background:"#f7a800"}}/>
                              <div style={{width:`${(taxes/total*100).toFixed(0)}%`,background:"#ccc",borderRadius:"0 6px 6px 0"}}/>
                            </div>
                            <div style={{display:"flex",gap:14,fontSize:11,color:"#888",flexWrap:"wrap"}}>
                              <span style={{color:"#3a7a3a"}}>⬤ Fixed {(fixed/total*100).toFixed(0)}% ({EUR2(fixed)})</span>
                              <span style={{color:"#a07000"}}>⬤ Energy {(variable/total*100).toFixed(0)}% ({EUR2(variable)})</span>
                              <span style={{color:"#999"}}>⬤ Taxes {(taxes/total*100).toFixed(0)}% ({EUR2(taxes)})</span>
                            </div>
                          </div>);
                        })()}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                          {[["Energy price",`${(o.commercialPricePerKwh*100).toFixed(3)} c€/kWh`],["Power/day",`${(o.commercialPowerPerDay).toFixed(4)} €/day`],["1st yr disc.",o.firstYearDiscount>0?`${(o.firstYearDiscount*100).toFixed(0)}%`:"—"],["Price type",o.type==="indexed"?"OMIE indexed":"Fixed"],["Green",o.green?"Yes (100%)":"No"],["Grid access","ERSE 2026"]].map(([l,v])=>(
                            <div key={l} style={{background:"#fafaf7",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:"#bbb",marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:600}}>{v}</div></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
 
            <div style={{fontSize:12,color:"#bbb",textAlign:"center",paddingTop:24,borderTop:"1px solid #f0ede6",marginTop:24,lineHeight:1.7}}>
              Calculations use 2026 ERSE tariffs (Diretiva n.º 1/2026).<br/>
              <a href="https://simuladorprecos.erse.pt/eletricidade/" target="_blank" rel="noopener" style={{color:"#6abf69"}}>ERSE official simulator</a> · Review contract terms before switching.
            </div>
            <button style={{...btnGhost,marginTop:16}} onClick={resetAll}>← Start a new comparison</button>
          </div>
        )}
      </div>
    </div>
  );
}
 
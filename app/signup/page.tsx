"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const POWERS = [1.15,2.3,3.45,4.6,5.75,6.9,10.35,13.8,17.25,20.7];
const SUPPLIERS = ["EDP","Endesa","Galp","Goldenergy","Iberdrola","Repsol","Plenitude","MUON","Other"];

const s = {
  body: { fontFamily:"'DM Sans','Helvetica Neue',Arial,sans-serif", background:"#FAFAF7", minHeight:"100vh", color:"#1a1a1a" } as React.CSSProperties,
  wrap: { maxWidth:560, margin:"0 auto", padding:"0 20px 80px" } as React.CSSProperties,
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"28px 0 24px", borderBottom:"1px solid #e8e6df", marginBottom:"40px" } as React.CSSProperties,
  logo: { fontSize:22, fontWeight:700, letterSpacing:"-0.02em", color:"#1a1a1a" } as React.CSSProperties,
  logoSpan: { color:"#6abf69" } as React.CSSProperties,
  badge: { fontSize:11, fontWeight:500, color:"#6abf69", background:"#f0faf0", border:"1px solid #c8e6c8", padding:"4px 12px", borderRadius:20 } as React.CSSProperties,
  card: { background:"white", border:"1px solid #e8e6df", borderRadius:20, padding:28, marginBottom:14 } as React.CSSProperties,
  cardTitle: { fontSize:11, fontWeight:600, color:"#bbb", textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:20 } as React.CSSProperties,
  title: { fontFamily:"Georgia,'Times New Roman',serif", fontSize:28, fontWeight:700, lineHeight:1.2, letterSpacing:"-0.02em", marginBottom:10 } as React.CSSProperties,
  sub: { fontSize:15, color:"#888", lineHeight:1.6, marginBottom:32 } as React.CSSProperties,
  formGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 } as React.CSSProperties,
  formFull: { gridColumn:"1 / -1" } as React.CSSProperties,
  label: { display:"block", fontSize:12, fontWeight:500, color:"#888", marginBottom:6 } as React.CSSProperties,
  input: { width:"100%", border:"1.5px solid #e8e6df", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"inherit", color:"#1a1a1a", background:"white", outline:"none", boxSizing:"border-box" as const } as React.CSSProperties,
  inputFocus: { borderColor:"#6abf69", boxShadow:"0 0 0 3px rgba(106,191,105,0.12)" } as React.CSSProperties,
  select: { width:"100%", border:"1.5px solid #e8e6df", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"inherit", color:"#1a1a1a", background:"white", outline:"none", boxSizing:"border-box" as const, appearance:"none" as const } as React.CSSProperties,
  btnPrimary: { width:"100%", padding:"16px 24px", background:"#1a1a1a", color:"white", border:"none", borderRadius:14, fontSize:15, fontWeight:600, fontFamily:"inherit", cursor:"pointer" } as React.CSSProperties,
  btnGhost: { width:"100%", padding:"13px 24px", background:"white", color:"#888", border:"1.5px solid #e8e6df", borderRadius:14, fontSize:14, fontWeight:500, fontFamily:"inherit", cursor:"pointer", marginTop:10 } as React.CSSProperties,
  error: { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#dc2626", marginBottom:16 } as React.CSSProperties,
  success: { textAlign:"center" as const, padding:"60px 0" } as React.CSSProperties,
  successIcon: { fontSize:56, marginBottom:20 } as React.CSSProperties,
  successTitle: { fontFamily:"Georgia,serif", fontSize:26, fontWeight:700, marginBottom:12 } as React.CSSProperties,
  successSub: { fontSize:15, color:"#888", lineHeight:1.6, marginBottom:32 } as React.CSSProperties,
  divider: { display:"flex", alignItems:"center", gap:12, margin:"24px 0" } as React.CSSProperties,
  dividerLine: { flex:1, height:1, background:"#e8e6df" } as React.CSSProperties,
  dividerText: { fontSize:12, color:"#bbb", fontWeight:500 } as React.CSSProperties,
  inviteWrap: { textAlign:"center" as const, marginBottom:40 } as React.CSSProperties,
  inviteInput: { width:"100%", border:"2px solid #e8e6df", borderRadius:14, padding:"16px 20px", fontSize:18, fontFamily:"inherit", color:"#1a1a1a", background:"white", outline:"none", boxSizing:"border-box" as const, textAlign:"center" as const, letterSpacing:"0.05em" } as React.CSSProperties,
};

type Stage = "code" | "form" | "success";

export default function SignupPage() {
  const router = useRouter();
  const [stage,     setStage]     = useState<Stage>("code");
  const [code,      setCode]      = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [form,      setForm]      = useState({
    name:"", email:"", phone:"", nif:"", iban:"", cpe:"", address:"",
    currentSupplier:"", currentPlan:"", monthlyKwh:"", monthlyCost:"", powerKva:"6.9",
  });

  function set(field: string, value: string) {
    setForm(f => ({...f, [field]: value}));
  }

  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim()) { setError("Please enter your invite code."); return; }
    // We'll validate the code server-side on submit, but do a quick check here
    setStage("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Basic validation
    const required = ["name","email","phone","nif","iban","cpe","address","currentSupplier","currentPlan","monthlyKwh","monthlyCost"];
    for (const field of required) {
      if (!form[field as keyof typeof form].trim()) {
        setError(`Please fill in all required fields.`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode:      code,
          name:            form.name,
          email:           form.email,
          phone:           form.phone,
          nif:             form.nif,
          iban:            form.iban,
          cpe:             form.cpe,
          address:         form.address,
          currentSupplier: form.currentSupplier,
          currentPlan:     form.currentPlan,
          monthlyKwh:      parseFloat(form.monthlyKwh),
          monthlyCost:     parseFloat(form.monthlyCost),
          powerKva:        parseFloat(form.powerKva),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "Invalid invite code") {
          setStage("code");
          setError("Invalid invite code. Please check and try again.");
        } else {
          setError(json.error ?? "Something went wrong. Please try again.");
        }
        return;
      }
      // Save email to localStorage so main app can pre-fill
      localStorage.setItem("voltwise_user_email", form.email);
      setStage("success");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        select{-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23aaa' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px !important;}
        input::placeholder{color:#ccc;}
      `}</style>

      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}>Voltwise<span style={s.logoSpan}>.</span></div>
          <div style={s.badge}>Early access</div>
        </div>

        {/* STAGE 1 — Invite code */}
        {stage==="code" && (
          <form onSubmit={handleCode}>
            <h1 style={s.title}>You&apos;re invited to<br/>Voltwise Agent</h1>
            <p style={s.sub}>Enter your invite code to set up your personal electricity switching agent. It monitors the market monthly and alerts you when it&apos;s worth switching.</p>

            {error && <div style={s.error}>{error}</div>}

            <div style={{marginBottom:24}}>
              <label style={{...s.label, fontSize:13, marginBottom:10}}>Invite code</label>
              <input
                style={s.inviteInput}
                type="text"
                placeholder="Enter your code"
                value={code}
                onChange={e=>setCode(e.target.value)}
                autoFocus
              />
            </div>

            <button type="submit" style={s.btnPrimary}>Continue →</button>
            <button type="button" style={s.btnGhost} onClick={()=>router.push("/")}>← Back to Voltwise</button>
          </form>
        )}

        {/* STAGE 2 — Details form */}
        {stage==="form" && (
          <form onSubmit={handleSubmit}>
            <h1 style={{...s.title, fontSize:22, marginBottom:8}}>Set up your agent</h1>
            <p style={{...s.sub, marginBottom:24}}>Your details are stored securely and used only to monitor your electricity plan and draft switching emails on your behalf.</p>

            {error && <div style={s.error}>{error}</div>}

            {/* Personal details */}
            <div style={s.card}>
              <div style={s.cardTitle}>Personal details</div>
              <div style={s.formGrid}>
                <div style={s.formFull}>
                  <label style={s.label}>Full name</label>
                  <input style={s.input} type="text" placeholder="Eduardo Cary" value={form.name} onChange={e=>set("name",e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Email address</label>
                  <input style={s.input} type="email" placeholder="you@email.com" value={form.email} onChange={e=>set("email",e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Phone (WhatsApp)</label>
                  <input style={s.input} type="tel" placeholder="+351 912 345 678" value={form.phone} onChange={e=>set("phone",e.target.value)}/>
                </div>
                <div style={s.formFull}>
                  <label style={s.label}>Address</label>
                  <input style={s.input} type="text" placeholder="Rua Exemplo, 123, 1000-001 Lisboa" value={form.address} onChange={e=>set("address",e.target.value)}/>
                </div>
              </div>
            </div>

            {/* Banking & identity */}
            <div style={s.card}>
              <div style={s.cardTitle}>Identity & banking</div>
              <div style={{fontSize:12,color:"#aaa",marginBottom:16,lineHeight:1.6}}>
                Required to draft the switching email to your new supplier. Stored encrypted and never shared.
              </div>
              <div style={s.formGrid}>
                <div>
                  <label style={s.label}>NIF</label>
                  <input style={s.input} type="text" placeholder="123456789" maxLength={9} value={form.nif} onChange={e=>set("nif",e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>CPE (meter number)</label>
                  <input style={s.input} type="text" placeholder="PT00020002000..." value={form.cpe} onChange={e=>set("cpe",e.target.value)}/>
                </div>
                <div style={s.formFull}>
                  <label style={s.label}>IBAN</label>
                  <input style={s.input} type="text" placeholder="PT50 0000 0000 0000 0000 0000 0" value={form.iban} onChange={e=>set("iban",e.target.value)}/>
                </div>
              </div>
            </div>

            {/* Current plan */}
            <div style={s.card}>
              <div style={s.cardTitle}>Your current electricity plan</div>
              <div style={s.formGrid}>
                <div>
                  <label style={s.label}>Current supplier</label>
                  <select style={s.select} value={form.currentSupplier} onChange={e=>set("currentSupplier",e.target.value)}>
                    <option value="">Select…</option>
                    {SUPPLIERS.map(sup=><option key={sup}>{sup}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Current plan name</label>
                  <input style={s.input} type="text" placeholder="e.g. Plano Combina" value={form.currentPlan} onChange={e=>set("currentPlan",e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Monthly consumption (kWh)</label>
                  <input style={s.input} type="number" placeholder="e.g. 239" value={form.monthlyKwh} onChange={e=>set("monthlyKwh",e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Monthly bill total (€)</label>
                  <input style={s.input} type="number" placeholder="e.g. 69.23" step="0.01" value={form.monthlyCost} onChange={e=>set("monthlyCost",e.target.value)}/>
                </div>
                <div>
                  <label style={s.label}>Contracted power</label>
                  <select style={s.select} value={form.powerKva} onChange={e=>set("powerKva",e.target.value)}>
                    {POWERS.map(p=><option key={p} value={p}>{p} kVA</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? "Setting up your agent…" : "Set up my agent →"}
            </button>
            <button type="button" style={s.btnGhost} onClick={()=>setStage("code")}>← Back</button>
          </form>
        )}

        {/* STAGE 3 — Success */}
        {stage==="success" && (
          <div style={s.success}>
            <div style={s.successIcon}>🎉</div>
            <h2 style={s.successTitle}>You&apos;re all set, {form.name.split(" ")[0]}!</h2>
            <p style={s.successSub}>
              Your agent is active. Every month it will check the market and send you a WhatsApp alert if there&apos;s a better deal waiting for you.
            </p>
            <button style={s.btnPrimary} onClick={()=>router.push("/")}>
              Go to Voltwise →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

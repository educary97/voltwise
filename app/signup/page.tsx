"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const POWERS    = [1.15, 2.3, 3.45, 4.6, 5.75, 6.9, 10.35, 13.8, 17.25, 20.7];
const SUPPLIERS = ["EDP", "Endesa", "Galp", "Goldenergy", "Iberdrola", "Repsol", "Plenitude", "MUON", "Other"];

const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e8e6df", borderRadius: 10, padding: "11px 14px", fontSize: 14, fontFamily: "inherit", color: "#1a1a1a", background: "white", outline: "none", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };

export default function SignupPage() {
  const router  = useRouter();
  const [stage,   setStage]   = useState<"code" | "step1" | "step2" | "step3" | "success">("code");
  const [code,    setCode]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState({
    name: "", email: "", phone: "", address: "",
    nif: "", iban: "", cpe: "",
    currentSupplier: "", currentPlan: "", monthlyKwh: "", monthlyCost: "", powerKva: "6.9",
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const STEPS = ["code", "step1", "step2", "step3", "success"];
  const stepIndex = STEPS.indexOf(stage);
  const progress  = stage === "success" ? 100 : (stepIndex / 4) * 100;

  async function handleSubmit() {
    setError("");
    const required = ["name", "email", "phone", "nif", "iban", "cpe", "address", "currentSupplier", "currentPlan", "monthlyKwh", "monthlyCost"];
    for (const f of required) {
      if (!form[f as keyof typeof form].trim()) { setError("Please fill in all required fields."); return; }
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/signup", {
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
        if (json.error === "Invalid invite code") { setStage("code"); setError("Invalid invite code."); }
        else setError(json.error ?? "Something went wrong.");
        return;
      }
      localStorage.setItem("voltwise_user_email", form.email);
      setStage("success");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", background: "#FAFAF7", minHeight: "100vh", color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        select{-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23aaa' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px !important;}
        input::placeholder,textarea::placeholder{color:#ccc;}
        .vw-pill-kva{padding:8px 12px;border:1.5px solid #e8e6df;border-radius:10px;font-size:13px;font-weight:500;background:white;cursor:pointer;transition:all 0.15s;color:#888;font-family:inherit;white-space:nowrap;}
        .vw-pill-kva.active{background:#1a1a1a;border-color:#1a1a1a;color:white;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        .vw-fade{animation:fadeIn 0.3s ease forwards;}
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0 20px", borderBottom: "1px solid #e8e6df", marginBottom: "32px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Voltwise<span style={{ color: "#6abf69" }}>.</span></div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#6abf69", background: "#f0faf0", border: "1px solid #c8e6c8", padding: "4px 12px", borderRadius: 20 }}>Early access</div>
        </div>

        {/* Progress bar — only shown during form steps */}
        {["step1", "step2", "step3"].includes(stage) && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 8 }}>
              {[["step1", "1 · Personal"], ["step2", "2 · Identity"], ["step3", "3 · Your plan"]].map(([s, l]) => (
                <span key={s} style={{ fontWeight: stage === s ? 600 : 400, color: stage === s ? "#1a1a1a" : "#bbb" }}>{l}</span>
              ))}
            </div>
            <div style={{ height: 4, background: "#e8e6df", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#6abf69", borderRadius: 4, width: `${progress}%`, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {/* ── CODE ── */}
        {stage === "code" && (
          <div className="vw-fade">
            <h1 style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 10 }}>
              You&apos;re invited to<br />Voltwise Agent
            </h1>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
              Your personal electricity switching agent — monitors the market monthly and alerts you when it&apos;s worth switching.
            </p>

            {/* Feature bullets */}
            <div style={{ background: "white", border: "1px solid #e8e6df", borderRadius: 16, padding: 20, marginBottom: 28 }}>
              {[
                ["⚡", "Monthly market scan", "Checks all 15 Portuguese suppliers every month"],
                ["📱", "WhatsApp + email alert", "You get a summary and an approval link"],
                ["✅", "You stay in control", "Nothing is sent until you approve it"],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #f0ede6" }} >
                  <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{desc}</div>
                  </div>
                </div>
              )).map((el, i, arr) => i === arr.length - 1 ? <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>{(el as any).props.children}</div> : el)}
            </div>

            {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#dc2626", marginBottom: 16 }}>{error}</div>}

            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#888", marginBottom: 10 }}>Enter your invite code</label>
            <input
              style={{ ...inp, fontSize: 18, textAlign: "center", letterSpacing: "0.05em", border: "2px solid #e8e6df", borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}
              type="text" placeholder="your-invite-code" value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && code.trim()) setStage("step1"); }}
              autoFocus
            />
            <button style={{ width: "100%", padding: "15px 24px", background: "#1a1a1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
              onClick={() => { if (!code.trim()) { setError("Please enter your invite code."); return; } setError(""); setStage("step1"); }}>
              Continue →
            </button>
            <button style={{ width: "100%", padding: "13px", background: "white", color: "#888", border: "1.5px solid #e8e6df", borderRadius: 14, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", marginTop: 10 }}
              onClick={() => router.push("/")}>
              ← Back to Voltwise
            </button>
          </div>
        )}

        {/* ── STEP 1 — Personal ── */}
        {stage === "step1" && (
          <div className="vw-fade">
            <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Personal details</h2>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>Used to personalise your WhatsApp alerts and draft switching emails.</p>

            {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#dc2626", marginBottom: 16 }}>{error}</div>}

            <div style={{ display: "grid", gap: 14 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>Full name</label>
                <input style={inp} type="text" placeholder="Eduardo Cary" value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>Email</label>
                  <input style={inp} type="email" placeholder="you@email.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>WhatsApp number</label>
                  <input style={inp} type="tel" placeholder="+351 912 345 678" value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
              </div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>Address</label>
                <input style={inp} type="text" placeholder="Rua Exemplo, 123, 1000-001 Lisboa" value={form.address} onChange={e => set("address", e.target.value)} /></div>
            </div>

            <button style={{ width: "100%", padding: "15px 24px", background: "#1a1a1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginTop: 24 }}
              onClick={() => { if (!form.name || !form.email || !form.phone || !form.address) { setError("Please fill in all fields."); return; } setError(""); setStage("step2"); }}>
              Continue →
            </button>
            <button style={{ width: "100%", padding: "13px", background: "white", color: "#888", border: "1.5px solid #e8e6df", borderRadius: 14, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", marginTop: 10 }}
              onClick={() => setStage("code")}>← Back</button>
          </div>
        )}

        {/* ── STEP 2 — Sensitive ── */}
        {stage === "step2" && (
          <div className="vw-fade">
            <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Identity & banking</h2>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>Required to pre-fill the switching email to your new supplier.</p>

            {/* Security reassurance */}
            <div style={{ background: "#f0faf0", border: "1px solid #c8e6c8", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20, fontSize: 13, color: "#3a7a3a" }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <span>Stored securely. <strong>Never shared with third parties.</strong> Only used to draft the email you review and approve before anything is sent.</span>
            </div>

            {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#dc2626", marginBottom: 16 }}>{error}</div>}

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>NIF 🔒</label>
                  <input style={inp} type="text" placeholder="123456789" maxLength={9} value={form.nif} onChange={e => set("nif", e.target.value)} /></div>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>CPE (meter number) 🔒</label>
                  <input style={inp} type="text" placeholder="PT00020002000…" value={form.cpe} onChange={e => set("cpe", e.target.value)} /></div>
              </div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>IBAN 🔒</label>
                <input style={inp} type="text" placeholder="PT50 0000 0000 0000 0000 0000 0" value={form.iban} onChange={e => set("iban", e.target.value)} /></div>
            </div>

            <div style={{ fontSize: 12, color: "#aaa", marginTop: 12, lineHeight: 1.6 }}>
              Your CPE is on your electricity bill — it starts with "PT" and is about 20 characters long.
            </div>

            <button style={{ width: "100%", padding: "15px 24px", background: "#1a1a1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginTop: 24 }}
              onClick={() => { if (!form.nif || !form.iban || !form.cpe) { setError("Please fill in all fields."); return; } setError(""); setStage("step3"); }}>
              Continue →
            </button>
            <button style={{ width: "100%", padding: "13px", background: "white", color: "#888", border: "1.5px solid #e8e6df", borderRadius: 14, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", marginTop: 10 }}
              onClick={() => setStage("step1")}>← Back</button>
          </div>
        )}

        {/* ── STEP 3 — Electricity plan ── */}
        {stage === "step3" && (
          <div className="vw-fade">
            <h2 style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Your electricity plan</h2>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>The agent uses this as the baseline to find better deals.</p>

            {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#dc2626", marginBottom: 16 }}>{error}</div>}

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>Current supplier</label>
                  <select style={sel} value={form.currentSupplier} onChange={e => set("currentSupplier", e.target.value)}>
                    <option value="">Select…</option>
                    {SUPPLIERS.map(s => <option key={s}>{s}</option>)}
                  </select></div>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>Plan name</label>
                  <input style={inp} type="text" placeholder="e.g. Plano Combina" value={form.currentPlan} onChange={e => set("currentPlan", e.target.value)} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>Monthly kWh</label>
                  <input style={inp} type="number" placeholder="e.g. 239" value={form.monthlyKwh} onChange={e => set("monthlyKwh", e.target.value)} /></div>
                <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 6 }}>Monthly bill (€)</label>
                  <input style={inp} type="number" step="0.01" placeholder="e.g. 69.23" value={form.monthlyCost} onChange={e => set("monthlyCost", e.target.value)} /></div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 8 }}>Contracted power</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {POWERS.map(p => (
                    <button key={p} className={`vw-pill-kva${form.powerKva === String(p) ? " active" : ""}`} onClick={() => set("powerKva", String(p))}>{p} kVA</button>
                  ))}
                </div>
              </div>
            </div>

            <button style={{ width: "100%", padding: "15px 24px", background: "#1a1a1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer", marginTop: 24, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit} disabled={loading}>
              {loading ? "Setting up your agent…" : "Activate my agent →"}
            </button>
            <button style={{ width: "100%", padding: "13px", background: "white", color: "#888", border: "1.5px solid #e8e6df", borderRadius: 14, fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", marginTop: 10 }}
              onClick={() => setStage("step2")}>← Back</button>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {stage === "success" && (
          <div className="vw-fade" style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontFamily: "Georgia,serif", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>You&apos;re all set, {form.name.split(" ")[0]}!</h2>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.7, marginBottom: 32, maxWidth: 380, margin: "0 auto 32px" }}>
              Your agent is active. Every month it will check the market and send you a WhatsApp + email alert if there&apos;s a better deal waiting for you.
            </p>
            {/* What happens next */}
            <div style={{ background: "white", border: "1px solid #e8e6df", borderRadius: 16, padding: 20, textAlign: "left", marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>What happens next</div>
              {[
                ["📅", "1st of each month", "The agent scans all 15 suppliers"],
                ["📱", "If savings found", "You get a WhatsApp + email with the best offer"],
                ["✅", "You decide", "Review the draft email and tap confirm to switch"],
              ].map(([icon, title, desc], i, arr) => (
                <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? "1px solid #f0ede6" : "none" }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button style={{ width: "100%", padding: "15px 24px", background: "#1a1a1a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
              onClick={() => router.push("/")}>
              Go to Voltwise →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

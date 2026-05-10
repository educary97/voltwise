"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

function ApprovePageInner() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");
  const sig  = searchParams.get("sig");

  const [status,      setStatus]      = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [draft,       setDraft]       = useState<{ subject: string; body: string; to: string } | null>(null);
  const [draftLoading,setDraftLoading]= useState(true);
  const [draftOpen,   setDraftOpen]   = useState(false);

  let payload: any = null;
  if (data) {
    try { payload = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/"))); } catch {}
  }

  useEffect(() => {
    if (!data || !sig) { setDraftLoading(false); return; }
    fetch("/api/agent/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, sig }),
    })
      .then(r => r.json())
      .then(json => { setDraft(json.draft); setDraftLoading(false); })
      .catch(() => setDraftLoading(false));
  }, [data, sig]);

  async function handleConfirm() {
    setStatus("sending");
    setErrorMsg("");
    try {
      const res  = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, sig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unknown error");
      setStatus("sent");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }

  if (!data || !sig)  return <ErrorState message="Link inválido. Por favor verifica o WhatsApp e tenta novamente." />;
  if (!payload)       return <ErrorState message="Não foi possível carregar os dados." />;

  const { comparison, createdAt } = payload;
  const created = new Date(createdAt);

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", background: "#FAFAF7", minHeight: "100vh", color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .vw-fade{animation:fadeIn 0.4s ease forwards;}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #e8e6df", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#f5c842,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Voltwise</div>
          <div style={{ fontSize: 12, color: "#aaa" }}>Aprovação de mudança de fornecedor</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#bbb" }}>
          {created.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 80px" }}>
        {status === "sent" ? (
          <SuccessState sentTo={draft?.to ?? ""} supplier={comparison.bestSupplier} />
        ) : (
          <div className="vw-fade">
            {/* Savings hero */}
            <div style={{ background: "#1a1a1a", borderRadius: 20, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Poupança potencial</div>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 52, fontWeight: 700, color: "#6abf69", lineHeight: 1, marginBottom: 6 }}>
                €{Number(comparison.savingsPerYear).toFixed(0)}/ano
              </div>
              <div style={{ fontSize: 14, color: "#555", marginBottom: 18 }}>mudando para <span style={{ color: "#6abf69", fontWeight: 600 }}>{comparison.bestSupplier}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>Pagas agora</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "white" }}>€{Number(comparison.currentMonthlyCost).toFixed(2)}/mês</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>Melhor oferta</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "white" }}>€{Number(comparison.estimatedMonthlyEur).toFixed(2)}/mês</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{comparison.bestSupplier} · {comparison.bestPlan}</div>
                </div>
              </div>
            </div>

            {/* Monthly saving pill */}
            <div style={{ background: "#f0faf0", border: "1px solid #c8e6c8", borderRadius: 12, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, fontSize: 14 }}>
              <span style={{ color: "#3a7a3a" }}>💰 Poupança mensal</span>
              <strong style={{ color: "#3a7a3a", fontSize: 16 }}>€{Number(comparison.savingsPerMonth).toFixed(2)}/mês</strong>
            </div>

            {/* Draft email — collapsible */}
            <div style={{ background: "white", border: "1px solid #e8e6df", borderRadius: 16, marginBottom: 20, overflow: "hidden" }}>
              <button
                style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit" }}
                onClick={() => setDraftOpen(!draftOpen)}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>📧 Rascunho do email</div>
                  {draft && <div style={{ fontSize: 12, color: "#aaa" }}>Para: {draft.to}</div>}
                  {draftLoading && <div style={{ fontSize: 12, color: "#aaa" }}>A gerar rascunho…</div>}
                </div>
                <span style={{ fontSize: 16, color: "#aaa" }}>{draftOpen ? "▲" : "▾"}</span>
              </button>

              {draftOpen && (
                <div style={{ borderTop: "1px solid #f0ede6" }}>
                  {draftLoading ? (
                    <div style={{ padding: 20, color: "#aaa", fontSize: 14 }}>A gerar rascunho com IA…</div>
                  ) : draft ? (
                    <>
                      <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0ede6", fontSize: 13 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                          <span style={{ color: "#bbb", minWidth: 50 }}>Para:</span>
                          <span style={{ color: "#f5c842" }}>{draft.to}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ color: "#bbb", minWidth: 50 }}>Assunto:</span>
                          <span>{draft.subject}</span>
                        </div>
                      </div>
                      <div style={{ padding: 20, fontFamily: "Georgia,serif", fontSize: 14, lineHeight: 1.7, color: "#555", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
                        {draft.body}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: 20, color: "#aaa", fontSize: 14 }}>Não foi possível gerar o rascunho.</div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {status === "error" && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#dc2626" }}>
                ❌ Erro ao enviar: {errorMsg}
              </div>
            )}

            {/* Confirm — full width and prominent */}
            <button
              onClick={handleConfirm}
              disabled={status === "sending"}
              style={{ width: "100%", padding: "16px 24px", background: status === "sending" ? "#3a7a3a" : "#16a34a", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: status === "sending" ? "not-allowed" : "pointer", marginBottom: 12 }}
            >
              {status === "sending" ? "A enviar…" : "✓ Confirmar e enviar email"}
            </button>

            {/* Cancel as text link */}
            <button onClick={() => window.close()} style={{ display: "block", width: "100%", textAlign: "center", padding: "10px", background: "none", border: "none", fontSize: 14, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>

            <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 4, lineHeight: 1.6 }}>
              Ao confirmar, o email será enviado para {draft?.to ?? comparison.bestSupplier}.<br />
              O novo fornecedor trata da rescisão do teu contrato atual.
            </div>

            {/* What happens next */}
            <div style={{ background: "white", border: "1px solid #e8e6df", borderRadius: 16, padding: 20, marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>O que acontece a seguir</div>
              {[
                ["📨", "Email enviado ao fornecedor", "O pedido de adesão vai para " + comparison.bestSupplier],
                ["⚙️", "Eles tratam de tudo", "Rescisão do contrato atual incluída — sem interrupção"],
                ["✅", "Mudança ativa em ~5 dias úteis", "Recebes confirmação por email"],
              ].map(([icon, title, desc], i, arr) => (
                <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? "1px solid #f0ede6" : "none" }}>
                  <div style={{ fontSize: 18, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessState({ sentTo, supplier }: { sentTo: string; supplier: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }} className="vw-fade">
      <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
      <h2 style={{ fontFamily: "Georgia,serif", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Email enviado!</h2>
      <p style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 28px" }}>
        O pedido foi enviado para <strong style={{ color: "#1a1a1a" }}>{sentTo}</strong>.<br />
        O {supplier} irá tratar da rescisão do teu contrato atual.<br />
        O processo demora aproximadamente 5 dias úteis.
      </p>
      <div style={{ background: "#f0faf0", border: "1px solid #c8e6c8", borderRadius: 12, padding: "14px 20px", fontSize: 14, color: "#3a7a3a", maxWidth: 320, margin: "0 auto" }}>
        💡 O agente continua ativo e irá monitorizar o mercado todos os meses.
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <p style={{ color: "#888", fontSize: 15 }}>{message}</p>
    </div>
  );
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<div style={{ background: "#FAFAF7", minHeight: "100vh" }} />}>
      <ApprovePageInner />
    </Suspense>
  );
}

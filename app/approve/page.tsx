"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ApprovePageInner() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");
  const sig = searchParams.get("sig");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  let payload: any = null;
  let decodeError = "";
  if (data) {
    try {
      payload = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      decodeError = "Could not decode approval link. It may be corrupted.";
    }
  }

  async function handleConfirm() {
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/agent/approve", {
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

  if (!data || !sig) return <ErrorState message="Link inválido." />;
  if (decodeError) return <ErrorState message={decodeError} />;
  if (!payload) return <ErrorState message="Não foi possível carregar os dados." />;

  const { email, comparison, createdAt } = payload;
  const created = new Date(createdAt);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e8f0" }}>
      <div style={{ borderBottom: "1px solid #1e1e2e", padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #f5c842 0%, #f59e0b 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Voltwise</div>
          <div style={{ fontSize: 12, color: "#666" }}>Aprovação de mudança de fornecedor</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>
          {created.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
        {status === "sent" ? (
          <SuccessState sentTo={email.to} supplier={comparison.bestSupplier} />
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Oportunidade de poupança encontrada</h1>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>O agente Voltwise analisou o mercado e encontrou uma oferta melhor. Revê o resumo e confirma para enviar o pedido de mudança.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Card label="Plano atual" value={`€${Number(comparison.currentMonthlyCost).toFixed(2)}/mês`} sub="Fornecedor atual" accent="#ef4444" />
              <Card label={comparison.bestSupplier} value={`€${Number(comparison.estimatedMonthlyEur).toFixed(2)}/mês`} sub={comparison.bestPlan} accent="#22c55e" />
            </div>

            <div style={{ background: "linear-gradient(135deg, #0d2e1a 0%, #0a2010 100%)", border: "1px solid #1a5c30", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 13, color: "#4ade80", marginBottom: 2 }}>💰 Poupança potencial</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>€{Number(comparison.savingsPerMonth).toFixed(2)}/mês</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 2 }}>Por ano</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#86efac" }}>€{Number(comparison.savingsPerYear).toFixed(2)}</div>
              </div>
            </div>

            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "#aaa" }}>📧 RASCUNHO DO EMAIL</h2>
            <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e2e", fontSize: 13 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "#555", minWidth: 50 }}>Para:</span>
                  <span style={{ color: "#f5c842" }}>{email.to}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#555", minWidth: 50 }}>Assunto:</span>
                  <span style={{ color: "#e8e8f0" }}>{email.subject}</span>
                </div>
              </div>
              <div style={{ padding: "20px", fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.7, color: "#ccc", whiteSpace: "pre-wrap" }}>
                {email.body}
              </div>
            </div>

            {status === "error" && (
              <div style={{ background: "#2d0d0d", border: "1px solid #7f1d1d", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#fca5a5" }}>
                ❌ Erro ao enviar: {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleConfirm} disabled={status === "sending"}
                style={{ flex: 1, padding: "14px 24px", background: status === "sending" ? "#1a3a22" : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: status === "sending" ? "not-allowed" : "pointer" }}>
                {status === "sending" ? "A enviar..." : "✓ Confirmar e enviar email"}
              </button>
              <button onClick={() => window.close()}
                style={{ padding: "14px 20px", background: "transparent", color: "#666", border: "1px solid #2a2a3a", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#444", marginTop: 16, textAlign: "center" }}>
              Ao confirmar, o email será enviado em teu nome para {email.to}. O novo fornecedor trata da rescisão do contrato atual.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1e1e2e", borderRadius: 12, padding: "16px" }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#555" }}>{sub}</div>
    </div>
  );
}

function SuccessState({ sentTo, supplier }: { sentTo: string; supplier: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Email enviado!</h2>
      <p style={{ color: "#888", fontSize: 15, lineHeight: 1.6 }}>
        O pedido de mudança foi enviado para <strong style={{ color: "#f5c842" }}>{sentTo}</strong>.<br />
        O {supplier} irá tratar da rescisão do teu contrato atual.<br />
        O processo demora aproximadamente 5 dias úteis.
      </p>
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
    <Suspense fallback={<div style={{ background: "#0a0a0f", minHeight: "100vh" }} />}>
      <ApprovePageInner />
    </Suspense>
  );
}
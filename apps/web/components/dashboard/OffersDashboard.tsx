"use client";
// apps/web/components/dashboard/OffersDashboard.tsx

import { useState } from "react";
import type { CalculatedOffer } from "@voltwise/erse-client/tariff-calculator";

const EUR = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const EUR2 = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

const PROVIDER_COLORS: Record<string, string> = {
  EDP: "#003c8f", Endesa: "#00a651", Galp: "#e30613",
  Goldenergy: "#f7a800", Iberdrola: "#3b8a29", Repsol: "#ff6600",
  Plenitude: "#5c2d91", MUON: "#0ea5e9",
};

interface Props {
  offers: CalculatedOffer[];
  summary: {
    currentAnnualCost: number;
    bestAnnualCost: number;
    potentialSaving: number;
    savingPercent: number;
    bestProvider: string;
    bestOfferName: string;
  };
  recommendation: string;
  currentSupplier?: string;
  currentMonthlyBill: number;
}

type Filter = "all" | "green" | "fixed" | "indexed";

export function OffersDashboard({ offers, summary, recommendation, currentSupplier, currentMonthlyBill }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const filtered = offers.filter((o) => {
    if (filter === "green")   return o.green;
    if (filter === "fixed")   return o.type === "fixed";
    if (filter === "indexed") return o.type === "indexed";
    return true;
  });

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current annual cost</div>
          <div className="text-2xl font-semibold">{EUR(summary.currentAnnualCost)}</div>
          <div className="text-xs text-gray-400 mt-1">{currentSupplier ?? "Current supplier"}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Best offer / year</div>
          <div className="text-2xl font-semibold text-green-700">{EUR(summary.bestAnnualCost)}</div>
          <div className="text-xs text-gray-400 mt-1">{summary.bestProvider} — {summary.bestOfferName}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Potential saving</div>
          <div className="text-2xl font-semibold">{EUR(summary.potentialSaving)}</div>
          <div className="text-xs text-gray-400 mt-1">{summary.savingPercent.toFixed(0)}% reduction</div>
        </div>
      </div>

      {/* Current bill bar */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm text-amber-800">
        <div>
          <strong>Current plan:</strong> {currentSupplier ?? "Current supplier"} ·{" "}
          {EUR2(currentMonthlyBill)}/month · {EUR(currentMonthlyBill * 12)}/year
        </div>
        <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-semibold">current</span>
      </div>

      {/* Claude recommendation */}
      {recommendation && (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Claude&apos;s recommendation
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700">
            {recommendation}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-xs text-gray-400">Filter:</span>
        {(["all", "green", "fixed", "indexed"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "px-3 py-1.5 rounded-full text-xs border transition-colors",
              filter === f
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400",
            ].join(" ")}
          >
            {f === "green" ? "🌱 Green energy" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Offer list */}
      <div className="space-y-2">
        {filtered.map((o, i) => {
          const isBest = i === 0 && o.annualSaving > 0;
          const isCur  = currentSupplier?.toLowerCase() === o.provider.toLowerCase();
          const bg     = PROVIDER_COLORS[o.provider] ?? "#374151";
          const lbl    = o.provider.slice(0, 3).toUpperCase();
          const isOpen = expanded.has(o.id);

          return (
            <div
              key={o.id}
              onClick={() => toggle(o.id)}
              className={[
                "border rounded-xl p-4 cursor-pointer transition-colors grid grid-cols-[1fr_auto] gap-3 items-start",
                isBest ? "border-2 border-green-500 bg-green-50" :
                isCur  ? "border-2 border-amber-400 bg-amber-50" :
                "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: bg }}
                  >
                    {lbl}
                  </div>
                  <div>
                    <div className="text-sm font-medium leading-tight">
                      {isBest && <span className="inline text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-semibold mr-1.5">Best deal</span>}
                      {isCur  && <span className="inline text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-semibold mr-1.5">current</span>}
                      {o.name}
                    </div>
                    <div className="text-xs text-gray-400">{o.provider}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {o.tags.map((t) => (
                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.green && t.includes("renewable") ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t}</span>
                  ))}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.type === "indexed" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    {o.type === "indexed" ? "indexed price" : "fixed price"}
                  </span>
                </div>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        ["Energy price", `${(o.pricePerKwh * 100).toFixed(3)} c€/kWh`],
                        ["Fixed charge", o.fixedMonthly > 0 ? `${EUR2(o.fixedMonthly)}/mo` : "included"],
                        ["1st year discount", o.firstYearDiscount > 0 ? `${(o.firstYearDiscount * 100).toFixed(0)}%` : "—"],
                        ["Price type", o.type === "indexed" ? "OMIE indexed" : "Fixed"],
                        ["Green energy", o.green ? "Yes (100%)" : "No"],
                        ["Data source", "ERSE official"],
                      ].map(([l, v]) => (
                        <div key={l} className="bg-gray-50 rounded-lg p-2">
                          <div className="text-[10px] text-gray-400 mb-0.5">{l}</div>
                          <div className="text-xs font-medium">{v}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(o.contactUrl, "_blank"); }}
                      className="text-xs bg-gray-900 text-white px-3 py-2 rounded-lg font-medium hover:bg-gray-700"
                    >
                      Switch to {o.provider} →
                    </button>
                  </div>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xl font-semibold">{EUR2(o.monthlyEstimate)}<span className="text-xs font-normal text-gray-400">/mo</span></div>
                <div className="text-xs text-gray-400 mt-0.5">{EUR(o.annualEstimate)}/year</div>
                {o.annualSaving !== 0 && (
                  <div className={`text-xs font-semibold mt-1 ${o.annualSaving > 0 ? "text-green-600" : "text-red-600"}`}>
                    {o.annualSaving > 0 ? "+" : ""}{EUR(o.annualSaving)}/yr
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center pt-4 border-t border-gray-100 leading-relaxed">
        Data from the{" "}
        <a href="https://simuladorprecos.erse.pt/eletricidade/" target="_blank" rel="noopener" className="text-green-600">
          ERSE official simulator
        </a>. Estimates based on supplier-declared data. Actual savings may vary. Review contract terms before switching.
      </p>
    </div>
  );
}

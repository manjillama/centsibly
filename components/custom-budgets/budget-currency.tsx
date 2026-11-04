"use client";
import { useState } from "react";
import { IBudget } from "@/interfaces/IBudget";
import api from "@/utils/api";
import CurrencySelect from "../currency-select";

export default function BudgetCurrency({ budgetId, currency, onSaved }: {
  budgetId: string;
  currency: string;
  onSaved: (budget: IBudget) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(nextCurrency: string) {
    if (saving || nextCurrency === currency) return;
    setSaving(true);
    setError("");
    setSaved(false);
    const response = await api.put<IBudget>(`/api/budgets/${budgetId}`, { currency: nextCurrency }, "PATCH");
    if (response.status === "success") {
      onSaved(response.data);
      setSaved(true);
    } else setError(response.message);
    setSaving(false);
  }

  return <>
    <div className="flex flex-wrap items-center gap-3">
      <div className="max-w-full sm:max-w-[260px]">
        <CurrencySelect id="custom-budget-currency" value={currency} disabled={saving} onChange={save} />
      </div>
      <span className="text-xs text-neutral-400">Separate from monthly budget · All dates</span>
      {saving && <span role="status" className="text-xs text-neutral-400">Saving…</span>}
    </div>
    {error && <p role="alert" className="text-red-400 mt-2">{error}</p>}
    {saved && <div className="flex items-start justify-between gap-3 rounded-lg bg-sky-600/10 px-3 py-2 mt-2">
      <p role="status" className="text-xs text-sky-300">{currency} now applies to all existing and future transactions in this budget. Amounts and the spending target stay unchanged; no conversion is applied.</p>
      <button type="button" onClick={() => setSaved(false)} aria-label="Dismiss currency update" className="text-neutral-400 hover:text-white">×</button>
    </div>}
  </>;
}

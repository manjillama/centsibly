"use client";
import { useEffect, useState } from "react";
import BudgetContainer from "./budget-container";
import CustomBudgets from "./custom-budgets";
import CurrencySelect from "./currency-select";
import api from "@/utils/api";

type CurrencySettings = { currency: string; needsSetup: boolean };
export default function BudgetWorkspace() {
  const [view, setView] = useState("monthly");
  const [settings, setSettings] = useState<CurrencySettings | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    api.get<CurrencySettings>("/api/currency").then((response) => {
      if (!active) return;
      if (response.status === "success") { setSettings(response.data); setCurrency(response.data.currency); }
      else setError(response.message);
    });
    return () => { active = false; };
  }, [attempt]);

  async function confirmCurrency(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    const response = await api.post<CurrencySettings>("/api/currency", { currency });
    if (response.status === "success") setSettings(response.data);
    else setError(response.message);
    setSaving(false);
  }

  if (!settings) return <div className="px-4 py-6">{error ? <><p role="alert" className="text-red-400">{error}</p><button onClick={() => setAttempt(attempt + 1)} className="mt-3 underline">Retry</button></> : <p>Loading your budgets...</p>}</div>;
  if (settings.needsSetup) return <form onSubmit={confirmCurrency} className="max-w-xl mx-auto border border-neutral-700 rounded-xl p-6 my-6">
    <h2 className="text-xl font-semibold">Choose your default currency</h2>
    <p className="text-neutral-400 my-3">Your monthly budgets will always use this currency. This choice is permanent. You can create custom budgets in other currencies.</p>
    <label htmlFor="default-currency" className="block mb-2">Default currency</label>
    <CurrencySelect id="default-currency" value={currency} onChange={setCurrency} />
    {error && <p role="alert" className="text-red-400 mt-3">{error}</p>}
    <button disabled={saving} className="block mt-5 bg-sky-600 rounded-lg px-4 py-2 disabled:opacity-50">{saving ? "Saving..." : `Confirm ${currency} as my permanent default`}</button>
  </form>;

  return <>
    <div className="max-w-screen-xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 my-4">
      <div className="flex gap-3" role="group" aria-label="Budget view">
        {[["monthly", "Monthly budget"], ["custom", "Custom budgets"]].map(([value, label]) => (
          <button key={value} aria-pressed={view === value} onClick={() => setView(value)} className={`px-4 py-2 rounded-lg text-sm ${view === value ? "bg-sky-600" : "bg-neutral-800"}`}>{label}</button>
        ))}
      </div>
      <div className="text-sm text-neutral-400 flex items-center gap-2">
        <span>Default currency: {settings.currency}</span>
        <span className="relative group">
          <button type="button" aria-label="About your default currency" aria-describedby="currency-help" className="border border-neutral-500 rounded-full w-5 h-5 text-xs focus-visible:outline focus-visible:outline-sky-500">?</button>
          <span id="currency-help" role="tooltip" className="hidden group-hover:block group-focus-within:block absolute right-0 top-full mt-2 w-64 p-3 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 shadow-lg z-20">Your default currency can’t be changed once set. To track expenses in another currency, create a custom budget and choose its currency.</span>
        </span>
      </div>
    </div>
    {view === "monthly" ? <BudgetContainer currency={settings.currency} /> : <CustomBudgets defaultCurrency={settings.currency} />}
  </>;
}

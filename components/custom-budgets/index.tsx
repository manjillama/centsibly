"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { IBudget } from "@/interfaces/IBudget";
import { ITransaction } from "@/interfaces/ITransaction";
import { CategoryType } from "@/types";
import api from "@/utils/api";
import { formatCurrency } from "@/utils";
import BudgetInputForm from "../budget-input-form";
import MonthlyBudgetItem from "../monthly-budget-item";
import CurrencySelect from "../currency-select";
import DownloadTransactionsCsv from "../download-transactions-csv";
import MonthlyChart from "../monthly-chart";

export default function CustomBudgets({ defaultCurrency = "USD" }: { defaultCurrency?: string }) {
  const [newCurrency, setNewCurrency] = useState(defaultCurrency);
  const [budgets, setBudgets] = useState<IBudget[]>([]);
  const [selected, setSelected] = useState("");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [transactions, setTransactions] = useState<ITransaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<IBudget[]>("/api/budgets").then((response) => {
      if (!active) return;
      if (response.status === "success") {
        setBudgets(response.data);
        if (response.data.length) setSelected(response.data[0]._id);
      }
      else setError(response.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setTransactions(null);
    setError("");
    api.get<ITransaction[]>(`/api/budgets/${selected}/transactions`).then((response) => {
      if (!active) return;
      if (response.status === "success") setTransactions(response.data);
      else setError(response.message);
    });
    return () => { active = false; };
  }, [selected]);

  async function createBudget(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    const response = await api.post<IBudget>("/api/budgets", { name, currency: newCurrency });
    if (response.status === "success") {
      setBudgets((current) => [response.data, ...current]);
      setSelected(response.data._id);
      setName("");
      setCreating(false);
    } else setError(response.message);
    setSaving(false);
  }

  async function addTransaction(transaction: ITransaction) {
    const budgetId = selected;
    const response = await api.post<ITransaction>("/api/transactions", { ...transaction, budget: selected });
    if (response.status !== "success") throw new Error(response.message);
    if (selectedRef.current !== budgetId) return;
    setTransactions((current) => current ? [...current, response.data] : current);
  }

  async function updateTransaction(transaction: ITransaction) {
    const budgetId = selected;
    const response = await api.put<ITransaction>(`/api/transactions/${transaction._id}`, transaction);
    if (selectedRef.current !== budgetId) return;
    if (response.status !== "success") { setError(response.message); return; }
    setError("");
    setTransactions((current) => current?.map((item) => item._id === transaction._id ? response.data : item) || null);
  }

  const currency = budgets.find((budget) => budget._id === selected)?.currency || "USD";
  const expense = transactions?.reduce((total, item) => total + (item.category !== CategoryType.Income ? Number(item.amount) : 0), 0) || 0;
  const income = transactions?.reduce((total, item) => total + (item.category === CategoryType.Income ? Number(item.amount) : 0), 0) || 0;
  const expenseChart = useMemo(() => {
    const totals = new Map<string, number>();
    transactions?.forEach((transaction) => {
      if (transaction.category === CategoryType.Income) return;
      totals.set(transaction.category, (totals.get(transaction.category) || 0) + Number(transaction.amount));
    });
    const categories = Array.from(totals).filter(([, amount]) => amount > 0);
    return {
      labels: categories.map(([category]) => category),
      series: categories.map(([, amount]) => Number(amount.toFixed(2))),
    };
  }, [transactions]);

  return (
    <section className="max-w-screen-xl mx-auto px-4 py-6 text-sm">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold">Custom budgets</h2>
          <p className="text-neutral-400 mt-1">A separate space for each trip or project.</p>
        </div>
        <button onClick={() => { setNewCurrency(defaultCurrency); setCreating(true); }} className="bg-sky-600 hover:bg-sky-500 rounded-lg px-4 py-2">+ New budget</button>
      </div>
      {creating && (
        <form onSubmit={createBudget} className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 mb-6">
          <label htmlFor="budget-name" className="block font-medium mb-2">Name your budget</label>
          <div className="flex flex-wrap gap-3">
            <input id="budget-name" autoFocus className="grow rounded-lg bg-neutral-900" placeholder="e.g. Bali trip" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
            <CurrencySelect value={newCurrency} onChange={setNewCurrency} />
            <button disabled={saving || !name.trim()} className="bg-sky-600 rounded-lg px-4 py-2 disabled:opacity-50">{saving ? "Creating..." : "Create budget"}</button>
            <button type="button" disabled={saving} onClick={() => setCreating(false)} className="px-3 py-2 text-neutral-300">Cancel</button>
          </div>
          <p className="text-neutral-400 mt-3">Currency is fixed once this budget is created. All its transactions use the same currency.</p>
        </form>
      )}
      {error && <p role="alert" className="text-red-400 mb-4">{error}</p>}
      {loading ? <p>Loading budgets...</p> : budgets.length === 0 ? (
        <div className="border border-dashed border-neutral-700 rounded-xl p-10 text-center">
          <h3 className="text-lg font-semibold">Planning something?</h3>
          <p className="text-neutral-400 mt-2">Create a budget for a trip, event, or project, then add its expenses here.</p>
          <button onClick={() => { setNewCurrency(defaultCurrency); setCreating(true); }} className="mt-5 bg-sky-600 rounded-lg px-4 py-2">Create your first budget</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
          <nav aria-label="Your custom budgets" className="border border-neutral-700 rounded-xl p-3">
            <h3 className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-400">Your budgets</h3>
            <div className="flex lg:flex-col gap-1 overflow-x-auto">
              {budgets.map((budget) => <button key={budget._id} aria-pressed={selected === budget._id} onClick={() => { if (selected !== budget._id) { setTransactions(null); setSelected(budget._id); } }} className={`text-left px-3 py-3 rounded-lg break-words shrink-0 lg:shrink ${selected === budget._id ? "bg-sky-600/20 text-sky-300" : "text-neutral-300 hover:bg-neutral-800"}`}>{budget.name} <span className="text-xs opacity-70">{budget.currency || "USD"}</span></button>)}
            </div>
          </nav>
          <div className="min-w-0" key={selected}>
            <div className="border border-neutral-700 rounded-xl p-5 mb-5">
              <div className="flex justify-between items-start gap-4">
                <h3 className="font-semibold text-2xl break-words">{budgets.find((budget) => budget._id === selected)?.name}</h3>
                {transactions !== null && <DownloadTransactionsCsv transactions={transactions} currency={currency} filename={`${(budgets.find((budget) => budget._id === selected)?.name || "budget").replace(/[^a-z0-9_-]+/gi, "-")}-${currency}.csv`} />}
              </div>
              <p className="text-neutral-400 mt-2">Only transactions added here count toward this budget.</p>
              <span className="inline-block mt-3 rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">{currency} · Separate from monthly budget · All dates</span>
              {transactions !== null && <dl className="grid grid-cols-2 gap-4 mt-6 border-t border-neutral-700 pt-4">
                <div><dt className="text-neutral-400">Total spent</dt><dd className="text-2xl font-semibold mt-1">{formatCurrency(currency)}{expense.toFixed(2)}</dd></div>
                <div><dt className="text-neutral-400">Total income</dt><dd className="text-2xl font-semibold mt-1">{formatCurrency(currency)}{income.toFixed(2)}</dd></div>
              </dl>}
            </div>
            {transactions === null ? <p>{error ? "Unable to load transactions. Choose another budget and try again." : "Loading transactions..."}</p> : <>
              <div className="border-b border-neutral-700 py-2 mb-6">
                <BudgetInputForm currency={currency} addTransaction={addTransaction} />
              </div>
              <div>
                <h4 className="font-semibold mb-3">Transactions <span className="text-neutral-500">({transactions.length})</span></h4>
                {transactions.length === 0 ? <p className="rounded-xl bg-neutral-800/50 p-6 text-neutral-400">No transactions yet. Add your first expense using the form above.</p> : <>
                  <p className="text-neutral-400 mb-3">Edit any field to update a transaction. Changes save when you leave the field.</p>
                  <div className="flex flex-wrap">
                    <div className="lg:w-3/5 w-full lg:mb-0 mb-4">
                      {transactions.map((transaction) => <MonthlyBudgetItem key={transaction._id} transaction={transaction} currency={currency} onUpdate={updateTransaction} />)}
                    </div>
                    <div className="lg:w-2/5 w-full min-w-0" role="region" aria-label="Expenses by category">
                      {expenseChart.series.length > 0 ? (
                        <MonthlyChart series={JSON.stringify(expenseChart.series)} labels={JSON.stringify(expenseChart.labels)} />
                      ) : <p className="text-neutral-400 p-4 text-center">Add an expense to see the category breakdown.</p>}
                    </div>
                  </div>
                </>}
              </div>
            </>}
          </div>
        </div>
      )}
    </section>
  );
}

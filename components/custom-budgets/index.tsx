"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { IBudget } from "@/interfaces/IBudget";
import { ITransaction } from "@/interfaces/ITransaction";
import { TransactionType } from "@/types";
import { getTransactionType, transactionTotals } from "@/utils/transactionTypes";
import api from "@/utils/api";
import { formatCurrency } from "@/utils";
import BudgetInputForm from "../budget-input-form";
import MonthlyBudgetItem from "../monthly-budget-item";
import CurrencySelect from "../currency-select";
import DownloadTransactionsCsv from "../download-transactions-csv";
import MonthlyChart from "../monthly-chart";

export default function CustomBudgets({ defaultCurrency = "USD" }: { defaultCurrency?: string }) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [archiveSaving, setArchiveSaving] = useState(false);
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
  const [renameSaving, setRenameSaving] = useState(false);
  const [titleSaved, setTitleSaved] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [renameError, setRenameError] = useState("");

  useEffect(() => {
    if (!titleSaved) return;
    const timeout = setTimeout(() => setTitleSaved(false), 2000);
    return () => clearTimeout(timeout);
  }, [titleSaved]);

  useEffect(() => {
    if (!targetSaved) return;
    const timeout = setTimeout(() => setTargetSaved(false), 2000);
    return () => clearTimeout(timeout);
  }, [targetSaved]);

  useEffect(() => {
    let active = true;
    api.get<IBudget[]>("/api/budgets").then((response) => {
      if (!active) return;
      if (response.status === "success") {
        setBudgets(response.data);
        let remembered = "";
        try { remembered = localStorage.getItem("centsible-selected-budget") || ""; } catch {}
        const initial = response.data.find((budget) => budget._id === remembered) || response.data.find((budget) => !budget.archived) || response.data[0];
        if (initial) { setSelected(initial._id); setShowArchived(!!initial.archived); }
      }
      else setError(response.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setTitleSaved(false);
    setTargetSaved(false);
    setRenameError("");
    setTargetError("");
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

  useEffect(() => {
    if (selected) {
      try { localStorage.setItem("centsible-selected-budget", selected); } catch {}
    }
  }, [selected]);

  function changeArchiveView(archived: boolean) {
    setShowArchived(archived);
    setTransactions(null);
    setSelected(budgets.find((budget) => !!budget.archived === archived)?._id || "");
  }

  async function toggleArchive() {
    if (archiveSaving) return;
    const budgetId = selected;
    const archived = !budgets.find((budget) => budget._id === budgetId)?.archived;
    setArchiveSaving(true);
    setError("");
    const response = await api.put<IBudget>(`/api/budgets/${budgetId}`, { archived }, "PATCH");
    if (response.status === "success") {
      setBudgets((current) => current.map((budget) => budget._id === budgetId ? { ...budget, ...response.data } : budget));
      if (selectedRef.current === budgetId) {
        setTransactions(null);
        setSelected(budgets.find((budget) => budget._id !== budgetId && !!budget.archived === showArchived)?._id || "");
      }
    } else setError(response.message);
    setArchiveSaving(false);
  }

  async function createBudget(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    const response = await api.post<IBudget>("/api/budgets", { name, currency: newCurrency });
    if (response.status === "success") {
      setBudgets((current) => [response.data, ...current]);
      setShowArchived(false);
      setSearch("");
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

  async function renameBudget(event: React.FocusEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const currentName = budgets.find((budget) => budget._id === selected)?.name || "";
    const name = input.value.trim();
    input.value = name;
    if (renameSaving || name === currentName) return;
    if (!name) {
      input.value = currentName;
      setRenameError("Enter a budget name between 1 and 100 characters");
      return;
    }
    const budgetId = selected;
    setTitleSaved(false);
    setRenameSaving(true);
    setRenameError("");
    const response = await api.put<IBudget>(`/api/budgets/${budgetId}`, { name });
    if (response.status === "success") {
      setBudgets((current) => current.map((budget) => budget._id === budgetId ? { ...budget, ...response.data } : budget));
      if (selectedRef.current === budgetId) setTitleSaved(true);
    } else if (selectedRef.current === budgetId) {
      setRenameError(response.message);
    }
    setRenameSaving(false);
  }

  async function deleteTransaction(id: string) {
    const budgetId = selected;
    const response = await api.remove(`/api/transactions/${id}`);
    if (response.status !== "success") throw new Error(response.message);
    if (selectedRef.current === budgetId)
      setTransactions((current) => current?.filter((item) => item._id !== id) || null);
  }

  async function saveTarget(event: React.FocusEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const previous = budgets.find((budget) => budget._id === selected)?.target ?? null;
    const visibleBudgets = budgets.filter((budget) => !!budget.archived === showArchived && budget.name.toLowerCase().includes(search.trim().toLowerCase()));
  const target = input.value.trim() === "" ? null : Number(input.value);
    if (targetSaving || target === previous) return;
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      input.value = previous?.toString() || "";
      setTargetError("Enter a target greater than zero");
      return;
    }
    const budgetId = selected;
    setTargetSaved(false);
    setTargetSaving(true);
    setTargetError("");
    const response = await api.put<IBudget>(`/api/budgets/${budgetId}`, { target }, "PATCH");
    if (response.status === "success") {
      setBudgets((current) => current.map((budget) => budget._id === budgetId ? { ...budget, ...response.data } : budget));
      if (selectedRef.current === budgetId) setTargetSaved(true);
    } else if (selectedRef.current === budgetId) {
      setTargetError(response.message);
    }
    setTargetSaving(false);
  }

  async function updateTransaction(transaction: ITransaction) {
    const budgetId = selected;
    const response = await api.put<ITransaction>(`/api/transactions/${transaction._id}`, transaction);
    if (selectedRef.current !== budgetId) return;
    if (response.status !== "success") throw new Error(response.message);
    setError("");
    setTransactions((current) => current?.map((item) => item._id === transaction._id ? response.data : item) || null);
  }

  const visibleBudgets = budgets.filter((budget) => !!budget.archived === showArchived && budget.name.toLowerCase().includes(search.trim().toLowerCase()));
  const target = budgets.find((budget) => budget._id === selected)?.target;
  const currency = budgets.find((budget) => budget._id === selected)?.currency || "USD";
  const totals = transactionTotals(transactions ?? []);
  const expense = totals.expenses;
  const income = totals.income;
  useEffect(() => {
    if (transactions === null) return;
    setBudgets((current) => current.map((budget) => budget._id === selected ? { ...budget, spent: expense } : budget));
  }, [selected, transactions, expense]);

  const expenseChart = useMemo(() => {
    const totals = new Map<string, number>();
    transactions?.forEach((transaction) => {
      if (getTransactionType(transaction) !== TransactionType.Expense) return;
      totals.set(transaction.category, (totals.get(transaction.category) || 0) + Number(transaction.amount));
    });
    const categories = Array.from(totals).filter(([, amount]) => amount > 0);
    return {
      labels: categories.map(([category]) => category),
      series: categories.map(([, amount]) => Number(amount.toFixed(2))),
    };
  }, [transactions]);

  return (
    <section className="max-w-screen-xl mx-auto px-4 pb-6 text-sm">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Custom budgets</h2>
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
          <nav aria-label="Your custom budgets" className="border border-neutral-800 bg-neutral-800/20 rounded-xl p-3">
            <h3 className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-400">Your budgets</h3>
            <div className="flex gap-1 px-1 mb-2" role="group" aria-label="Budget archive filter">
              {[false, true].map((archived) => <button key={String(archived)} type="button" aria-pressed={showArchived === archived} onClick={() => changeArchiveView(archived)} className={`flex-1 rounded-md px-2 py-2 text-xs ${showArchived === archived ? "bg-neutral-700 text-white" : "text-neutral-400"}`}>{archived ? "Archived" : "Active"} ({budgets.filter((budget) => !!budget.archived === archived).length})</button>)}
            </div>
            <input type="search" aria-label="Search budgets by title" placeholder="Search by title…" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full min-w-0 mb-2" />
            <div className="flex flex-col gap-1 max-h-64 lg:max-h-[60vh] overflow-y-auto overscroll-contain">
              {visibleBudgets.length === 0 && <p className="px-3 py-4 text-neutral-400">{search.trim() ? "No matching budgets." : showArchived ? "No archived budgets." : "No active budgets."}</p>}
              {visibleBudgets.map((budget) => <button key={budget._id} aria-pressed={selected === budget._id} onClick={() => { if (selected !== budget._id) { setTransactions(null); setSelected(budget._id); } }} className={`text-left px-3 py-3 rounded-lg break-words shrink-0 lg:shrink ${selected === budget._id ? "bg-sky-600/20 text-sky-300" : "text-neutral-300 hover:bg-neutral-800"}`}>{budget.name} <span className="text-xs opacity-70">{budget.currency || "USD"}</span>{budget.target ? <span className="block text-xs mt-1 opacity-80">{formatCurrency(budget.currency || "USD")}{Math.abs(budget.target - (budget._id === selected && transactions !== null ? expense : budget.spent || 0)).toFixed(2)} {budget.target < (budget._id === selected && transactions !== null ? expense : budget.spent || 0) ? "over target" : "left"}</span> : null}</button>)}
            </div>
          </nav>
          {!selected ? <p className="text-neutral-400 p-5">{showArchived ? "Archived budgets will appear here. You can restore them anytime." : "Select a budget or create a new one."}</p> : <div className="min-w-0" key={selected}>
            <div className="border border-neutral-800 bg-neutral-800/20 rounded-xl p-5 mb-5">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 grow">
                  <h3 className="font-semibold text-2xl">
                    <input
                      type="text"
                      aria-label="Budget title"
                      defaultValue={budgets.find((budget) => budget._id === selected)?.name || ""}
                      maxLength={100}
                      required
                      readOnly={renameSaving}
                      onBlur={renameBudget}
                      onFocus={() => setRenameError("")}
                      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                      className="w-full min-w-0 rounded-md"
                    />
                  </h3>
                  <p role="status" className={`text-xs mt-1 ${renameError ? "text-red-400" : "text-neutral-500"}`}>{renameSaving ? "Saving…" : renameError ? `Couldn't save: ${renameError}` : titleSaved ? "Saved" : ""}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button type="button" disabled={archiveSaving} onClick={toggleArchive} title={showArchived ? "Restore budget" : "Archive budget"} aria-label={showArchived ? "Restore budget" : "Archive budget"} aria-busy={archiveSaving} className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-600 text-neutral-300 hover:bg-neutral-600 disabled:opacity-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3h18v4H3zM5 7v14h14V7" />
                      {showArchived ? <path d="M12 17v-6m-3 3 3-3 3 3" /> : <path d="M9 11h6" />}
                    </svg>
                  </button>
                {transactions !== null && <DownloadTransactionsCsv transactions={transactions} currency={currency} filename={`${(budgets.find((budget) => budget._id === selected)?.name || "budget").replace(/[^a-z0-9_-]+/gi, "-")}-${currency}.csv`} />}
                </div>
              </div>
              <p className="text-neutral-400 mt-2">Only transactions added here count toward this budget.</p>
              <span className="inline-block mt-3 rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">{currency} · Separate from monthly budget · All dates</span>
              {transactions !== null && <dl className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-6 border-t border-neutral-700 pt-4">
                <div><dt className="text-neutral-400">Total spent</dt><dd className="text-2xl font-semibold mt-1">{formatCurrency(currency)}{expense.toFixed(2)}</dd></div>
                <div><dt className="text-neutral-400">Total income</dt><dd className="text-2xl font-semibold mt-1">{formatCurrency(currency)}{income.toFixed(2)}</dd></div>
                <div><dt className="text-neutral-400">Set aside</dt><dd className="text-2xl font-semibold mt-1">{formatCurrency(currency)}{totals.savings.toFixed(2)}</dd></div>
                <div><dt className="text-neutral-400">Remaining</dt><dd className="text-2xl font-semibold mt-1">{formatCurrency(currency)}{totals.remaining.toFixed(2)}</dd></div>
              </dl>}
              <div className="mt-5 border-t border-neutral-700 pt-4">
                <label htmlFor="budget-target" className="text-neutral-400">Spending target</label>
                <div className="flex items-center mt-1">
                  <span className="text-neutral-500 inline-block">{formatCurrency(currency)}</span>
                  <div className="-ml-1">
                    <input id="budget-target" type="text" inputMode="decimal" autoComplete="off" placeholder="Add amount..." defaultValue={target ?? ""} readOnly={targetSaving} onBlur={saveTarget} onFocus={() => setTargetError("")} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="w-48" />
                  </div>
                </div>
                <p role="status" className={`text-xs mt-1 ${targetError ? "text-red-400" : "text-neutral-500"}`}>{targetSaving ? "Saving…" : targetError ? `Couldn't save: ${targetError}` : targetSaved ? "Saved" : ""}</p>
                {target && transactions !== null ? <div className="mt-3">
                  <div role="progressbar" aria-label="Spending target used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(expense / target * 100))} className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div className={`h-full ${expense > target ? "bg-red-500" : "bg-sky-500"}`} style={{ width: `${Math.min(100, Math.max(0, expense / target * 100))}%` }} />
                  </div>
                  <p className={`mt-2 ${expense > target ? "text-red-400" : "text-neutral-400"}`}>{formatCurrency(currency)}{Math.abs(target - expense).toFixed(2)} {expense > target ? "over target" : "remaining"} · {Math.round(expense / target * 100)}% used</p>
                </div> : null}
              </div>
            </div>
            {transactions === null ? <p>{error ? "Unable to load transactions. Choose another budget and try again." : "Loading transactions..."}</p> : <>
              <div className="border-y border-neutral-800 py-3 mb-6">
                <BudgetInputForm currency={currency} addTransaction={addTransaction} />
              </div>
              <div>
                <h4 className="font-medium mb-3 px-4 text-neutral-300">Transactions <span className="text-neutral-500">({transactions.length})</span></h4>
                {transactions.length === 0 ? <p className="rounded-xl bg-neutral-800/50 p-6 text-neutral-400">No transactions yet. Add your first expense using the form above.</p> : <>
                  <div className="flex flex-wrap">
                    <div className="lg:w-3/5 w-full lg:mb-0 mb-4">
                      {transactions.map((transaction) => <MonthlyBudgetItem key={transaction._id} transaction={transaction} currency={currency} onUpdate={updateTransaction} onDelete={deleteTransaction} />)}
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
          </div>}
        </div>
      )}
    </section>
  );
}

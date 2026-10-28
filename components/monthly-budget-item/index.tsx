import { useTransaction } from "@/context/transaction-provider";
import { ITransaction } from "@/interfaces/ITransaction";
import { TransactionType } from "@/types";
import { typeForCategory, getTransactionType } from "@/utils/transactionTypes";
import { categoryToEmoji, formatCurrency, formatDate } from "@/utils";
import { useEffect, useRef, useState } from "react";
import CategoryOptions from "../budget-input-form/category-options";
import styles from "./row.module.css";

export default function MonthlyBudgetItem({
  transaction,
  currency,
  onUpdate,
  onDelete,
  expensesOnly = false,
}: {
  transaction: ITransaction;
  currency: string;
  expensesOnly?: boolean;
  onUpdate?: (transaction: ITransaction) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const { updateTransaction, deleteTransaction } = useTransaction();
  const [formProps, setFormProps] = useState<ITransaction>(transaction);

  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const saveQueue = useRef(Promise.resolve());
  const saveVersion = useRef(0);
  const lastSubmitted = useRef(JSON.stringify({ ...transaction, amount: Number(transaction.amount) }));

  useEffect(() => {
    if (saveStatus !== "Saved") return;
    const timeout = setTimeout(() => setSaveStatus(""), 2000);
    return () => clearTimeout(timeout);
  }, [saveStatus]);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try { await (onDelete || deleteTransaction)(transaction._id); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : "Unable to delete transaction"); }
    finally { setDeleting(false); }
  }

  function handleChange(event: React.FormEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    if (name === "category") {
      setFormProps({ ...formProps, category: value, type: typeForCategory(value) });
      return;
    }

    setFormProps({
      ...formProps,
      [name]: name === "amount" ? getValidUserAmount(value) : value,
    });
  }

  function getValidUserAmount(amount: string) {
    if (/^\d*\.?\d?$/.test(amount.toString())) return amount;
    return formProps.amount;
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = { ...formProps, amount: Number(formProps.amount) };
    const snapshot = JSON.stringify(data);
    if (snapshot === lastSubmitted.current && !saveError) return;
    lastSubmitted.current = snapshot;
    const version = ++saveVersion.current;
    setSaveStatus("Saving…");
    setSaveError("");
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await (onUpdate || updateTransaction)(data);
        if (saveVersion.current === version) setSaveStatus("Saved");
      } catch (error) {
        if (saveVersion.current === version) {
          setSaveStatus("");
          setSaveError(error instanceof Error ? error.message : "Unable to save changes");
        }
      }
    });
  }

  return (
    <div className={`${styles.container} group relative lg:border-0 border-b-[1px] border-neutral-700`}>
      <form
        onBlur={handleSubmit}
        className={styles.row}
      >
        <div className={styles.title}>
          {categoryToEmoji(formProps.category)}
          <input
            type="text"
            value={formProps.title}
            name="title"
            onChange={handleChange}
            className="min-w-0 w-full"
            autoCapitalize="true"
            autoComplete="off"
            placeholder="Type new budget name..."
            required
          />
        </div>
        <label className="flex items-center">
          <span className="text-neutral-500 inline-block">
            {formatCurrency(currency)}
          </span>
          <div className="-ml-1">
            <input
              type="text"
              name="amount"
              onChange={handleChange}
              value={formProps.amount}
              className="w-20"
              autoComplete="off"
              placeholder="Add amount..."
              required
            />
          </div>
        </label>
        <select
          value={formProps.category}
          name="category"
          onChange={handleChange as any}
          style={{
            color:
              getTransactionType(formProps) === TransactionType.Income ? "#16a34a" : "white",
          }}
          className={styles.category}
          required
        >
          <CategoryOptions types={expensesOnly ? Array.from(new Set([TransactionType.Expense, getTransactionType(transaction)])) : undefined} />
        </select>
        <div className={styles.date}>
          <label className="date-picker-label text-white">
            {formatDate(new Date(formProps.transactionDate))}
            <input
              className="picker"
              type="date"
              name="transactionDate"
              onChange={handleChange}
              value={formProps.transactionDate as string}
              onClick={(e) => e.currentTarget.showPicker()}
            />
          </label>
        </div>
      </form>
      {(saveStatus || saveError) && <p role="status" className={`ml-4 text-xs ${saveError ? "text-red-400" : "text-neutral-500"}`}>
        {saveError ? `Couldn't save: ${saveError}. Leave the field to retry.` : saveStatus}
      </p>}
      {!confirmingDelete && <button
        type="button"
        aria-label={`Delete ${transaction.title}`}
        title="Delete transaction"
        onClick={() => setConfirmingDelete(true)}
        className="transaction-delete absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-opacity hover:bg-red-500/10 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
        </svg>
      </button>}
      {confirmingDelete && <div
        className="absolute right-1 top-1 z-20 w-60 max-w-[calc(100%-0.5rem)] rounded-xl border border-neutral-600 bg-neutral-800 p-3 shadow-xl"
        role="dialog"
        aria-label="Confirm transaction deletion"
        onKeyDown={(event) => { if (event.key === "Escape" && !deleting) { setConfirmingDelete(false); setDeleteError(""); } }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !deleting) { setConfirmingDelete(false); setDeleteError(""); } }}
      >
          <p className="text-sm font-medium">Delete this transaction?</p>
          <p className="mt-1 truncate text-xs text-neutral-400">{transaction.title}</p>
          <div className="mt-3 flex justify-end gap-2 text-xs">
            <button type="button" autoFocus disabled={deleting} onClick={() => { setConfirmingDelete(false); setDeleteError(""); }} className="rounded-md px-3 py-2 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-500 disabled:opacity-50">{deleting ? "Deleting..." : "Delete"}</button>
          </div>
          {deleteError && <p role="alert" className="mt-2 text-red-400 text-xs">{deleteError}</p>}
      </div>}
    </div>
  );
}

"use client";
import { ITransaction } from "@/interfaces/ITransaction";
import { TransactionType } from "@/types";
import { typeForCategory, getTransactionType } from "@/utils/transactionTypes";
import {
  categoryToEmoji,
  formatCurrency,
  formatDate,
  getNormalizedDate,
} from "@/utils";
import { useState } from "react";
import styles from "./entry.module.css";
import CategoryOptions from "./category-options";

const INITIAL_FORM_PROPS = {
  _id: `${new Date().getTime()}`,
  title: "",
  category: "",
  type: TransactionType.Expense,
  amount: "" as "",
  transactionDate: getNormalizedDate(new Date()),
};

export default function BudgetInputForm({
  currency,
  addTransaction,
}: {
  currency: string;
  addTransaction: (transaction: ITransaction) => void | Promise<void>;
}) {
  const [formProps, setFormProps] =
    useState<
      Pick<
        ITransaction,
        "_id" | "title" | "category" | "type" | "amount" | "transactionDate"
      >
    >(INITIAL_FORM_PROPS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await addTransaction({ ...formProps, amount: Number(formProps.amount) });
      setFormProps(INITIAL_FORM_PROPS);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save transaction");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="max-w-screen-xl	mx-auto px-4 pb-1">
      <form
        onSubmit={handleSubmit}
        className={styles.form}
      >
        <div className={`${styles.field} ${styles.title}`}>
          {categoryToEmoji(formProps.category)}
          <input
            type="text"
            value={formProps.title}
            aria-label="Transaction description"
            name="title"
            onChange={handleChange}
            className="grow"
            autoCapitalize="true"
            autoComplete="off"
            placeholder="Type new expense or income..."
            required
          />
        </div>
        <label className={styles.field}>
          <span className="text-neutral-500 inline-block">
            {formatCurrency(currency)}
          </span>
          <div className="min-w-0 grow">
            <input
              type="text"
              aria-label="Amount"
              inputMode="decimal"
              name="amount"
              onChange={handleChange}
              value={formProps.amount}
              className="w-full"
              autoComplete="off"
              placeholder="Add amount..."
              required
            />
          </div>
        </label>
        <div className={styles.field}>
          <select
            value={formProps.category}
            aria-label="Category"
            name="category"
            onChange={handleChange as any}
            style={{
              color:
                formProps.category === ""
                  ? "#a1a1aa"
                  : getTransactionType(formProps) === TransactionType.Income
                  ? "#16a34a"
                  : "white",
            }}
            className="w-full"
            required
          >
            <option value={""} className="text-neutral-500">
              Select category...
            </option>
            <CategoryOptions />
          </select>
        </div>
        <div className={`${styles.field} ${styles.date}`}>
          <label className="date-picker-label text-neutral-300">
            <span>{formatDate(new Date(formProps.transactionDate))}</span>
            <input
              className="picker"
              type="date"
              aria-label="Transaction date"
              name="transactionDate"
              onChange={handleChange}
              value={formProps.transactionDate as string}
              onClick={(e) => e.currentTarget.showPicker()}
            />
          </label>
        </div>
        <div className="min-w-0">
          <button
            type="submit"
            disabled={saving}
            className={styles.submit}
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
      {error && <p role="alert" className="text-red-400">{error}</p>}
    </div>
  );
}

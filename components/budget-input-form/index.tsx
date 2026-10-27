"use client";
import { ITransaction } from "@/interfaces/ITransaction";
import { CategoryType } from "@/types";
import {
  categoryToEmoji,
  formatCurrency,
  formatDate,
  getNormalizedDate,
} from "@/utils";
import { useState } from "react";

const INITIAL_FORM_PROPS = {
  _id: `${new Date().getTime()}`,
  title: "",
  category: "" as "",
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
        "_id" | "title" | "category" | "amount" | "transactionDate"
      >
    >(INITIAL_FORM_PROPS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event: React.FormEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;

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
        className="flex flex-wrap rounded-md space-x-4 py-1 pr-2 lg:w-4/5 -mx-4"
      >
        <div className="ml-4 grow md:w-auto w-full flex items-center">
          {categoryToEmoji(formProps.category)}
          <input
            type="text"
            value={formProps.title}
            name="title"
            onChange={handleChange}
            className="grow"
            autoCapitalize="true"
            autoComplete="off"
            placeholder="Type new expense or income..."
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
              className="w-48"
              autoComplete="off"
              placeholder="Add amount..."
              required
            />
          </div>
        </label>
        <div>
          <select
            value={formProps.category}
            name="category"
            onChange={handleChange as any}
            style={{
              color:
                formProps.category === ""
                  ? "#a1a1aa"
                  : formProps.category === CategoryType.Income
                  ? "#16a34a"
                  : "white",
            }}
            className="w-48 h-full ml-1"
            required
          >
            <option value={""} className="text-neutral-500">
              Select category...
            </option>
            {Object.values(CategoryType).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="relative w-36 input">
          <label className="date-picker-label text-white ml-[12px] h-[30px] flex items-center">
            <span>{formatDate(new Date(formProps.transactionDate))}</span>
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
        <div className="md:w-auto md:mt-0 w-full mt-2">
          <button
            type="submit"
            disabled={saving}
            className="py-2 px-6 block bg-sky-600 text-white rounded-lg hover:opacity-75 text-sm"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
      {error && <p role="alert" className="text-red-400">{error}</p>}
    </div>
  );
}

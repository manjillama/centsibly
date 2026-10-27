import { useTransaction } from "@/context/transaction-provider";
import { ITransaction } from "@/interfaces/ITransaction";
import { CategoryType } from "@/types";
import { categoryToEmoji, formatCurrency, formatDate } from "@/utils";
import { useState } from "react";

export default function MonthlyBudgetItem({
  transaction,
  currency,
  onUpdate,
}: {
  transaction: ITransaction;
  currency: string;
  onUpdate?: (transaction: ITransaction) => void;
}) {
  const { updateTransaction } = useTransaction();
  const [formProps, setFormProps] = useState<ITransaction>(transaction);

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
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    (onUpdate || updateTransaction)({ ...formProps, amount: Number(formProps.amount) });
  }

  return (
    <div className="lg:border-0 border-b-[1px] border-neutral-700">
      <form
        onBlur={handleSubmit}
        className="flex flex-wrap hover:bg-neutral-700 rounded-md space-x-4 py-1 pr-2"
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
              formProps.category === CategoryType.Income ? "#16a34a" : "white",
          }}
          className="w-48 h-full ml-1"
          required
        >
          {Object.values(CategoryType).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <div className="relative w-36 input">
          <label className="date-picker-label text-white ml-[12px]">
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
    </div>
  );
}

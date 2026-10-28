"use client";
import { useTransaction } from "@/context/transaction-provider";
import { ITransaction } from "@/interfaces/ITransaction";
import { useEffect, useMemo } from "react";
import MonthlyBudget from "../monthly-budget";
import YearlyChart from "../yearly-chart";
import MonthlyChart from "../monthly-chart";
import { TransactionType } from "@/types";
import { getTransactionType, transactionTotals } from "@/utils/transactionTypes";
import { formatCurrency } from "@/utils";
import BudgetInputForm from "../budget-input-form";
import ChangeYear from "../change-year";
import DownloadTransactionsCsv from "../download-transactions-csv";

export default function BudgetContainer({ currency = "USD" }: { currency?: string }) {
  const { transactionData, refreshTransactionData, addTransaction } =
    useTransaction();

  useEffect(() => {
    refreshTransactionData(new Date().getFullYear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allMonthlyTransaction = useMemo(() => {
    const updatedMonthlyTransaction: ITransaction[][] = Array.from(
      { length: 12 },
      () => []
    );

    if (transactionData.transactions) {
      transactionData.transactions.forEach((transaction) => {
        const monthIndex = new Date(transaction.transactionDate).getUTCMonth();
        updatedMonthlyTransaction[monthIndex].push(transaction);
      });
    }

    return updatedMonthlyTransaction;
  }, [transactionData.transactions]);

  const yearlyCategories = useMemo(() => {
    const totals = new Map<string, number>();
    transactionData.transactions?.forEach((transaction) => {
      if (getTransactionType(transaction) !== TransactionType.Expense) return;
      totals.set(transaction.category, (totals.get(transaction.category) || 0) + Number(transaction.amount));
    });
    const categories = Array.from(totals).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
    return {
      labels: categories.map(([category]) => category),
      series: categories.map(([, amount]) => Number(amount.toFixed(2))),
    };
  }, [transactionData.transactions]);

  const totals = useMemo(() => transactionTotals(transactionData.transactions ?? []), [transactionData.transactions]);

  const money = (amount: number) => `${formatCurrency(currency)}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function renderMonthlyBudget() {
    const monthlyBudgets = [];

    for (let i = allMonthlyTransaction.length - 1; i >= 0; i--) {
      monthlyBudgets.push(
        <MonthlyBudget
          key={`${transactionData.currentYear}-${i}`}
          transactions={allMonthlyTransaction[i]}
          currency={currency}
          monthIndex={i}
          year={transactionData.currentYear}
        />
      );
    }

    return monthlyBudgets;
  }

  if (!transactionData.transactions)
    return (
      <p className="text-white text-center mt-24 mb-12">
        Please wait while we&apos;re working on your budget...
      </p>
    );

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto px-4 py-3">
        <ChangeYear />
        <DownloadTransactionsCsv
          transactions={transactionData.transactions}
          currentYear={transactionData.currentYear}
        />
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mx-4 mt-2 mb-6 divide-y sm:divide-y-0  divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-800/20">
        {[
          { label: "Total income", value: totals.income },
          { label: "Total expenses", value: totals.expenses },
          { label: "Set aside", value: totals.savings },
          { label: "Remaining", value: totals.remaining },
        ].map(({ label, value }) => <div key={label} className="px-5 py-4 sm:py-5 min-w-0">
          <dt className="text-xs text-neutral-400">{label} <span className="text-neutral-500">· {transactionData.currentYear}</span></dt>
          <dd className={`text-2xl font-medium tracking-tight mt-2 break-words tabular-nums ${label === "Remaining" ? value < 0 ? "text-red-400" : "text-sky-300" : "text-neutral-100"}`}>{money(value)}</dd>
        </div>)}
      </dl>
      <div>
        <div className="border-y border-neutral-800 py-3 sticky top-0 bg-neutral-900 z-10">
          <h2 className="px-4 mb-2 text-xs font-medium text-neutral-400">Add a transaction</h2>
          <BudgetInputForm
            currency={currency}
            addTransaction={addTransaction}
          />
        </div>
        <div className="max-w-screen-xl	mx-auto">
          {transactionData.transactions.length > 0 ? (
            renderMonthlyBudget()
          ) : (
            <div className="mx-4 my-8 rounded-xl border border-dashed border-neutral-700 px-5 py-12 text-center">
              <h2 className="text-base font-medium text-neutral-200">A fresh page for {transactionData.currentYear}.</h2>
              <p className="text-neutral-400 text-sm mt-2">Add your first income or expense above. Your monthly picture will take shape here.</p>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 pb-6 mt-8">
        <section className="min-w-0 rounded-xl border border-neutral-800 p-4 sm:p-5" aria-label="Yearly expenses and income">
          <h3 className="font-medium mb-4 text-neutral-300">{transactionData.currentYear} · Income, expenses & savings</h3>
          <YearlyChart
            transactions={transactionData.transactions}
            currency={currency}
          />
        </section>
        <section className="min-w-0 rounded-xl border border-neutral-800 p-4 sm:p-5" aria-label="Yearly expenses by category">
          <h3 className="font-medium mb-4 text-neutral-300">{transactionData.currentYear} · Expenses by category</h3>
          {yearlyCategories.series.length > 0 ? (
            <div className="w-full max-w-xl mx-auto">
              <MonthlyChart series={JSON.stringify(yearlyCategories.series)} labels={JSON.stringify(yearlyCategories.labels)} />
            </div>
          ) : <p className="text-neutral-400 py-6">Add an expense to see the yearly category breakdown.</p>}
        </section>
      </div>
    </div>
  );
}

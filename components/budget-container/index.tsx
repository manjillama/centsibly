"use client";
import { useTransaction } from "@/context/transaction-provider";
import { ITransaction } from "@/interfaces/ITransaction";
import { useEffect, useMemo } from "react";
import MonthlyBudget from "../monthly-budget";
import YearlyChart from "../yearly-chart";
import MonthlyChart from "../monthly-chart";
import { CategoryType } from "@/types";
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
      if (transaction.category === CategoryType.Income) return;
      totals.set(transaction.category, (totals.get(transaction.category) || 0) + Number(transaction.amount));
    });
    const categories = Array.from(totals).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
    return {
      labels: categories.map(([category]) => category),
      series: categories.map(([, amount]) => Number(amount.toFixed(2))),
    };
  }, [transactionData.transactions]);

  function renderMonthlyBudget() {
    const monthlyBudgets = [];

    for (let i = allMonthlyTransaction.length - 1; i >= 0; i--) {
      monthlyBudgets.push(
        <MonthlyBudget
          key={`${i}-${Date.now()}`}
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
      <div className="flex justify-between max-w-screen-xl mx-auto px-4">
        <ChangeYear />
        <DownloadTransactionsCsv
          transactions={transactionData.transactions}
          currentYear={transactionData.currentYear}
        />
      </div>

      <div>
        <div className="border-b-[1px] border-neutral-700 py-2 sticky top-0 bg-neutral-900 z-10">
          <BudgetInputForm
            currency={currency}
            addTransaction={addTransaction}
          />
        </div>
        <div className="max-w-screen-xl	mx-auto">
          {transactionData.transactions.length > 0 ? (
            renderMonthlyBudget()
          ) : (
            <p className="text-md my-6 mt-12 text-center">
              Looks like you don&apos;t have any expenses to track this year.
              Start by adding an income or expense.
            </p>
          )}
        </div>
      </div>
      <br />
      <div className="max-w-screen-xl mx-auto px-4 grid grid-cols-1 gap-6 pb-6">
        <section className="min-w-0" aria-label="Yearly expenses and income">
          <h3 className="font-semibold mb-4">{transactionData.currentYear} · Expenses vs income</h3>
          <YearlyChart
            transactions={transactionData.transactions}
            currency={currency}
          />
        </section>
        <section className="min-w-0" aria-label="Yearly expenses by category">
          <h3 className="font-semibold mb-4">{transactionData.currentYear} · Expenses by category</h3>
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

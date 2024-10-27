"use client";
import { useTransaction } from "@/context/transaction-provider";
import { ITransaction } from "@/interfaces/ITransaction";
import { useMemo } from "react";
import MonthlyBudget from "../monthly-budget";
import YearlyChart from "../yearly-chart";
import BudgetInputForm from "../budget-input-form";
import ChangeYear from "../change-year";

export default function BudgetContainer() {
  const { transactionData, addTransaction } = useTransaction();

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

  function renderMonthlyBudget() {
    const monthlyBudgets = [];

    for (let i = allMonthlyTransaction.length - 1; i >= 0; i--) {
      monthlyBudgets.push(
        <MonthlyBudget
          key={`${i}-${Date.now()}`}
          transactions={allMonthlyTransaction[i]}
          currency={transactionData.currency}
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
      <ChangeYear />
      <BudgetInputForm
        currency={transactionData.currency}
        addTransaction={addTransaction}
      />
      {renderMonthlyBudget()}
      <br />
      <YearlyChart
        transactions={transactionData.transactions}
        currency={transactionData.currency}
      />
    </div>
  );
}

import { ITransaction } from "@/interfaces/ITransaction";
import { formatCurrency, getValidNumber, transformIndexToMonth } from "@/utils";
import MonthlyBudgetItem from "../monthly-budget-item";
import MonthlyChart from "../monthly-chart";
import { useMemo } from "react";
import { CategoryType } from "@/types";

export default function MonthlyBudget({
  transactions,
  currency,
  monthIndex,
  year,
}: {
  transactions: ITransaction[];
  currency: string;
  monthIndex: number;
  year: number;
}) {
  const monthlyChartData = useMemo(() => {
    const dataMap = new Map();
    transactions.forEach((transaction) => {
      if (transaction.category !== CategoryType.Income)
        dataMap.set(
          transaction.category,
          +(
            dataMap.get(transaction.category)
              ? dataMap.get(transaction.category) + transaction.amount
              : transaction.amount
          ).toFixed(2)
        );
    });
    return dataMap;
  }, [transactions]);

  // Memoizing series and labels based on transactions
  const [series, labels] = useMemo(() => {
    return [
      Array.from(monthlyChartData.values()),
      Array.from(monthlyChartData.keys()),
    ];
  }, [monthlyChartData]);

  if (transactions.length <= 0) return null;

  function getTotalExpense() {
    return +transactions
      .reduce((a, b) => {
        return b.category !== CategoryType.Income
          ? a + getValidNumber(b.amount)
          : a;
      }, 0)
      .toFixed(2);
  }
  function getTotalIncome() {
    return +transactions
      .reduce((a, b) => {
        return b.category === CategoryType.Income
          ? a + getValidNumber(b.amount)
          : a;
      }, 0)
      .toFixed(2);
  }

  return (
    <div className="mb-4 pt-4 pb-6">
      <div className="mb-2 px-4">
        <h3 className="text-white font-semibold">
          {transformIndexToMonth(monthIndex)} {year}
        </h3>
        <p className="text-neutral-500">
          <span>
            Expense: {formatCurrency(currency)}
            {getTotalExpense()}
          </span>
          &nbsp;&nbsp;&nbsp;
          <span>
            Income: {formatCurrency(currency)}
            {getTotalIncome()}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap">
        <div className="lg:w-3/5 w-full lg:mb-0 mb-4">
          {transactions
            .sort(
              (a, b) =>
                (new Date(a.transactionDate) as any) -
                (new Date(b.transactionDate) as any)
            )
            .map((transaction, i) => (
              <MonthlyBudgetItem
                transaction={transaction}
                currency={currency}
                key={transaction._id}
              />
            ))}
        </div>
        <div className="lg:w-2/5 w-full">
          <MonthlyChart
            series={JSON.stringify(series)}
            labels={JSON.stringify(labels)}
          />
        </div>
      </div>
    </div>
  );
}

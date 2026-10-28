import { ITransaction } from "@/interfaces/ITransaction";
import { formatCurrency, transformIndexToMonth } from "@/utils";
import MonthlyBudgetItem from "../monthly-budget-item";
import MonthlyChart from "../monthly-chart";
import { memo, useMemo } from "react";
import { TransactionType } from "@/types";
import { getTransactionType, transactionTotals } from "@/utils/transactionTypes";

function MonthlyBudget({
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
      if (getTransactionType(transaction) === TransactionType.Expense)
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

  const sortedTransactions = useMemo(() => [...transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  ), [transactions]);

  if (transactions.length <= 0) return null;

  const totals = transactionTotals(transactions);

  return (
    <div className="mb-2 pt-7 pb-5 border-b border-neutral-800">
      <div className="mb-5 px-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-neutral-100 font-medium">
          {transformIndexToMonth(monthIndex)} {year}
        </h3>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-neutral-400 text-xs tabular-nums">
          <span>
            Expenses: {formatCurrency(currency)}
            {totals.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span>
            Income: {formatCurrency(currency)}
            {totals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span>Set aside: {formatCurrency(currency)}{totals.savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span>Remaining: {formatCurrency(currency)}{totals.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </p>
      </div>
      <div className="flex flex-wrap">
        <div className="lg:w-3/5 w-full lg:mb-0 mb-4">
          {sortedTransactions
            .map((transaction) => (
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

export default memo(MonthlyBudget);

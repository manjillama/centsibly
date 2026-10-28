import type { ITransaction } from "@/interfaces/ITransaction";

export default function groupTransactionsByMonth(transactions: ITransaction[], previous: ITransaction[][] = []) {
  const months: ITransaction[][] = Array.from({ length: 12 }, () => []);
  transactions.forEach((transaction) => {
    months[new Date(transaction.transactionDate).getUTCMonth()].push(transaction);
  });
  // Keep unchanged months referentially stable so their rows/charts can skip work.
  return months.map((month, index) => {
    const before = previous[index];
    return before && before.length === month.length && month.every((entry, i) => entry === before[i]) ? before : month;
  });
}

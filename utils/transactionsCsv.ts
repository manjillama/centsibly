import { ITransaction } from "@/interfaces/ITransaction";

function escapeCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function transactionsCsv(transactions: ITransaction[], currency?: string) {
  if (!transactions.length) return "";
  const headers = ["title", "category", "amount", "date", ...(currency ? ["currency"] : [])];
  const rows = transactions.map((transaction) => [
    transaction.title,
    transaction.category,
    transaction.amount,
    new Date(transaction.transactionDate).toISOString().split("T")[0],
    ...(currency ? [currency] : []),
  ].map(escapeCell).join(","));
  return [headers.join(","), ...rows].join("\n");
}

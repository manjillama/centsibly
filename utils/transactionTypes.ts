import { CategoryType, TransactionType } from "@/types";
import type { ITransaction } from "@/interfaces/ITransaction";

export const incomeCategories = ["Salary", "Freelance", "Gifts", "Other income", CategoryType.Income];
export const savingsCategories = ["Emergency fund", "Vacation fund", "Investments", "Other savings"];
export const expenseCategories = Object.values(CategoryType).filter((category) => category !== CategoryType.Income);

// Existing savings-category entries remain expenses until the user explicitly changes their type.
export function getTransactionType(transaction: Pick<ITransaction, "type" | "category">): TransactionType {
  return transaction.type ?? (transaction.category === CategoryType.Income ? TransactionType.Income : TransactionType.Expense);
}

export function categoriesForType(type: TransactionType): string[] {
  return type === TransactionType.Income ? incomeCategories : type === TransactionType.Savings ? savingsCategories : expenseCategories;
}

export function transactionTotals(transactions: ITransaction[]) {
  const totals = { income: 0, expenses: 0, savings: 0, remaining: 0 };
  transactions.forEach((transaction) => {
    const type = getTransactionType(transaction);
    const amount = Number(transaction.amount);
    if (type === TransactionType.Income) totals.income += amount;
    else if (type === TransactionType.Savings) totals.savings += amount;
    else totals.expenses += amount;
  });
  totals.remaining = totals.income - totals.expenses - totals.savings;
  return totals;
}

export function typeForCategory(category: string): TransactionType {
  if (incomeCategories.includes(category)) return TransactionType.Income;
  if (savingsCategories.includes(category)) return TransactionType.Savings;
  return TransactionType.Expense;
}

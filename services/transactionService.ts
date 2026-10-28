import { categoriesForType, getTransactionType } from "@/utils/transactionTypes";
import { TransactionType } from "@/types";
import { ITransaction } from "@/interfaces/ITransaction";
import Transaction from "@/models/Transaction";
import AppError from "@/utils/appError";
import { StatusCodes } from "http-status-codes";
import currencyService from "@/services/currencyService";
import budgetService from "@/services/budgetService";

const getUserTransactionsByYear = async (
  userId: string,
  year: string
): Promise<ITransaction[]> => {
  const startDate = new Date(`${year}-01-01T00:00:00Z`); // Start of the year
  const endDate = new Date(`${year}-12-31T23:59:59Z`); // End of the year

  return JSON.parse(
    JSON.stringify(
      await Transaction.find({
        user: userId,
        budget: null,
        transactionDate: { $gte: startDate, $lte: endDate },
      }).lean()
    )
  );
};

function validateType(data: ITransaction) {
  const type = getTransactionType(data);
  if (!Object.values(TransactionType).includes(type) || !categoriesForType(type).includes(data.category))
    throw new AppError("Choose a valid transaction type and category", StatusCodes.BAD_REQUEST);
  return type;
}

const createTransaction = async (data: ITransaction, userId: string) => {
  await currencyService.requireCurrency(userId);
  if (data.budget) await budgetService.requireUserBudget(data.budget, userId);
  const type = validateType(data);
  const { transactionDate, title, category, amount } = data;
  const transaction = await Transaction.create({
    transactionDate,
    title,
    category,
    type,
    amount,
    user: userId,
    budget: data.budget || null,
  });
  return {
    _id: transaction._id,
    budget: transaction.budget,
    transactionDate,
    title,
    category,
    type,
    amount,
  };
};

const updateTransaction = async (
  transactionId: string,
  data: ITransaction,
  userId: string
) => {
  await currencyService.requireCurrency(userId);
  let transaction = await Transaction.findOne({
    _id: transactionId,
    user: userId,
  });

  if (!transaction)
    throw new AppError(
      "Transaction with that id not found or you're not authorized.",
      StatusCodes.NOT_FOUND
    );

  const type = validateType({ ...data, type: data.type ?? (data.category === transaction.category ? transaction.type : undefined) });
  const { transactionDate, title, category, amount } = data;

  transaction.transactionDate = transactionDate;
  transaction.title = title;
  transaction.category = category;
  transaction.type = type;
  transaction.amount = amount;

  return transaction.save();
};

const deleteTransaction = async (id: string, userId: string) => {
  const transaction = await Transaction.findOneAndDelete({ _id: id, user: userId });
  if (!transaction) throw new AppError("Transaction not found", StatusCodes.NOT_FOUND);
  return transaction;
};

export default {
  deleteTransaction,
  getUserTransactionsByYear,
  createTransaction,
  updateTransaction,
};

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

const createTransaction = async (data: ITransaction, userId: string) => {
  await currencyService.requireCurrency(userId);
  if (data.budget) await budgetService.requireUserBudget(data.budget, userId);
  const { transactionDate, title, category, amount } = data;
  const transaction = await Transaction.create({
    transactionDate,
    title,
    category,
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

  const { transactionDate, title, category, amount } = data;

  transaction.transactionDate = transactionDate;
  transaction.title = title;
  transaction.category = category;
  transaction.amount = amount;

  return transaction.save();
};

export default {
  getUserTransactionsByYear,
  createTransaction,
  updateTransaction,
};

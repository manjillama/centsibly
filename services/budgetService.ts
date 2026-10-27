import { isValidObjectId } from "mongoose";
import { isCurrency } from "@/constants/currencies";
import currencyService from "@/services/currencyService";
import Budget from "@/models/Budget";
import Transaction from "@/models/Transaction";
import AppError from "@/utils/appError";
import { StatusCodes } from "http-status-codes";

const requireUserBudget = async (id: string, userId: string) => {
  if (typeof id !== "string" || !isValidObjectId(id))
    throw new AppError("Invalid budget id", StatusCodes.BAD_REQUEST);
  const budget = await Budget.findOne({ _id: id, user: userId });
  if (!budget) throw new AppError("Budget not found", StatusCodes.NOT_FOUND);
  return budget;
};

const getUserBudgets = async (userId: string) =>
  Budget.find({ user: userId }).sort({ createdAt: -1 }).lean();

const createBudget = async (name: unknown, userId: string, currency: unknown = "USD") => {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
    throw new AppError("Enter a budget name between 1 and 100 characters", StatusCodes.BAD_REQUEST);
  if (!isCurrency(currency)) throw new AppError("Choose a supported currency", StatusCodes.BAD_REQUEST);
  await currencyService.requireCurrency(userId);
  return Budget.create({ name: name.trim(), user: userId, currency });
};

const getBudgetTransactions = async (id: string, userId: string) => {
  await requireUserBudget(id, userId);
  return Transaction.find({ user: userId, budget: id }).sort({ transactionDate: -1 }).lean();
};

const renameBudget = async (id: string, name: unknown, userId: string) => {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
    throw new AppError("Enter a budget name between 1 and 100 characters", StatusCodes.BAD_REQUEST);
  const budget = await requireUserBudget(id, userId);
  budget.name = name.trim();
  return budget.save();
};

export default { requireUserBudget, getUserBudgets, createBudget, getBudgetTransactions, renameBudget };

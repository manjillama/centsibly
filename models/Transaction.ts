import { Schema } from "mongoose";
import createModel from "@/lib/createModel";
import { ITransactionDocument } from "@/interfaces/ITransaction";
import { TransactionType } from "@/types";
import { expenseCategories, incomeCategories, savingsCategories } from "@/utils/transactionTypes";

const transactionSchema = new Schema<ITransactionDocument>(
  {
    budget: {
      type: Schema.Types.ObjectId,
      ref: "Budget",
      default: null,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Missing user id (user)"],
    },
    transactionDate: {
      type: Date,
      required: [true, "Missing transaction Date (transactionDate)"],
    },
    title: {
      type: String,
      default: "",
      required: [true, "Missing transaction title (title)"],
    },
    amount: {
      type: Number,
      required: [true, "Missing transaction amount (amount)"],
    },
    type: { type: String, enum: TransactionType },
    category: {
      type: String,
      enum: [...expenseCategories, ...incomeCategories, ...savingsCategories],
      required: [true, "Missing transaction category (category)"],
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = createModel<ITransactionDocument>(
  "Transaction",
  transactionSchema
);

export default Transaction;

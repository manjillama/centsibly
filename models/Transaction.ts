import { Schema } from "mongoose";
import createModel from "@/lib/createModel";
import { ITransactionDocument } from "@/interfaces/ITransaction";
import { CategoryType } from "@/types";

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
    category: {
      type: String,
      enum: CategoryType,
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

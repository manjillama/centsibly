import mongoose, { ObjectId } from "mongoose";
import { CategoryType, TransactionType } from "@/types";

export interface ITransaction {
  _id: string;
  budget?: string | null;
  transactionDate: Date | string;
  title: string;
  category: string;
  type?: TransactionType;
  amount: number | "";
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ITransactionDocument
  extends mongoose.Document,
    Omit<ITransaction, "_id"> {
  user: string | ObjectId;
}

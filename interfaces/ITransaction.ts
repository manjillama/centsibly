import mongoose, { ObjectId } from "mongoose";
import { CategoryType } from "@/types";

export interface ITransaction {
  _id: string;
  budget?: string | null;
  transactionDate: Date | string;
  title: string;
  category: CategoryType | "";
  amount: number | "";
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ITransactionDocument
  extends mongoose.Document,
    Omit<ITransaction, "_id"> {
  user: string | ObjectId;
}

import { Schema, Document, Types } from "mongoose";
import { CURRENCIES } from "@/constants/currencies";
import createModel from "@/lib/createModel";

interface BudgetDocument extends Document {
  name: string;
  archived: boolean;
  target?: number | null;
  currency: string;
  user: Types.ObjectId;
}

const budgetSchema = new Schema<BudgetDocument>(
  {
    currency: { type: String, enum: CURRENCIES, default: "USD", immutable: true },
    archived: { type: Boolean, default: false },
    target: { type: Number, min: 0.01, default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

export default createModel<BudgetDocument>("Budget", budgetSchema);

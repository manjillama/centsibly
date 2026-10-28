import { TransactionType } from "@/types";
import { categoriesForType } from "@/utils/transactionTypes";

export default function CategoryOptions({ types = Object.values(TransactionType) }: { types?: TransactionType[] }) {
  return <>{types.map((type) => (
    <optgroup key={type} label={type === TransactionType.Expense ? "Expenses" : type === TransactionType.Income ? "Income" : "Savings"}>
      {categoriesForType(type).map((category) => <option key={category} value={category}>{category}</option>)}
    </optgroup>
  ))}</>;
}

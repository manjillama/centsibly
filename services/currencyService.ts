import User from "@/models/User";
import AppError from "@/utils/appError";
import { StatusCodes } from "http-status-codes";
import { isCurrency } from "@/constants/currencies";

const getCurrency = async (userId: string) => {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);
  return { currency: user.defaultCurrency || "USD", needsSetup: user.currencySetupRequired === true };
};
const requireCurrency = async (userId: string) => {
  const settings = await getCurrency(userId);
  if (settings.needsSetup) throw new AppError("Choose your default currency first", StatusCodes.CONFLICT);
  return settings.currency;
};
const selectCurrency = async (userId: string, currency: unknown) => {
  if (!isCurrency(currency)) throw new AppError("Choose a supported currency", StatusCodes.BAD_REQUEST);
  // Atomic: only an account explicitly awaiting setup can choose, once.
  const user = await User.findOneAndUpdate(
    { _id: userId, currencySetupRequired: true },
    { $set: { defaultCurrency: currency, currencySetupRequired: false } },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError("Your default currency is already locked", StatusCodes.CONFLICT);
  return { currency: user.defaultCurrency, needsSetup: false };
};
export default { getCurrency, requireCurrency, selectCurrency };

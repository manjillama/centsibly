export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "MXN", "NPR", "INR", "JPY", "CNY", "KRW", "SGD", "HKD", "THB", "IDR", "MYR", "PHP", "VND", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "BRL", "ARS", "CLP", "COP", "PEN", "ZAR", "AED", "SAR", "TRY", "ILS", "BDT", "PKR", "LKR"] as const;
export function isCurrency(value: unknown): value is string {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

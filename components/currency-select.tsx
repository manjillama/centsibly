import { CURRENCIES } from "@/constants/currencies";

export default function CurrencySelect({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  return <select id={id} aria-label="Currency" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg bg-neutral-800 max-w-full">
    {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency} — {names.of(currency)}</option>)}
  </select>;
}

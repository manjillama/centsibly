import styles from "./currency-select.module.css";
import { CURRENCIES } from "@/constants/currencies";

const names = new Intl.DisplayNames(["en"], { type: "currency" });
const currencyOptions = CURRENCIES.map((code) => ({ code, name: names.of(code) || code }))
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

export default function CurrencySelect({ value, onChange, id, disabled, describedBy }: { value: string; onChange: (value: string) => void; id?: string; disabled?: boolean; describedBy?: string }) {
  return <span className={styles.wrapper}><select disabled={disabled} aria-describedby={describedBy} id={id} aria-label="Currency" value={value} onChange={(event) => onChange(event.target.value)} className={styles.select}>
    {currencyOptions.map(({ code, name }) => <option key={code} value={code}>{name} ({code})</option>)}
  </select><svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>;
}

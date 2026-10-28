import BudgetWorkspace from "@/components/budget-workspace";
import Greeting from "@/components/greeting";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Your money, in focus</p>
        <Greeting />
        <p className={styles.description}>A little perspective for the everyday. A little space for your next plan.</p>
      </header>
      <BudgetWorkspace />
    </main>
  );
}

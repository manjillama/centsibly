import Link from "next/link";
import styles from "./auth.module.css";

export default function AuthShell({ mode, children }: { mode: "signin" | "signup"; children: React.ReactNode }) {
  const isSignUp = mode === "signup";
  return (
    <main className={styles.shell}>
      <section className={styles.story} aria-labelledby="auth-story-title">
        <Link href="/" className={styles.brand}>centsibly<span>.</span></Link>
        <div>
          <p className={styles.eyebrow}>A little clarity goes a long way</p>
          <h2 id="auth-story-title">Your money.<br />Your plans.<br /><span>A clearer picture.</span></h2>
          <p className={styles.description}>Make sense of the everyday, and make room for what comes next.</p>
        </div>
        <div className={styles.notes}><span>01 <span>Understand your spending</span></span><span>02 <span>Give every plan its own budget</span></span><span>03 <span>See the bigger picture</span></span></div>
      </section>
      <section className={styles.panel} aria-labelledby="auth-title">
        <div className={styles.formContent}>
          <p className={styles.eyebrow}>{isSignUp ? "A fresh start" : "Your next chapter"}</p>
          <h1 id="auth-title">{isSignUp ? "Make room for possibility." : "Welcome back."}</h1>
          <p className={styles.subtitle}>{isSignUp ? "Create your account. Get a little closer to your money." : "Log in to see where you stand and keep your plans moving."}</p>
          <div className={styles.controls}>{children}</div>
          <p className={styles.switchAccount}>{isSignUp ? "Already have an account?" : "New to centsibly?"} <Link href={isSignUp ? "/signin" : "/signup"}>{isSignUp ? "Log in" : "Create an account"} <span aria-hidden="true">↗</span></Link></p>
        </div>
        <Link href="/" className={styles.back}>← Back to home</Link>
      </section>
    </main>
  );
}

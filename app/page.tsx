import { getServerSession } from "next-auth";
import { options } from "./api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./landing.module.css";

const features = [
  { number: "01", title: "Your month, at a glance.", description: "Track income and expenses in one place. See spending by category and spot patterns across the year.", detail: "Less guesswork. More perspective." },
  { number: "02", title: "A space for every plan.", description: "Give a trip, celebration, or personal project its own budget, separate from your everyday monthly spending.", detail: "Big ideas, thoughtfully budgeted." },
  { number: "03", title: "Make it work for you.", description: "Set your default currency, choose a currency for each custom budget, and export your transactions as CSV.", detail: "Your money. Your way." },
];

export default async function HomePage() {
  const session = await getServerSession(options);
  if (session) redirect("/dashboard");

  return (
    <main className={styles.landing}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.eyebrow}><span /> A little clarity goes a long way</div>
        <h1 id="hero-title">Know your money.<br /><span>Make room for life.</span></h1>
        <p className={styles.intro}>Everyday spending. Weekend escapes. Your next big idea.<br className={styles.desktopBreak} /> Bring it all into focus with a simpler way to budget.</p>
        <div className={styles.actions}>
          <Link href="/signup" className={styles.primary}>Start your budget <span aria-hidden="true">↗</span></Link>
          <a href="#how-it-works" className={styles.secondary}>Take a closer look <span aria-hidden="true">↓</span></a>
        </div>
        <p className={styles.caption}>Track your spending. Understand your habits. Plan ahead.</p>
        <div className={styles.preview}>
          <div className={styles.previewBar}><span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span><span>Your everyday money, in focus</span><span className={styles.liveLabel}>Monthly overview</span></div>
          <Image src="/images/banner-1.png" alt="Monthly budget showing income, categorized expenses, and yearly spending trends" width={1318} height={984} priority sizes="(max-width: 768px) 94vw, 1050px" className={styles.dashboardImage} />
        </div>
      </section>

      <section id="how-it-works" className={styles.features} aria-labelledby="features-title">
        <div className={styles.sectionHeading}><p className={styles.kicker}>A clearer picture</p><h2 id="features-title">Small habits. A bigger perspective.</h2><p>Everything you need to stay close to your money.</p></div>
        <div className={styles.featureGrid}>{features.map((feature) => (
          <article key={feature.number} className={styles.feature}>
            <span className={styles.featureNumber}>{feature.number}</span><h3>{feature.title}</h3><p>{feature.description}</p><span className={styles.featureDetail}>{feature.detail}</span>
          </article>
        ))}</div>
      </section>

      <section className={styles.plans} aria-labelledby="plans-title">
        <div className={styles.planCopy}>
          <p className={styles.kicker}>Beyond the everyday</p>
          <h2 id="plans-title">Big plans deserve<br />their own little space.</h2>
          <p>That trip you keep talking about? Give it a budget. Set a spending target and track every expense, without mixing it into your monthly totals.</p>
          <ul className={styles.planList}><li>A separate budget for each trip or project</li><li>Your own dates, target, and currency</li><li>A clear view of what’s spent and what’s left</li></ul>
          <Link href="/signup" className={styles.textLink}>Make room for your next plan <span aria-hidden="true">↗</span></Link>
        </div>
        <figure className={styles.planPreview}><div className={styles.imageLabel}><span aria-hidden="true">↗</span> A little planning. A lot to look forward to.</div><Image src="/images/banner-4.png" alt="Mexico trip custom budget with a spending target, remaining balance, and travel transactions" width={1035} height={810} sizes="(max-width: 800px) 90vw, 650px" /></figure>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title"><p className={styles.kicker}>Meet your money with a plan</p><h2 id="closing-title">A little more clarity.<br />A little more possibility.</h2><Link href="/signup" className={styles.primary}>Get started with centsibly <span aria-hidden="true">↗</span></Link><p>Already have an account? <Link href="/signin">Log in</Link></p></section>
    </main>
  );
}

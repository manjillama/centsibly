<p align="center">
   <br/>
   <h2 align="center">centsibly.</h2>
   <p align="center">Track and gain insights of your income and spendings. The budget app that you always wanted.</p>
</p>

<hr/>

## Tech stacks

- Node.js 18
- Next.js 13
- NextAuth 4
- TailwindCSS
- TypeScript
- MongoDB (Mongoose)

### 1. Clone the repository and install dependencies

```
git clone https://github.com/manjillama/centsibly.git
npm install
```

### 2. Configure your local environment

Copy the .env.local.example file in this directory to .env.local (which will be ignored by Git):

```
cp .env.local.example .env.local
```

Add details for one or more providers (e.g. Google, GitHub, Email, etc).

### 3. First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Custom budgets

On the dashboard, select **Custom budgets** and create a named budget such as
“Bali trip”. Select it to add or edit expenses and income across any dates.
Custom-budget transactions have their own totals and are excluded from monthly
budgets, monthly and yearly charts, and the yearly CSV export.

Existing transactions stay in the monthly budget; no data migration is needed.
Restart the development server after updating so Mongoose reloads its schemas.

Run `npm test` for budget isolation and ownership regression checks (database
operations are mocked), and `npx tsc --noEmit` for type checking.

## Currencies

Existing accounts and budgets use USD. New accounts choose their permanent
monthly-budget currency on their first dashboard visit after signing in.
They must complete this step before adding transactions. Each new custom budget
has a currency dropdown; its currency is fixed at creation and can differ from
the monthly default or other custom budgets. Transactions inherit their budget's
currency, so totals never combine currencies and no exchange conversion occurs.


### Transaction types

Transactions use Expense, Income, or Savings, with categories specific to each type.
Remaining money is income minus expenses minus savings contributions. Spending
charts and custom-budget spending targets count expenses only; the yearly trend
chart shows savings separately. Savings entries record money set aside, rather
than transfers between linked accounts.

Existing records are not migrated: records without a type use Income when their
category is Income, and Expense otherwise. Existing Savings & Investments entries
remain expenses unless explicitly changed. CSV exports append a type column after
the existing columns.

After updating the transaction schema, restart an existing development server once
to refresh the cached Mongoose model.

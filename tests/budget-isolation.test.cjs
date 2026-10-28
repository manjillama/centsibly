const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, named = false) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => {
    if (!(id in mocks)) throw new Error(`Unexpected dependency: ${id}`);
    return mocks[id];
  } });
  return named ? exports : exports.default;
}
const types = load('types/index.ts', {}, true);
const transactionTypes = load('utils/transactionTypes.ts', { '@/types': types }, true);
class AppError extends Error { constructor(message, status) { super(message); this.status = status; } }
const base = { '@/types': types, '@/utils/transactionTypes': transactionTypes, '@/constants/currencies': { isCurrency: (value) => ['USD', 'EUR', 'MXN'].includes(value) }, '@/services/currencyService': { requireCurrency: async () => 'USD' }, '@/utils/appError': AppError, 'http-status-codes': { StatusCodes: { BAD_REQUEST: 400, NOT_FOUND: 404 } } };
const budgetId = '123456789012345678901234';

test('yearly query includes legacy/monthly records and excludes custom budgets', async () => {
  const rows = [
    { user: 'alice', title: 'legacy' },
    { user: 'alice', title: 'monthly', budget: null },
    { user: 'alice', title: 'trip', budget: budgetId },
    { user: 'bob', title: 'other user' },
  ];
  const service = load('services/transactionService.ts', { ...base,
    '@/services/budgetService': {},
    '@/models/Transaction': { find: (filter) => {
      assert.equal(filter.budget, null);
      assert.equal(filter.user, 'alice');
      assert.ok(filter.transactionDate.$gte);
      return { lean: async () => rows.filter((row) => row.user === filter.user && row.budget == null) };
    } },
  });
  const result = await service.getUserTransactionsByYear('alice', '2026');
  assert.deepEqual(Array.from(result, (row) => row.title), ['legacy', 'monthly']);
});

test('creation checks custom budget ownership and defaults old clients to monthly', async () => {
  let checked = 0;
  let saved;
  const service = load('services/transactionService.ts', { ...base,
    '@/services/budgetService': { requireUserBudget: async (id, user) => { checked++; assert.equal(user, 'alice'); if (id !== budgetId) throw new Error('Budget not found'); } },
    '@/models/Transaction': { create: async (data) => { saved = data; return { ...data, _id: 'new' }; } },
  });
  const entry = { title: 'Flight', amount: 200, category: 'Travel', transactionDate: '2026-10-27' };
  await service.createTransaction(entry, 'alice');
  assert.equal(saved.budget, null);
  assert.equal(checked, 0);
  await service.createTransaction({ ...entry, budget: budgetId }, 'alice');
  assert.equal(saved.budget, budgetId);
  await assert.rejects(service.createTransaction({ ...entry, budget: 'foreign' }, 'alice'), /Budget not found/);
  assert.equal(checked, 2);
});

test('editing preserves budget membership and enforces transaction ownership', async () => {
  const document = { budget: budgetId, save: async function () { return this; } };
  const service = load('services/transactionService.ts', { ...base, '@/services/budgetService': {},
    '@/models/Transaction': { findOne: async (filter) => filter.user === 'alice' ? document : null },
  });
  await service.updateTransaction('entry', { title: 'Hotel', amount: 90, category: 'Travel', transactionDate: '2027-01-02', budget: null }, 'alice');
  assert.equal(document.budget, budgetId);
  assert.equal(document.title, 'Hotel');
  await assert.rejects(service.updateTransaction('entry', {}, 'bob'), /not found/);
});

test('budgets validate names and scope all reads by owner without a date limit', async () => {
  let saved;
  let filter;
  const service = load('services/budgetService.ts', { ...base,
    mongoose: { isValidObjectId: (id) => /^[a-f0-9]{24}$/.test(id) },
    '@/models/Budget': {
      findOne: async (query) => query.user === 'alice' ? { _id: budgetId } : null,
      create: async (data) => { saved = data; return data; },
    },
    '@/models/Transaction': { find: (query) => { filter = query; return { sort: () => ({ lean: async () => [] }) }; } },
  });
  for (const name of ['', '   ', null, 'x'.repeat(101)]) await assert.rejects(service.createBudget(name, 'alice'));
  await service.createBudget(' Bali trip ', 'alice');
  assert.equal(saved.name, 'Bali trip');
  assert.equal(saved.user, 'alice');
  await assert.rejects(service.requireUserBudget('invalid', 'alice'), /Invalid budget/);
  await assert.rejects(service.getBudgetTransactions(budgetId, 'bob'), /Budget not found/);
  await service.getBudgetTransactions(budgetId, 'alice');
  assert.equal(filter.user, 'alice');
  assert.equal(filter.budget, budgetId);
  assert.equal(filter.transactionDate, undefined);
});

test('existing accounts default to locked USD, while new accounts must choose first', async () => {
  let row = {};
  const service = load('services/currencyService.ts', { ...base,
    '@/models/User': { findById: () => ({ lean: async () => row }) },
  });
  assert.equal((await service.getCurrency('legacy')).currency, 'USD');
  assert.equal((await service.getCurrency('legacy')).needsSetup, false);
  assert.equal(await service.requireCurrency('legacy'), 'USD');
  row = { defaultCurrency: 'USD', currencySetupRequired: true };
  await assert.rejects(service.requireCurrency('new'), /Choose your default/);
});

test('currency selection is atomic, validated, and can only happen once', async () => {
  let pending = true;
  let calls = 0;
  const service = load('services/currencyService.ts', { ...base,
    '@/models/User': { findOneAndUpdate: async (filter, update, options) => {
      calls++;
      assert.equal(filter._id, 'alice');
      assert.equal(filter.currencySetupRequired, true);
      assert.equal(options.runValidators, true);
      if (!pending) return null;
      pending = false;
      assert.equal(update.$set.currencySetupRequired, false);
      return { defaultCurrency: update.$set.defaultCurrency };
    } },
  });
  await assert.rejects(service.selectCurrency('alice', 'INVALID'), /supported currency/);
  assert.equal(calls, 0);
  const results = await Promise.allSettled([service.selectCurrency('alice', 'MXN'), service.selectCurrency('alice', 'EUR')]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(results[0].value.currency, 'MXN');
  await assert.rejects(service.selectCurrency('alice', 'USD'), /already locked/);
});

test('custom budget currencies are independent and old clients default to USD', async () => {
  const records = [];
  const service = load('services/budgetService.ts', { ...base,
    mongoose: {}, '@/models/Transaction': {},
    '@/models/Budget': { create: async (data) => { records.push(data); return data; } },
  });
  await service.createBudget('Mexico trip', 'alice', 'MXN');
  await service.createBudget('Birthday', 'alice', 'EUR');
  await service.createBudget('Legacy client', 'alice');
  assert.deepEqual(records.map((row) => row.currency), ['MXN', 'EUR', 'USD']);
  await assert.rejects(service.createBudget('Invalid', 'alice', 'INVALID'), /supported currency/);
});

test('transaction currency supplied by client is ignored; the budget defines the unit', async () => {
  let saved;
  const service = load('services/transactionService.ts', { ...base,
    '@/services/budgetService': { requireUserBudget: async () => ({ currency: 'MXN' }) },
    '@/models/Transaction': { create: async (data) => { saved = data; return { ...data, _id: 'new' }; } },
  });
  await service.createTransaction({ title: 'Hotel', amount: 100, category: 'Travel', transactionDate: '2026-10-27', budget: budgetId, currency: 'EUR' }, 'alice');
  assert.equal(saved.budget, budgetId);
  assert.equal(saved.currency, undefined);
  assert.equal(saved.amount, 100);
});

test('CSV exports preserve yearly columns and include custom currency with escaped fields', () => {
  const csv = load('utils/transactionsCsv.ts', { './transactionTypes': transactionTypes });
  const entries = [{ title: 'Hotel, "Bali"\nNight 1', category: 'Travel', amount: 0, transactionDate: '2026-10-27T00:00:00.000Z' }];
  assert.equal(csv(entries), 'title,category,amount,date,type\n"Hotel, ""Bali""\nNight 1",Travel,0,2026-10-27,expense');
  assert.equal(csv(entries, 'IDR'), 'title,category,amount,date,currency,type\n"Hotel, ""Bali""\nNight 1",Travel,0,2026-10-27,IDR,expense');
  assert.equal(csv([], 'USD'), '');
});

test('renaming validates titles and only changes the owned budget name', async () => {
  let saves = 0;
  const document = { name: 'Trip', currency: 'MXN', user: 'alice', save: async function () { saves++; return this; } };
  const service = load('services/budgetService.ts', { ...base,
    mongoose: { isValidObjectId: (id) => /^[a-f0-9]{24}$/.test(id) },
    '@/models/Budget': { findOne: async (query) => query._id === budgetId && query.user === 'alice' ? document : null },
    '@/models/Transaction': {},
  });
  for (const name of ['', '   ', null, 123, 'x'.repeat(101)]) {
    await assert.rejects(service.renameBudget(budgetId, name, 'alice'), /budget name/);
  }
  await assert.rejects(service.renameBudget(budgetId, 'New title', 'bob'), /Budget not found/);
  await assert.rejects(service.renameBudget('invalid', 'New title', 'alice'), /Invalid budget id/);
  assert.equal(saves, 0);
  const result = await service.renameBudget(budgetId, '  Mexico vacation  ', 'alice');
  assert.equal(result.name, 'Mexico vacation');
  assert.equal(result.currency, 'MXN');
  assert.equal(result.user, 'alice');
  assert.equal(saves, 1);
});

test('deletion is scoped to the transaction owner', async () => {
  let deleted = false;
  const service = load('services/transactionService.ts', { ...base,
    '@/services/budgetService': {},
    '@/models/Transaction': { findOneAndDelete: async (filter) => {
      assert.equal(filter._id, 'entry');
      if (filter.user !== 'alice') return null;
      deleted = true;
      return { _id: 'entry' };
    } },
  });
  await assert.rejects(service.deleteTransaction('entry', 'bob'), /not found/);
  assert.equal(deleted, false);
  await service.deleteTransaction('entry', 'alice');
  assert.equal(deleted, true);
});

test('budget targets are optional, positive, and owned by the current user', async () => {
  let saves = 0;
  const document = { name: 'Trip', currency: 'MXN', target: null, save: async function () { saves++; return this; } };
  const service = load('services/budgetService.ts', { ...base,
    mongoose: { isValidObjectId: (id) => id === budgetId },
    '@/models/Budget': { findOne: async (query) => query.user === 'alice' ? document : null },
    '@/models/Transaction': {},
  });
  for (const target of [undefined, 0, -1, '100', NaN, Infinity])
    await assert.rejects(service.setBudgetTarget(budgetId, target, 'alice'), /target greater than zero/);
  await assert.rejects(service.setBudgetTarget(budgetId, 500, 'bob'), /Budget not found/);
  assert.equal(saves, 0);
  await service.setBudgetTarget(budgetId, 500, 'alice');
  assert.equal(document.target, 500);
  assert.equal(document.name, 'Trip');
  assert.equal(document.currency, 'MXN');
  await service.setBudgetTarget(budgetId, null, 'alice');
  assert.equal(document.target, null);
  assert.equal(saves, 2);
});

test('budget sidebar totals use only owned custom expenses', async () => {
  const service = load('services/budgetService.ts', { ...base,
    mongoose: {},
    '@/models/Budget': { find: (filter) => {
      assert.equal(filter.user, 'alice');
      return { sort: () => ({ lean: async () => [{ _id: budgetId, target: 100 }, { _id: 'second' }] }) };
    } },
    '@/models/Transaction': { find: (filter) => {
      assert.equal(filter.user, 'alice');
      assert.equal(filter.category, undefined);
      assert.deepEqual(Array.from(filter.budget.$in), [budgetId, 'second']);
      return { select: () => ({ lean: async () => [{ budget: budgetId, category: 'Travel', amount: 20 }, { budget: budgetId, category: 'Savings & Investments', amount: 15.5 }, { budget: budgetId, type: 'income', category: 'Salary', amount: 200 }, { budget: budgetId, category: 'Income', amount: 50 }, { budget: budgetId, type: 'savings', category: 'Emergency fund', amount: 100 }] }) };
    } },
  });
  const budgets = await service.getUserBudgets('alice');
  assert.equal(budgets[0].spent, 35.5);
  assert.equal(budgets[1].spent, 0);
});

test('archiving and restoring preserve budget data and require ownership', async () => {
  let saves = 0;
  const document = { name: 'Trip', target: 500, currency: 'MXN', archived: false, save: async function () { saves++; return this; } };
  const service = load('services/budgetService.ts', { ...base,
    mongoose: { isValidObjectId: (id) => id === budgetId },
    '@/models/Budget': { findOne: async (query) => query.user === 'alice' ? document : null },
    '@/models/Transaction': {},
  });
  for (const value of [undefined, null, 'true', 1])
    await assert.rejects(service.setBudgetArchived(budgetId, value, 'alice'), /archive status/);
  await assert.rejects(service.setBudgetArchived(budgetId, true, 'bob'), /Budget not found/);
  assert.equal(saves, 0);
  await service.setBudgetArchived(budgetId, true, 'alice');
  assert.equal(document.archived, true);
  await service.setBudgetArchived(budgetId, false, 'alice');
  assert.equal(document.archived, false);
  assert.equal(document.name, 'Trip');
  assert.equal(document.target, 500);
  assert.equal(document.currency, 'MXN');
  assert.equal(saves, 2);
});


test('types preserve historical savings expenses and separate new savings from spending', () => {
  const rows = [
    { category: 'Income', amount: 1000 },
    { category: 'Savings & Investments', amount: 100 },
    { category: 'Food', amount: 50 },
    { type: 'income', category: 'Freelance', amount: 200 },
    { type: 'savings', category: 'Emergency fund', amount: 300 },
  ];
  const totals = transactionTypes.transactionTotals(rows);
  assert.equal(totals.income, 1200);
  assert.equal(totals.expenses, 150);
  assert.equal(totals.savings, 300);
  assert.equal(totals.remaining, 750);
  assert.equal(transactionTypes.getTransactionType(rows[1]), 'expense');
});

test('creation and editing persist types and reject mismatched categories', async () => {
  let created;
  let saves = 0;
  const document = { budget: budgetId, save: async function () { saves++; return this; } };
  const service = load('services/transactionService.ts', { ...base,
    '@/services/budgetService': { requireUserBudget: async () => ({}) },
    '@/models/Transaction': {
      create: async (data) => { created = data; return { ...data, _id: 'new' }; },
      findOne: async () => document,
    },
  });
  const entry = { title: 'Set aside', amount: 100, transactionDate: '2026-10-27', budget: budgetId };
  for (const [type, category] of [['expense', 'Food'], ['income', 'Salary'], ['savings', 'Emergency fund']]) {
    const result = await service.createTransaction({ ...entry, type, category }, 'alice');
    assert.equal(created.type, type);
    assert.equal(result.type, type);
    await service.updateTransaction('entry', { ...entry, type, category }, 'alice');
    assert.equal(document.type, type);
    assert.equal(document.budget, budgetId);
  }
  for (const [type, category] of [['expense', 'Salary'], ['income', 'Food'], ['savings', 'Travel'], ['invalid', 'Food']]) {
    await assert.rejects(service.createTransaction({ ...entry, type, category }, 'alice'), /valid transaction type/);
    await assert.rejects(service.updateTransaction('entry', { ...entry, type, category }, 'alice'), /valid transaction type/);
  }
  assert.equal(saves, 3);
  await service.updateTransaction('entry', { ...entry, category: 'Emergency fund' }, 'alice');
  assert.equal(document.type, 'savings');
  await service.createTransaction({ ...entry, category: 'Income' }, 'alice');
  assert.equal(created.type, 'income');
  await service.createTransaction({ ...entry, category: 'Savings & Investments' }, 'alice');
  assert.equal(created.type, 'expense');
});

test('CSV includes inferred and explicit types while preserving existing column order', () => {
  const csv = load('utils/transactionsCsv.ts', { './transactionTypes': transactionTypes });
  const rows = [
    { title: 'Pay', category: 'Income', amount: 1000, transactionDate: '2026-10-27' },
    { title: 'Fund', category: 'Emergency fund', type: 'savings', amount: 100, transactionDate: '2026-10-27' },
  ];
  assert.equal(csv(rows, 'USD'), 'title,category,amount,date,currency,type\nPay,Income,1000,2026-10-27,USD,income\nFund,Emergency fund,100,2026-10-27,USD,savings');
});


test('one category choice determines type without reclassifying legacy savings expenses', () => {
  for (const type of Object.values(types.TransactionType)) {
    for (const category of transactionTypes.categoriesForType(type)) {
      assert.equal(transactionTypes.typeForCategory(category), type);
    }
  }
  assert.equal(transactionTypes.typeForCategory('Savings & Investments'), 'expense');
});

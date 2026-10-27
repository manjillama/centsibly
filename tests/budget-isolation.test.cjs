const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => {
    if (!(id in mocks)) throw new Error(`Unexpected dependency: ${id}`);
    return mocks[id];
  } });
  return exports.default;
}
class AppError extends Error { constructor(message, status) { super(message); this.status = status; } }
const base = { '@/constants/currencies': { isCurrency: (value) => ['USD', 'EUR', 'MXN'].includes(value) }, '@/services/currencyService': { requireCurrency: async () => 'USD' }, '@/utils/appError': AppError, 'http-status-codes': { StatusCodes: { BAD_REQUEST: 400, NOT_FOUND: 404 } } };
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
  const csv = load('utils/transactionsCsv.ts', {});
  const entries = [{ title: 'Hotel, "Bali"\nNight 1', category: 'Travel', amount: 0, transactionDate: '2026-10-27T00:00:00.000Z' }];
  assert.equal(csv(entries), 'title,category,amount,date\n"Hotel, ""Bali""\nNight 1",Travel,0,2026-10-27');
  assert.equal(csv(entries, 'IDR'), 'title,category,amount,date,currency\n"Hotel, ""Bali""\nNight 1",Travel,0,2026-10-27,IDR');
  assert.equal(csv([], 'USD'), '');
});

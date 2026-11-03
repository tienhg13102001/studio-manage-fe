import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as packageProfit from '../src/utils/packageProfit.ts';

const { calcProfit, createWorkbookProfitForm, findWorkbookCostTemplate, fromProfitScenario } =
  packageProfit;

test('the 44-student workbook example produces its saved cost and profit totals', () => {
  assert.equal(typeof createWorkbookProfitForm, 'function');
  const result = calcProfit(createWorkbookProfitForm());

  assert.deepEqual(
    {
      revenue: result.revenue,
      crew: result.crew,
      video: result.video,
      costume: result.costume,
      postProduction: result.postProduction,
      print: result.print,
      accessory: result.accessory,
      travel: result.travel,
      other: result.other,
      totalCost: result.totalCost,
      profit: result.profit,
    },
    {
      revenue: 23_716_000,
      crew: 5_000_000,
      video: 0,
      costume: 4_840_000,
      postProduction: 800_000,
      print: 912_000,
      accessory: 1_100_000,
      travel: 4_000_000,
      other: 1_000_000,
      totalCost: 17_652_000,
      profit: 6_064_000,
    },
  );
  assert.equal(result.margin, 6_064_000 / 23_716_000);
});

test('student-based lines follow class size while workbook travel quantities stay explicit', () => {
  const form = createWorkbookProfitForm();
  const result = calcProfit({ ...form, students: 30, pricePerMember: 600_000 });

  assert.equal(result.costume, 3_860_000);
  assert.equal(result.print, 660_000);
  assert.equal(result.travel, 4_000_000);
  assert.equal(result.profit, 1_580_000);
});

test('older scenarios keep one rate for every photographer', () => {
  const result = calcProfit({
    pricePerMember: 500_000,
    students: 10,
    crewCount: 2,
    crewRate: 1_500_000,
    videoCrewCount: 0,
    videoCrewRate: 0,
    printItems: [],
    costumeItems: [],
    travelItems: [],
    otherCosts: [],
  });

  assert.equal(result.crew, 3_000_000);
  assert.equal(result.profit, 2_000_000);
});

test('loading an old saved scenario preserves its original costs', () => {
  assert.equal(typeof fromProfitScenario, 'function');
  const form = fromProfitScenario({
    package: null,
    schedule: null,
    pricePerMember: 1_000_000,
    students: 10,
    crewCount: 2,
    crewRate: 1_500_000,
    videoCrewCount: 0,
    videoCrewRate: 0,
    printItems: [],
    printCostPerStudent: 9_000,
    costumeItems: [],
    costumeCost: 100_000,
    travelItems: [{ label: 'Đi lại', unitPrice: 100_000, quantity: 2, unit: 'crew' }],
    otherCosts: [],
  });

  assert.equal(form.leadCount, 0);
  assert.equal(form.leadRate, 0);
  assert.deepEqual(form.postProductionItems, []);
  assert.deepEqual(form.accessoryItems, []);
  assert.equal(form.travelItems[0].unit, 'crew');
  assert.equal(calcProfit(form).profit, 6_410_000);
});

test('loading a workbook scenario preserves explicit travel quantities', () => {
  const saved = { ...createWorkbookProfitForm(), name: '12C4', _id: 'saved-id' };
  const form = fromProfitScenario(saved);

  assert.equal(form.leadCount, 1);
  assert.equal(form.travelItems[0].unit, 'class');
  assert.equal(calcProfit(form).profit, 6_064_000);
});

test('class selection skips old templates so workbook rates remain the default', () => {
  assert.equal(typeof findWorkbookCostTemplate, 'function');
  const workbook = createWorkbookProfitForm();
  const old = {
    ...workbook,
    _id: 'old',
    package: { _id: 'pkg' },
    leadCount: undefined,
    leadRate: undefined,
    postProductionItems: undefined,
    accessoryItems: undefined,
  };
  const current = { ...workbook, _id: 'current', package: { _id: 'pkg' } };

  assert.equal(findWorkbookCostTemplate([old, current], 'pkg'), current);
  assert.equal(findWorkbookCostTemplate([old], 'pkg'), undefined);
});

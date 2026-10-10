import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const date = '2020-01-01';
async function initial(request: APIRequestContext, type: string, value: number, subcategory: string | null = null) {
  const response = await request.post('/api/portfolio-changes', {
    data: {
      requestId: randomUUID(),
      kind: 'INITIAL',
      owner: 'jakub',
      type,
      subcategory,
      date,
      valuePln: value,
      amountPln: value
    }
  });
  expect(response.ok()).toBeTruthy();
}

test.beforeEach(async ({ request }) => {
  const response = await request.post('/api/database/import', {
    multipart: {
      file: {
        name: 'empty.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ formatVersion: 2, entries: [], operations: [], plans: {} }))
      }
    }
  });
  expect(response.ok()).toBeTruthy();
});

test('filters and real CSS panel visibility remain consistent', async ({ page, request }) => {
  await initial(request, 'GIELDA', 200, 'ZLOTO');
  await initial(request, 'GIELDA', 1000, 'RYNKI_ROZWINIETE');
  await initial(request, 'GIELDA', 500, 'RYNKI_ROZWIJAJACE_SIE');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Wszystkie inwestycje', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.locator('.savingsHeadline')).toBeVisible();
  const headline = await page.locator('.savingsHeadline').boundingBox();
  expect(headline!.y + headline!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.getByRole('button', { name: 'Giełda', exact: true }).click();
  await page.getByRole('button', { name: 'Złoto', exact: true }).click();
  await expect(page.locator('.savingsHeadline .summaryTotal')).toContainText('200,00');
  await expect(page.getByRole('rowheader', { name: /Rynki rozwinięte/ })).toHaveCount(0);
  await expect(page.locator('.graphPanel .metric').first()).toContainText('200,00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  for (const tab of ['Aktualizacja', 'Co dokupić?', 'Historia', 'Ustawienia']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.locator('#portfolio-panel-summary')).toBeHidden();
    await expect(page.getByRole('tabpanel', { name: tab, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('purchase moves existing cash, creates no profit and can be undone as one event', async ({ page, request }) => {
  await initial(request, 'KONTO_BANKOWE', 1000);
  await initial(request, 'GIELDA', 1000, 'RYNKI_ROZWINIETE');
  await page.goto('/');
  await page.getByRole('tab', { name: 'Aktualizacja' }).click();
  await page.locator('#portfolio-change-type').selectOption('GIELDA');
  await page.locator('#portfolio-change-subcategory').selectOption('RYNKI_ROZWINIETE');
  await page.locator('#portfolio-change-operation-reason').selectOption('BUY');
  await page.getByLabel('Konto finansujące zakup / przyjmujące sprzedaż').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('100');
  await page.getByRole('button', { name: 'Zaktualizuj portfel', exact: true }).click();
  await expect(page.locator('.formFeedback')).toContainText('Podsumowanie jest aktualne');
  const result = await (await request.get('/api/portfolio-performance?owner=jakub')).json();
  expect(result.currentValuePln).toBe(2000);
  expect(result.nominalResultPln).toBe(0);
  expect(result.depositsTotalPln).toBe(2000);
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('.entryRow')
    .filter({ hasText: 'Zakup' })
    .getByRole('button', { name: 'Cofnij zmianę', exact: true })
    .click();
  await expect(page.locator('.entryRow').filter({ hasText: 'Zakup' })).toHaveCount(0);
  const operations = await (await request.get('/api/investment-operations?owner=jakub')).json();
  expect(operations).toHaveLength(2);
  expect(operations.every((o: { operationType: string }) => o.operationType === 'INITIAL')).toBeTruthy();
});

test('budget is conserved and invalid draft weights never persist or produce advice', async ({ page, request }) => {
  await initial(request, 'OBLIGACJE', 2000, 'TRZYLETNIE');
  await initial(request, 'GIELDA', 200, 'ZLOTO');
  await initial(request, 'GIELDA', 1100, 'RYNKI_ROZWINIETE');
  await initial(request, 'GIELDA', 500, 'RYNKI_ROZWIJAJACE_SIE');
  await page.goto('/');
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  const table = page.getByRole('table', { name: 'Co kupić według mojego planu' });
  await expect(table).toBeVisible();
  await page.getByLabel('Mam do zainwestowania — zł').fill('100');
  const cells = await table.locator('tbody tr td:nth-child(5)').allTextContents();
  const cents = cells.reduce(
    (sum, text) =>
      sum +
      (text.includes('Nie dokupuj') ? 0 : Math.round(Number(text.replace(/[^0-9,-]/g, '').replace(',', '.')) * 100)),
    0
  );
  expect(cents).toBe(10000);
  await page.getByLabel('Obligacje — % całego planu').fill('80');
  await expect(page.getByRole('button', { name: 'Zapisz mój plan' })).toBeDisabled();
  await expect(table).toHaveCount(0);
  await page.reload();
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await expect(page.getByLabel('Obligacje — % całego planu')).toHaveValue('50');
});

test('lost response followed by reload and retry never duplicates a deposit', async ({ page, request }) => {
  await initial(request, 'KONTO_BANKOWE', 500);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Aktualizacja' }).click();
  await page.locator('#portfolio-change-type').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('25');
  await page.route('**/api/portfolio-changes', async (route) => {
    await route.fetch();
    await route.abort();
  });
  await page.getByRole('button', { name: 'Zaktualizuj portfel', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nie udało się zapisać zmiany');
  await page.unroute('**/api/portfolio-changes');
  await page.reload();
  await page.getByRole('tab', { name: 'Aktualizacja' }).click();
  await page.locator('#portfolio-change-type').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('25');
  await page.getByRole('button', { name: 'Zaktualizuj portfel', exact: true }).click();
  await expect(page.locator('.formFeedback')).toContainText('Podsumowanie jest aktualne');
  const operations = await (await request.get('/api/investment-operations?owner=jakub')).json();
  expect(operations).toHaveLength(2);
  const performance = await (await request.get('/api/portfolio-performance?owner=jakub')).json();
  expect(performance.currentValuePln).toBe(525);
  expect(performance.nominalResultPln).toBe(0);
});

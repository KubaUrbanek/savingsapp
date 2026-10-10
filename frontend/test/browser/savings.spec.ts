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
  await page.getByText(/Filtruj inwestycje/).click();
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
  await page.getByText('Zobacz historię wartości').click();
  await expect(page.locator('.graphPanel .metric').first()).toContainText('200,00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  for (const tab of ['Co dokupić?', 'Historia']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.locator('#portfolio-panel-summary')).toBeHidden();
    await expect(page.getByRole('tabpanel', { name: tab, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.getByRole('tab', { name: 'Przegląd' }).click();
  await page.getByRole('button', { name: 'Wszystkie inwestycje' }).click();
  await expect(page.locator('.savingsHeadline .summaryTotal')).toContainText('1700,00');
  await page.getByRole('button', { name: 'Razem' }).click();
  await expect(page.locator('.savingsHeadline .metric').last()).toContainText('0,00');
  await expect(page.locator('.savingsHeadline .metric').last()).not.toContainText('Brak danych');
  await page.getByRole('tab', { name: 'Co dokupić?' }).click();
  await expect(page.getByLabel('Mam do zainwestowania — zł')).toBeVisible();
  await page.getByRole('button', { name: 'Ustawienia', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pobierz kopię danych' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('purchase moves existing cash, creates no profit and can be undone as one event', async ({ page, request }) => {
  await initial(request, 'KONTO_BANKOWE', 1000);
  await initial(request, 'GIELDA', 1000, 'RYNKI_ROZWINIETE');
  await page.goto('/');
  await page.getByRole('button', { name: 'Dodaj zmianę', exact: true }).click();
  await page.locator('#portfolio-change-type').selectOption('GIELDA');
  await page.locator('#portfolio-change-subcategory').selectOption('RYNKI_ROZWINIETE');
  await page.locator('#portfolio-change-operation-type').selectOption('BUY');
  await page.getByLabel('Płacę z konta').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('100');
  await page.getByRole('button', { name: 'Zapisz zmianę', exact: true }).click();
  await expect(page.locator('.formFeedback')).toContainText('Podsumowanie jest aktualne');
  const result = await (await request.get('/api/portfolio-performance?owner=jakub')).json();
  expect(result.currentValuePln).toBe(2000);
  expect(result.nominalResultPln).toBe(0);
  expect(result.depositsTotalPln).toBe(2000);
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  const purchase = page.locator('.entryRow').filter({ hasText: 'Zakup' });
  await expect(purchase).toHaveCount(1);
  await purchase.getByRole('button', { name: 'Popraw' }).click();
  await expect(page.getByRole('dialog')).toContainText('Jakub');
  await page.getByLabel('Kwota — zł').fill('250');
  await page.getByRole('button', { name: 'Zapisz poprawkę' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const balances = await (await request.get('/api/investments?owner=jakub')).json();
  expect(balances.filter((e: { type: string }) => e.type === 'KONTO_BANKOWE').at(0).valuePln).toBe(750);
  expect(balances.filter((e: { type: string }) => e.type === 'GIELDA').at(0).valuePln).toBe(1250);
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
  const purchases = page.getByRole('list', { name: 'Proponowane zakupy' });
  await expect(page.getByLabel('Mam do zainwestowania — zł')).toBeEnabled();
  await page.getByLabel('Mam do zainwestowania — zł').fill('100');
  const cells = await purchases.locator('.purchaseAmount').allTextContents();
  const cents = cells.reduce(
    (sum, text) =>
      sum +
      (text.includes('Nie dokupuj') ? 0 : Math.round(Number(text.replace(/[^0-9,-]/g, '').replace(',', '.')) * 100)),
    0
  );
  expect(cents).toBe(10000);
  await page.getByText('Zmień mój plan').click();
  await page.getByLabel('Obligacje — % całego planu').fill('80');
  await expect(page.getByRole('button', { name: 'Zapisz mój plan' })).toBeDisabled();
  await expect(purchases).toHaveCount(0);
  await page.reload();
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await page.getByText('Zmień mój plan').click();
  await expect(page.getByLabel('Obligacje — % całego planu')).toHaveValue('50');
});

test('lost response followed by reload and retry never duplicates a deposit', async ({ page, request }) => {
  await initial(request, 'KONTO_BANKOWE', 500);
  await page.goto('/');
  await page.getByRole('button', { name: 'Dodaj zmianę', exact: true }).click();
  await page.locator('#portfolio-change-type').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('25');
  await page.route('**/api/portfolio-changes', async (route) => {
    await route.fetch();
    await route.abort();
  });
  await page.getByRole('button', { name: 'Zapisz zmianę', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nie udało się zapisać zmiany');
  await page.unroute('**/api/portfolio-changes');
  await page.reload();
  await page.getByRole('button', { name: 'Dodaj zmianę', exact: true }).click();
  await page.locator('#portfolio-change-type').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('25');
  await page.getByRole('button', { name: 'Zapisz zmianę', exact: true }).click();
  await expect(page.locator('.formFeedback')).toContainText('Podsumowanie jest aktualne');
  const operations = await (await request.get('/api/investment-operations?owner=jakub')).json();
  expect(operations).toHaveLength(2);
  const performance = await (await request.get('/api/portfolio-performance?owner=jakub')).json();
  expect(performance.currentValuePln).toBe(525);
  expect(performance.nominalResultPln).toBe(0);
});

test('first use records existing value without inventing contributions and can complete them later', async ({
  page,
  request
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dodaj posiadane oszczędności', exact: true }).click();
  await expect(page.getByLabel('Co chcesz zrobić?')).toHaveValue('INITIAL');
  await page.getByLabel('Ile masz teraz — zł').fill('700');
  await page.getByLabel('Znam kwotę, którą wpłaciłem').uncheck();
  await page.getByLabel('Data zmiany').fill('2020-01-01');
  await page.getByRole('button', { name: 'Zapisz zmianę', exact: true }).click();
  await expect(page.locator('.savingsHeadline')).toContainText('700,00');
  await expect(page.locator('.savingsHeadline .metric').last()).toContainText('Brak danych o wpłatach');
  await page.getByRole('button', { name: 'Uzupełnij wpłaty', exact: true }).click();
  await expect(page.getByLabel('Ile masz teraz — zł')).toHaveValue('700');
  await page.getByLabel('Ile łącznie wpłaciłem — zł').fill('600');
  await page.getByLabel('Data zmiany').fill('2020-01-02');
  await page.getByRole('button', { name: 'Zapisz zmianę', exact: true }).click();
  await expect(page.locator('.savingsHeadline .metric').last()).toContainText('+100,00');
  expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(700);
  if (page.viewportSize()!.width < 640) {
    await expect(page.locator('.holdingsCards')).toBeVisible();
    await expect(page.locator('.holdingsTable')).toBeHidden();
    await expect(page.locator('.holdingCard')).toContainText('+100,00');
    await expect(page.locator('.holdingCard details')).not.toHaveAttribute('open');
  } else {
    await expect(page.locator('.holdingsTable')).toBeVisible();
    await expect(page.locator('.holdingsCards')).toBeHidden();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('household draft owner is explicit, modal keeps background controls inactive and Escape restores the trigger', async ({
  page,
  request
}) => {
  await initial(request, 'KONTO_BANKOWE', 500);
  await page.goto('/');
  await page.getByRole('button', { name: 'Razem', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Dodaj zmianę', exact: true });
  await trigger.click();
  await page.getByLabel('Kwota — zł').fill('15');
  await page.getByLabel('Zapisujesz dla').selectOption('zosia');
  await expect(page.getByLabel('Kwota — zł')).toHaveValue('');
  await expect(page.getByLabel('Inwestycja / rachunek')).toHaveValue('');
  await page.getByLabel('Inwestycja / rachunek').selectOption('KONTO_BANKOWE');
  await page.getByLabel('Kwota — zł').fill('20');
  await page.getByLabel('Data zmiany').fill('2020-02-01');
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    // Native dialogs allow the browser chrome in the Tab cycle, but never background page controls.
    expect(
      await page.evaluate(
        () => document.activeElement === document.body || document.activeElement?.closest('dialog') !== null
      )
    ).toBeTruthy();
    expect(await page.locator('dialog').evaluate((dialog) => dialog.matches(':modal'))).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Zapisz zmianę', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const zosia = await (await request.get('/api/portfolio-performance?owner=zosia')).json();
  expect(zosia.currentValuePln).toBe(20);
  expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(500);
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

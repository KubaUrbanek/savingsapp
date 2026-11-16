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

test('overview filters and chart context survive tabs and owner changes', async ({ page, request }) => {
  await initial(request, 'GIELDA', 200, 'ZLOTO');
  await initial(request, 'GIELDA', 1000, 'RYNKI_ROZWINIETE');
  await initial(request, 'PPK', 500);
  await initial(request, 'PPO', 300);
  await page.goto('/');
  const total = page.locator('.savingsHeadline .summaryTotal');
  await expect(total).toContainText('2000,00');
  await page.getByText('Filtruj inwestycje', { exact: true }).click();
  await page.getByRole('checkbox', { name: /PPK/ }).uncheck();
  await page.getByRole('checkbox', { name: /PPO/ }).uncheck();
  await expect(total).toContainText('1200,00');
  const charts = page.locator('.chartsDisclosure');
  if (!((await charts.getAttribute('open')) !== null)) await charts.locator(':scope > summary').click();
  await page.getByLabel('Pokaż rozbicie').check();
  await page.getByLabel('Zakres czasu').selectOption('all');
  await page.getByRole('button', { name: 'Według rodzaju inwestycji', exact: true }).click();
  await expect(total).toContainText('2000,00');
  await page.getByRole('checkbox', { name: /Nieznany skład/ }).uncheck();
  await page.getByRole('checkbox', { name: /Akcje/ }).uncheck();
  await expect(total).toContainText('200,00');
  await page.getByRole('button', { name: 'Odznacz wszystkie', exact: true }).click();
  await expect(page.getByText('Nie wybrano inwestycji', { exact: true })).toBeVisible();
  await expect(total).toHaveCount(0);
  await page.getByRole('button', { name: 'Pokaż cały portfel', exact: true }).click();
  await expect(total).toContainText('2000,00');
  for (const tab of ['Co dokupić?', 'Historia']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.getByRole('tabpanel', { name: tab, exact: true })).toBeVisible();
  }
  await page.getByRole('tab', { name: 'Przegląd', exact: true }).click();
  await expect(page.getByLabel('Zakres czasu')).toHaveValue('all');
  await expect(page.getByLabel('Pokaż rozbicie')).toBeChecked();
  await page.getByRole('button', { name: 'Według kont i produktów', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /PPK/ })).not.toBeChecked();
  await expect(total).toContainText('1200,00');
  await page.getByRole('button', { name: 'Razem', exact: true }).click();
  await expect(total).toContainText('2000,00');
  await page.getByRole('button', { name: 'Ustawienia', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Przegląd', exact: true })).toHaveAttribute('aria-selected', 'false');
  await page.getByRole('button', { name: 'Wróć do: Przegląd', exact: true }).click();
  await page.getByRole('button', { name: 'Jakub', exact: true }).click();
  await expect(total).toContainText('1200,00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('purchase moves existing cash, creates no profit and can be undone as one event', async ({ page, request }) => {
  await initial(request, 'KONTO_BANKOWE', 1000);
  await initial(request, 'GIELDA', 1000, 'RYNKI_ROZWINIETE');
  await page.goto('/');
  await page.getByRole('button', { name: 'Dodaj wpis', exact: true }).click();
  await page.getByLabel('Co chcesz zrobić?').selectOption('DEPOSIT');
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-type').selectOption('GIELDA');
  await page.locator('#portfolio-change-subcategory').selectOption('RYNKI_ROZWINIETE');
  await page.locator('#portfolio-change-operation-type').selectOption('BUY');
  await page.getByLabel('Płacę z konta').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('100');
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.locator('.formFeedback')).toContainText('Podsumowanie jest aktualne');
  const result = await (await request.get('/api/portfolio-performance?owner=jakub')).json();
  expect(result.currentValuePln).toBe(2000);
  expect(result.nominalResultPln).toBe(0);
  expect(result.depositsTotalPln).toBe(2000);
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  const purchase = page.locator('.entryRow').filter({ hasText: 'Zakup' });
  await expect(purchase).toHaveCount(1);
  await purchase.getByRole('button', { name: /^Edytuj:/ }).click();
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
    .getByRole('button', { name: /^Usuń wpis:/ })
    .click();
  await expect(page.locator('.entryRow').filter({ hasText: 'Zakup' })).toHaveCount(0);
  const operations = await (await request.get('/api/investment-operations?owner=jakub')).json();
  expect(operations).toHaveLength(2);
  expect(operations.every((o: { operationType: string }) => o.operationType === 'INITIAL')).toBeTruthy();
});

test('holding management opens the selected history with explicit edit and delete buttons', async ({
  page,
  request
}) => {
  await initial(request, 'GIELDA', 200, 'ZLOTO');
  await initial(request, 'KONTO_BANKOWE', 500);
  await page.goto('/');
  const holding =
    page.viewportSize()!.width < 640
      ? page.locator('.holdingCard').filter({ hasText: 'Złoto' })
      : page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /Złoto/ }) });
  await expect(holding.getByRole('button', { name: 'Historia tej inwestycji' })).toBeHidden();
  await holding.locator('summary').click();
  await holding.getByRole('button', { name: 'Historia tej inwestycji' }).click();
  const history = page.getByRole('tabpanel', { name: 'Historia' });
  await expect(history.locator('.entryRow')).toHaveCount(1);
  await expect(history.locator('.entryRow')).toContainText('Złoto');
  await history.getByRole('button', { name: /^Edytuj:/ }).click();
  await expect(page.getByLabel('Konto lub produkt')).toHaveValue('GIELDA');
  await page.getByRole('button', { name: 'Anuluj', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await history.getByRole('button', { name: /^Usuń wpis:/ }).click();
  await expect(history.locator('.entryRow')).toHaveCount(1);
  await history.getByRole('button', { name: 'Pokaż całą historię' }).click();
  await expect(history.locator('.entryRow')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('budget is conserved and invalid draft weights never persist or produce advice', async ({ page, request }) => {
  await initial(request, 'OBLIGACJE', 2000, 'TRZYLETNIE');
  await initial(request, 'GIELDA', 200, 'ZLOTO');
  await initial(request, 'GIELDA', 1100, 'RYNKI_ROZWINIETE');
  await initial(request, 'GIELDA', 500, 'RYNKI_ROZWIJAJACE_SIE');
  await page.goto('/');
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await expect(page.getByLabel('Kwota na zakupy — zł')).toBeVisible();
  if (await page.getByRole('button', { name: 'Zapisz propozycję planu' }).count()) {
    await page.getByRole('button', { name: 'Zapisz propozycję planu' }).click();
    await expect(page.getByText('Zapisano wspólny plan.')).toBeVisible();
  }
  const purchases = page.getByRole('list', { name: 'Proponowane zakupy' });
  await expect(page.getByLabel('Kwota na zakupy — zł')).toBeEnabled();
  await page.getByLabel('Kwota na zakupy — zł').fill('100');
  const cells = await purchases.locator('.purchaseAmount').allTextContents();
  const cents = cells.reduce(
    (sum, text) =>
      sum +
      (text.includes('Nie dokupuj') ? 0 : Math.round(Number(text.replace(/[^0-9,-]/g, '').replace(',', '.')) * 100)),
    0
  );
  expect(cents).toBe(10000);
  await page.getByText('Zmień proporcje').click();
  await page.getByLabel('Obligacje — %').fill('80');
  await expect(page.getByRole('button', { name: 'Zapisz wspólny plan' })).toBeDisabled();
  await expect(purchases).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await expect(page.getByLabel('Kwota na zakupy — zł')).toBeVisible();
  if (await page.getByRole('button', { name: 'Zapisz propozycję planu' }).count()) {
    await page.getByRole('button', { name: 'Zapisz propozycję planu' }).click();
    await expect(page.getByText('Zapisano wspólny plan.')).toBeVisible();
  }
  await page.getByText('Zmień proporcje').click();
  await expect(page.getByLabel('Obligacje — %')).toHaveValue('50');
  await page.getByLabel('Akcje — rynki rozwinięte — %').fill('20');
  await expect(page.getByRole('button', { name: 'Zapisz wspólny plan' })).toBeDisabled();
  await page.getByLabel('Akcje — rynki wschodzące — %').fill('5');
  await page.getByRole('button', { name: 'Zapisz wspólny plan' }).click();
  const breakdown = page.locator('.savedPlan');
  await expect(breakdown).toContainText('Złoto: 25%');
  await expect(breakdown).not.toContainText('części akcyjnej');
  await expect(breakdown).toContainText('Akcje — rynki rozwinięte: 20%');
  await expect(breakdown).toContainText('Akcje — rynki wschodzące: 5%');
  await page.reload();
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await expect(page.getByLabel('Kwota na zakupy — zł')).toBeVisible();
  if (await page.getByRole('button', { name: 'Zapisz propozycję planu' }).count()) {
    await page.getByRole('button', { name: 'Zapisz propozycję planu' }).click();
    await expect(page.getByText('Zapisano wspólny plan.')).toBeVisible();
  }
  await expect(breakdown).toContainText('Złoto: 25%');
  await expect(breakdown).not.toContainText('części akcyjnej');
  await expect(breakdown).toContainText('Akcje — rynki rozwinięte: 20%');
  await expect(breakdown).toContainText('Akcje — rynki wschodzące: 5%');
});

test('lost response followed by reload and retry never duplicates a deposit', async ({ page, request }) => {
  await initial(request, 'KONTO_BANKOWE', 500);
  await page.goto('/');
  await page.getByRole('button', { name: 'Dodaj wpis', exact: true }).click();
  await page.getByLabel('Co chcesz zrobić?').selectOption('DEPOSIT');
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-type').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-operation-type').selectOption('DEPOSIT');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('25');
  await page.route('**/api/portfolio-changes', async (route) => {
    await route.fetch();
    await route.abort();
  });
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.getByRole('alert')).toContainText('Nie potwierdzono zapisu');
  await page.unroute('**/api/portfolio-changes');
  await page.reload();
  await page.getByRole('button', { name: 'Dodaj wpis', exact: true }).click();
  await page.getByLabel('Co chcesz zrobić?').selectOption('DEPOSIT');
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-type').selectOption('KONTO_BANKOWE');
  await page.locator('#portfolio-change-operation-type').selectOption('DEPOSIT');
  await page.locator('#portfolio-change-date').fill('2020-02-01');
  await page.locator('#portfolio-change-amount').fill('25');
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
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
  await page.getByRole('button', { name: 'Dodaj aktualny stan konta lub inwestycji', exact: true }).click();
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  await expect(page.getByLabel('Co chcesz zrobić?')).toHaveValue('INITIAL');
  await page.getByLabel('Ile masz teraz — zł').fill('700');
  await page.getByLabel('Znam sumę wpłat (odznaczone: Nie znam)').uncheck();
  await page.getByLabel('Data zmiany').fill('2020-01-01');
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.locator('.savingsHeadline')).toContainText('700,00');
  await expect(page.locator('.savingsHeadline .metric').last()).toContainText('—');
  await expect(page.locator('.holdingsNotice').filter({ hasText: 'Niepełne dane o wpłatach' })).toBeVisible();
  const holding =
    page.viewportSize()!.width < 640 ? page.locator('.holdingCard') : page.locator('.holdingsTable tbody tr');
  await expect(holding.getByRole('button', { name: 'Podaj sumę dotychczasowych wpłat', exact: true })).toBeHidden();
  await holding.locator('summary').click();
  await page.getByRole('button', { name: 'Podaj sumę dotychczasowych wpłat', exact: true }).click();
  await expect(page.getByLabel('Ile masz teraz — zł')).toHaveValue('700');
  await page.getByLabel('Znam sumę wpłat (odznaczone: Nie znam)').check();
  await page.getByLabel('Wpłaty łącznie — zł').fill('600');
  await expect(page.getByLabel('Data zmiany')).toBeDisabled();
  await page.getByRole('button', { name: 'Zapisz poprawkę' }).click();
  await expect(page.locator('.savingsHeadline .metric').last()).toContainText('+100,00');
  expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(700);
  if (page.viewportSize()!.width < 640) {
    await expect(page.locator('.holdingsCards')).toBeVisible();
    await expect(page.locator('.holdingsTable')).toBeHidden();
    await expect(page.locator('.holdingCard')).toContainText('+100,00');
    await expect(page.locator('.holdingCard details')).toHaveAttribute('open');
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
  const trigger = page.getByRole('button', { name: 'Dodaj wpis', exact: true });
  await trigger.click();
  await page.getByLabel('Kwota — zł').fill('15');
  await page.getByLabel('Zapisujesz dla').selectOption('zosia');
  await expect(page.getByLabel('Kwota — zł')).toHaveValue('15');
  await expect(page.getByLabel('Konto lub produkt')).toHaveValue('');
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  await page.getByLabel('Co chcesz zrobić?').selectOption('INITIAL');
  await page.getByLabel('Ile masz teraz — zł').fill('20');
  await page.getByLabel('Znam sumę wpłat (odznaczone: Nie znam)').check();
  await page.getByLabel('Wpłaty łącznie — zł').fill('20');
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
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const zosia = await (await request.get('/api/portfolio-performance?owner=zosia')).json();
  expect(zosia.currentValuePln).toBe(20);
  expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(500);
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('rebalances the full current portfolio without deposit or writes on desktop and mobile', async ({
  page,
  request
}) => {
  await initial(request, 'OBLIGACJE', 7000, 'TRZYLETNIE');
  await initial(request, 'GIELDA', 1000, 'ZLOTO');
  await initial(request, 'GIELDA', 1500, 'RYNKI_ROZWINIETE');
  await initial(request, 'GIELDA', 500, 'RYNKI_ROZWIJAJACE_SIE');
  expect(
    (
      await request.put('/api/portfolio-plans?scope=household', {
        data: { allocationVersion: 3, bonds: 50, gold: 25, developed: 17.5, emerging: 7.5 }
      })
    ).ok()
  ).toBeTruthy();
  const before = await (await request.get('/api/investment-operations?owner=jakub')).json();
  await page.goto('/');
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  const deviations = page.getByRole('region', { name: 'Obecne odchylenia od planu' });
  await expect(deviations).toContainText('+20 pp');
  await page.getByLabel('Rebalans obecnego portfela', { exact: true }).check();
  await expect(page.getByRole('list', { name: 'Co sprzedać' })).toContainText(/2000,00/);
  await expect(page.getByRole('list', { name: 'Co kupić' })).toContainText(/1500,00/);
  await expect(page.getByRole('list', { name: 'Co kupić' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('list', { name: 'Po rebalansie' })).toContainText('17,5%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const chartBefore = await deviations.textContent();
  await page.getByRole('checkbox', { name: /Obligacje/ }).uncheck();
  await expect(page.getByRole('list', { name: 'Co sprzedać' })).not.toContainText('Obligacje');
  await expect(page.getByRole('list', { name: 'Co kupić' })).toContainText('500,00');
  await expect(page.getByRole('list', { name: 'Po rebalansie' })).toContainText('7000,00');
  await expect(page.getByRole('list', { name: 'Po rebalansie' })).toContainText('1050,00');
  await expect(page.getByRole('list', { name: 'Po rebalansie' })).toContainText('Bez zmian — poza rebalansem');
  expect(await deviations.textContent()).toEqual(chartBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const gold = page.getByRole('checkbox', { name: /Złoto/ });
  await gold.focus();
  await page.keyboard.press('Space');
  await expect(gold).not.toBeChecked();
  await expect(page.getByRole('list', { name: 'Co kupić' })).not.toContainText('Złoto');
  await page.getByLabel('Dokupowanie', { exact: true }).check();
  await expect(page.getByLabel('Kwota na zakupy — zł')).toHaveValue('');
  const after = await (await request.get('/api/investment-operations?owner=jakub')).json();
  expect(after).toEqual(before);
});

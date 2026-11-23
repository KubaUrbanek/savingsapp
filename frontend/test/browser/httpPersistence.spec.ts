import { expect, test } from '@playwright/test';

// A real HTTP origin, unlike localhost, does not expose randomUUID or SubtleCrypto.
const origin = 'http://savings.test:8082';
test.use({
  launchOptions: {
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
    args: ['--no-sandbox']
  }
});
test.beforeEach(async ({ page, request }) => {
  // Keep the browser on an insecure HTTP origin while forwarding to the isolated
  // local backend. No external DNS/network access or secure-context flags required.
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    // Translate the same-origin headers together with the transport URL.
    const headers = { ...route.request().headers() };
    if (headers.origin === origin) headers.origin = 'http://localhost:8082';
    if (headers.referer?.startsWith(origin)) headers.referer = headers.referer.replace(origin, 'http://localhost:8082');
    delete headers.host;
    const response = await request.fetch(`http://localhost:8082${url.pathname}${url.search}`, {
      method: route.request().method(),
      headers,
      data: route.request().postDataBuffer() ?? undefined
    });
    await route.fulfill({ response });
  });
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
test.afterEach(async ({ page }) => {
  // Finish forwarded requests before Playwright disposes the request fixture.
  await page.unrouteAll({ behavior: 'wait' });
});

test('HTTP origins can save an initial value and retain it after reload', async ({ page, request }) => {
  await page.goto(origin);
  expect(
    await page.evaluate(() => ({
      secure: isSecureContext,
      uuid: typeof crypto.randomUUID,
      digest: typeof crypto.subtle
    }))
  ).toEqual({ secure: false, uuid: 'undefined', digest: 'undefined' });
  await page.getByRole('button', { name: 'Dodaj aktualny stan konta lub inwestycji', exact: true }).click();
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  await page.getByLabel('Ile masz teraz — zł').fill('700');
  await page.getByLabel('Znam sumę wpłat (odznaczone: Nie znam)').check();
  await page.getByLabel('Wpłaty łącznie — zł').fill('600');
  await page.getByLabel('Data zmiany').fill('2020-01-01');
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.savingsHeadline .summaryTotal')).toContainText('700,00');
  const result = await (await request.get('/api/portfolio-performance?owner=jakub')).json();
  expect(result).toMatchObject({ nominalResultPln: 0, contributedCapitalPln: 600 });
});

test('HTTP saves deposits, withdrawals, trades, valuations, corrections and deletion', async ({ page, request }) => {
  const seeded = await request.post('/api/portfolio-changes', {
    data: {
      requestId: '90000000-0000-4000-8000-000000000001',
      kind: 'INITIAL',
      owner: 'jakub',
      type: 'KONTO_BANKOWE',
      date: '2020-01-01',
      valuePln: 1000,
      amountPln: 1000
    }
  });
  expect(seeded.ok()).toBeTruthy();
  const stock = await request.post('/api/portfolio-changes', {
    data: {
      requestId: '90000000-0000-4000-8000-000000000002',
      kind: 'INITIAL',
      owner: 'jakub',
      type: 'GIELDA',
      subcategory: 'RYNKI_ROZWINIETE',
      date: '2020-01-01',
      valuePln: 0,
      amountPln: 0
    }
  });
  expect(stock.ok()).toBeTruthy();
  await page.goto(origin);
  const scenarios = [
    { kind: 'DEPOSIT', type: 'KONTO_BANKOWE', amount: '100', total: 1100 },
    { kind: 'WITHDRAWAL', type: 'KONTO_BANKOWE', amount: '50', total: 1050 },
    { kind: 'BUY', type: 'GIELDA', amount: '200', total: 1050 },
    { kind: 'SELL', type: 'GIELDA', amount: '50', total: 1050 },
    { kind: 'VALUATION', type: 'GIELDA', amount: '180', total: 1080 }
  ];
  for (const [index, scenario] of scenarios.entries()) {
    await page.getByRole('button', { name: 'Dodaj wpis', exact: true }).click();
    await page.getByLabel('Co chcesz zrobić?').selectOption('DEPOSIT');
    await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
    await page.getByLabel('Konto lub produkt').selectOption(scenario.type);
    if (scenario.type === 'GIELDA')
      await page.getByRole('dialog').getByLabel('Rodzaj inwestycji', { exact: true }).selectOption('RYNKI_ROZWINIETE');
    await page.getByLabel('Co chcesz zrobić?').selectOption(scenario.kind);
    await page
      .getByLabel(scenario.kind === 'VALUATION' ? 'Ile masz teraz — zł' : 'Kwota — zł', { exact: true })
      .fill(scenario.amount);
    await page.getByLabel('Data zmiany').fill(`2020-02-0${index + 1}`);
    await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Dodaj wpis', exact: true })).toBeEnabled();
    expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(
      scenario.total
    );
  }
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  const valuation = page.locator('.entryRow').filter({ hasText: 'Aktualizacja wartości' });
  await valuation.getByRole('button', { name: /^Edytuj:/ }).click();
  await page.getByLabel('Ile masz teraz — zł').fill('200');
  await page.getByRole('button', { name: 'Zapisz poprawkę' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(1100);
  page.once('dialog', (dialog) => dialog.accept());
  await valuation.getByRole('button', { name: /^Usuń wpis:/ }).click();
  await expect(valuation).toHaveCount(0);
  expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(1050);
});

test('HTTP retry after a lost response and reload creates exactly one deposit', async ({ page, request }) => {
  const seeded = await request.post('/api/portfolio-changes', {
    data: {
      requestId: '90000000-0000-4000-8000-000000000003',
      kind: 'INITIAL',
      owner: 'jakub',
      type: 'KONTO_BANKOWE',
      date: '2019-12-31',
      valuePln: 0,
      amountPln: 0
    }
  });
  expect(seeded.ok()).toBeTruthy();
  await page.goto(origin);
  const fillDeposit = async () => {
    await page.getByRole('button', { name: 'Dodaj wpis', exact: true }).click();
    await page.getByLabel('Co chcesz zrobić?').selectOption('DEPOSIT');
    await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
    await page.getByLabel('Kwota — zł', { exact: true }).fill('25');
    await page.getByLabel('Data zmiany').fill('2020-01-01');
  };
  await fillDeposit();
  await page.route('**/api/portfolio-changes', async (route) => {
    const response = await request.post('/api/portfolio-changes', { data: route.request().postDataJSON() });
    expect(response.ok()).toBeTruthy();
    await route.abort();
  });
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.getByRole('alert')).toContainText('Nie potwierdzono zapisu');
  await page.unroute('**/api/portfolio-changes');
  await page.reload();
  await fillDeposit();
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await (await request.get('/api/investment-operations?owner=jakub')).json()).toHaveLength(2);
  // A new intentional identical deposit must get a new request ID.
  await fillDeposit();
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await (await request.get('/api/investment-operations?owner=jakub')).json()).toHaveLength(3);
  expect((await (await request.get('/api/portfolio-performance?owner=jakub')).json()).currentValuePln).toBe(50);
});

test('HTTP can complete unknown contributions and save allocation weights', async ({ page, request }) => {
  await page.goto(origin);
  await page.getByRole('button', { name: 'Dodaj aktualny stan konta lub inwestycji', exact: true }).click();
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  await page.getByLabel('Ile masz teraz — zł').fill('700');
  await page.getByLabel('Znam sumę wpłat (odznaczone: Nie znam)').uncheck();
  await page.getByLabel('Data zmiany').fill('2020-01-01');
  await page.getByRole('button', { name: /^Zapisz (wpłatę|zakup|sprzedaż|wypłatę|wartość|oszczędności)$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  const holding =
    page.viewportSize()!.width < 640 ? page.locator('.holdingCard') : page.locator('.holdingsTable tbody tr');
  await holding.locator('summary').click();
  await holding.getByRole('button', { name: 'Podaj sumę dotychczasowych wpłat' }).click();
  await page.getByLabel('Znam sumę wpłat (odznaczone: Nie znam)').check();
  await page.getByLabel('Wpłaty łącznie — zł').fill('600');
  await expect(page.getByLabel('Data zmiany')).toBeDisabled();
  await page.getByRole('button', { name: 'Zapisz poprawkę' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await (await request.get('/api/portfolio-performance?owner=jakub')).json()).toMatchObject({
    nominalResultPln: 0,
    contributedCapitalPln: 600
  });
  await page.getByRole('tab', { name: 'Plan portfela', exact: true }).click();
  await expect(page.getByLabel('Kwota na zakupy — zł')).toBeVisible();
  if (await page.getByRole('button', { name: 'Zapisz propozycję planu' }).count()) {
    await page.getByRole('button', { name: 'Zapisz propozycję planu' }).click();
    await expect(page.getByText('Zapisano wspólny plan.')).toBeVisible();
  }
  await page.getByText('Zmień proporcje').click();
  await page.getByLabel('Obligacje — %').fill('60');
  await page.getByLabel('Złoto — %').fill('15');
  await page.getByLabel('Akcje — rynki rozwinięte — %').fill('17,5');
  await page.getByLabel('Akcje — rynki wschodzące — %').fill('7,5');
  await page.getByRole('button', { name: 'Zapisz wspólny plan' }).click();
  await expect(page.getByText('Zapisano wspólny plan.')).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Plan portfela', exact: true }).click();
  await expect(page.getByLabel('Kwota na zakupy — zł')).toBeVisible();
  if (await page.getByRole('button', { name: 'Zapisz propozycję planu' }).count()) {
    await page.getByRole('button', { name: 'Zapisz propozycję planu' }).click();
    await expect(page.getByText('Zapisano wspólny plan.')).toBeVisible();
  }
  await expect(page.locator('.savedPlan')).toContainText('Złoto: 15%');
  await expect(page.locator('.savedPlan')).toContainText('Obligacje: 60%');
});

test('Bitcoin initial value and plan persist across reload', async ({ page, request }) => {
  await page.goto(origin);
  await page.getByRole('button', { name: 'Dodaj aktualny stan konta lub inwestycji', exact: true }).click();
  await page.getByLabel('Konto lub produkt').selectOption('GIELDA');
  await page.getByLabel('Rodzaj inwestycji').selectOption('BITCOIN');
  await page.getByLabel('Ile masz teraz — zł').fill('600');
  await page.getByLabel('Znam sumę wpłat (odznaczone: Nie znam)').check();
  await page.getByLabel('Wpłaty łącznie — zł').fill('500');
  await page.getByLabel('Data zmiany').fill('2020-01-01');
  await page.getByRole('button', { name: 'Zapisz oszczędności', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Bitcoin (BTC)').filter({ visible: true }).first()).toBeVisible();
  const performance = await (
    await request.get('/api/portfolio-performance?owner=jakub&type=GIELDA&subcategory=BITCOIN')
  ).json();
  expect(performance.nominalResultPln).toBe(100);
  const plan = { allocationVersion: 4, bonds: '50', gold: '20', developed: '17.5', emerging: '7.5', bitcoin: '5' };
  expect((await request.put('/api/portfolio-plans?scope=jakub', { data: plan })).ok()).toBeTruthy();
  expect(await (await request.get('/api/portfolio-plans?scope=jakub')).json()).toEqual(plan);
  expect(
    (await request.put('/api/portfolio-plans?scope=jakub', { data: { ...plan, allocationVersion: 2 } })).status()
  ).toBe(400);
});

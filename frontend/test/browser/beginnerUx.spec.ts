import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const flat = { allocationVersion: 4, bitcoin: 0, bonds: '50', gold: '25', developed: '17.5', emerging: '7.5' };
async function seed(
  request: APIRequestContext,
  type = 'KONTO_BANKOWE',
  value = 1000,
  owner = 'jakub',
  subcategory: string | null = null
) {
  expect(
    (
      await request.post('/api/portfolio-changes', {
        data: {
          requestId: randomUUID(),
          kind: 'INITIAL',
          owner,
          type,
          subcategory,
          date: '2020-01-01',
          valuePln: value,
          amountPln: value
        }
      })
    ).ok()
  ).toBeTruthy();
}
test.beforeEach(async ({ request }) => {
  expect(
    (
      await request.post('/api/database/import', {
        multipart: {
          file: {
            name: 'empty.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify({ formatVersion: 2, entries: [], operations: [], plans: {} }))
          }
        }
      })
    ).ok()
  ).toBeTruthy();
});
test('E02 E13 shared draft and per-owner budget survive tabs and scope', async ({ page, request }) => {
  await seed(request, 'OBLIGACJE', 5000, 'jakub', 'TRZYLETNIE');
  await seed(request, 'GIELDA', 1750, 'jakub', 'RYNKI_ROZWINIETE');
  await seed(request, 'GIELDA', 750, 'jakub', 'RYNKI_ROZWIJAJACE_SIE');
  await seed(request, 'PPK', 900000);
  await seed(request, 'GIELDA', 100, 'zosia', 'ZLOTO');
  await request.put('/api/portfolio-plans', { data: flat });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: 'Co dokupić?', exact: true });
  await expect(panel).toContainText('7500,00');
  await expect(panel).toContainText('Gotówka 0,00');
  await expect(panel).toContainText(/PPK \/ PPO: 900\s000,00/);
  await expect(panel).toContainText('nie uwzględniamy ich w tym planie');
  const deviations = panel.getByRole('region', { name: 'Obecne odchylenia od planu' });
  await expect(deviations.getByRole('listitem')).toHaveCount(4);
  await expect(deviations).not.toContainText(/PPK|PPO|Gotówka/);
  await page.getByLabel('Kwota na zakupy — zł').fill('1000');
  await expect(page.locator('.purchaseCard')).toHaveCount(1);
  await expect(page.locator('.purchaseCard')).toContainText('Złoto');
  await page.getByText('Zmień proporcje', { exact: true }).click();
  await page.getByLabel('Obligacje — %', { exact: true }).fill('49');
  await expect(panel).toContainText('Razem: 99%');
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  await page.getByRole('button', { name: 'Zosia', exact: true }).click();
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await expect(page.getByLabel('Obligacje — %', { exact: true })).toHaveValue('49');
  await expect(page.getByLabel('Kwota na zakupy — zł')).toHaveValue('');
  await expect(panel).toContainText('100,00');
  await page.getByLabel('Złoto — %', { exact: true }).fill('26');
  await page.getByRole('button', { name: 'Zapisz wspólny plan', exact: true }).click();
  await expect(panel).toContainText('Zapisano wspólny plan.');
  await page.getByRole('button', { name: 'Jakub', exact: true }).click();
  await expect(page.getByLabel('Kwota na zakupy — zł')).toHaveValue('1000');
  expect((await (await request.get('/api/portfolio-plans?scope=zosia')).json()).bonds).toBe('49');
});
test('E02 H15 shared targets use only the selected owners investments', async ({ page, request }) => {
  await seed(request, 'OBLIGACJE', 5000, 'jakub', 'TRZYLETNIE');
  await seed(request, 'GIELDA', 1750, 'jakub', 'RYNKI_ROZWINIETE');
  await seed(request, 'GIELDA', 750, 'jakub', 'RYNKI_ROZWIJAJACE_SIE');
  await seed(request, 'IKE', 2500, 'zosia', 'ZLOTO');
  await seed(request, 'GIELDA', 1750, 'zosia', 'RYNKI_ROZWINIETE');
  await seed(request, 'GIELDA', 750, 'zosia', 'RYNKI_ROZWIJAJACE_SIE');
  expect((await request.put('/api/portfolio-plans', { data: flat })).ok()).toBeTruthy();
  await page.goto('/');
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: 'Co dokupić?', exact: true });
  const budget = panel.getByLabel('Kwota na zakupy — zł');
  const cards = panel.getByRole('list', { name: 'Proponowane zakupy' }).getByRole('listitem');
  const savedPlan = panel.locator('.savedPlan');
  await expect(savedPlan).toContainText('Zapisany wspólny plan');
  const originalWeights = [
    'Obligacje: 50%',
    'Złoto: 25%',
    'Akcje — rynki rozwinięte: 17,5%',
    'Akcje — rynki wschodzące: 7,5%'
  ];

  for (const scenario of [
    { owner: 'Jakub', basis: /Plan obejmuje 7500,00/, purchases: [['Złoto', '1000,00']] },
    { owner: 'Zosia', basis: /Plan obejmuje 5000,00/, purchases: [['Obligacje', '1000,00']] },
    {
      owner: 'Razem',
      basis: /Plan obejmuje 12\s500,00/,
      purchases: [
        ['Obligacje', '666,67'],
        ['Złoto', '333,33']
      ]
    }
  ] as const) {
    await page.getByRole('button', { name: scenario.owner, exact: true }).click();
    await expect(panel).toContainText(`Obliczenia dla: ${scenario.owner}`);
    await expect(panel).toContainText(scenario.basis);
    await expect(budget).toHaveValue('');
    await budget.fill('1000');
    await expect(cards).toHaveCount(scenario.purchases.length);
    for (const [category, amount] of scenario.purchases) {
      await expect(cards.filter({ has: page.getByRole('heading', { name: category, exact: true }) })).toContainText(
        `Dokup za ${amount}`
      );
    }
    await expect(savedPlan.getByRole('listitem')).toHaveText(originalWeights);
  }

  await page.getByRole('button', { name: 'Zosia', exact: true }).click();
  await expect(budget).toHaveValue('1000');
  await expect(panel).toContainText(/Plan obejmuje 5000,00/);
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Obligacje');
  await expect(cards).toContainText('1000,00');
});
test('E07 E14 network errors are distinct from missing data and retry locally', async ({ page, request }) => {
  await seed(request);
  await request.put('/api/portfolio-plans', { data: flat });
  let fail = true;
  await page.route('**/api/portfolio-performance*', (route) => (fail ? route.abort() : route.continue()));
  await page.route('**/api/portfolio-plans*', (route) => (fail ? route.abort() : route.continue()));
  await page.goto('/');
  await expect(page.locator('.summaryTotal')).toContainText('1000,00');
  await expect(page.locator('.savingsHeadline')).toContainText('Nie udało się wczytać wyniku');
  await expect(page.getByText('Uzupełnij wpłaty', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nie udało się wczytać planu');
  await expect(page.locator('.savedPlan')).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click();
  await expect(page.locator('.savedPlan')).toContainText('Zapisany wspólny plan');
  await page.getByRole('tab', { name: 'Przegląd', exact: true }).click();
  await page.getByRole('button', { name: 'Odśwież wyniki', exact: true }).click();
  await expect(page.locator('.savingsHeadline')).not.toContainText('Nie udało się');
});
test('E20 first purchase keeps its draft while adding the source account', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dodaj wpis', exact: true }).click();
  await page.getByLabel('Co chcesz zrobić?').selectOption('BUY');
  await page.getByLabel('Konto lub produkt').selectOption('GIELDA');
  await page.getByLabel('Rodzaj inwestycji', { exact: true }).selectOption('ZLOTO');
  await page.getByLabel('Kwota — zł', { exact: true }).fill('25,50');
  await page.getByLabel('Data zmiany').fill('2020-02-01');
  await expect(page.getByRole('dialog')).toContainText('Brak zapisanego salda');
  await page.getByRole('button', { name: 'Dodaj stan konta źródłowego', exact: true }).click();
  await page.getByLabel('Ile masz teraz — zł').fill('100');
  await page.getByRole('button', { name: 'Zapisz oszczędności', exact: true }).click();
  await expect(page.getByLabel('Kwota — zł', { exact: true })).toHaveValue('25,50');
  await page.getByRole('button', { name: 'Zapisz zakup', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.summaryTotal')).toContainText('100,00');
});
test('E22 E24 validation and dirty dialog preserve the input and focus', async ({ page, request }) => {
  await seed(request);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Dodaj wpis', exact: true });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByLabel('Co chcesz zrobić?').selectOption('DEPOSIT');
  await page.getByLabel('Konto lub produkt').selectOption('KONTO_BANKOWE');
  const amount = page.getByLabel('Kwota — zł', { exact: true });
  await amount.fill('1,001');
  await page.getByRole('button', { name: 'Zapisz wpłatę', exact: true }).click();
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Wróć do edycji', exact: true }).click();
  await expect(amount).toHaveValue('1,001');
  await page.getByRole('button', { name: 'Anuluj', exact: true }).click();
  await page.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('E29 explicit legacy selection, read-only preview and refreshed imported plan', async ({ page, request }) => {
  await seed(request);
  await request.put('/api/portfolio-plans', { data: flat });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ustawienia', exact: true }).click();
  const backup = {
    formatVersion: 2,
    entries: [],
    operations: [],
    plans: { zosia: { allocationVersion: 2, bonds: 60, stocks: 40, gold: 50, developed: 40, emerging: 10 } }
  };
  await page
    .getByLabel('Wybierz plik kopii danych')
    .setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('button', { name: 'Potwierdź zastąpienie danych', exact: true })).toHaveCount(0);
  await page.getByLabel('Kopia nie ma planu Razem. Wybierz plan, który stanie się wspólny.').selectOption('zosia');
  await expect(page.getByText('Podgląd kopii', { exact: true })).toBeVisible();
  expect((await (await request.get('/api/investments?owner=jakub')).json()).length).toBe(1);
  await page.getByRole('button', { name: 'Potwierdź zastąpienie danych', exact: true }).click();
  await expect(page.getByText('Przywrócono kopię danych.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
  await expect(page.locator('.savedPlan')).toContainText('Obligacje: 60%');
  await expect(page.locator('.savedPlan')).toContainText('Złoto: 20%');
  await page.getByRole('button', { name: 'Ustawienia', exact: true }).click();
  await page
    .getByLabel('Wybierz plik kopii danych')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('alert')).toContainText('JSON');
  expect((await (await request.get('/api/portfolio-plans')).json()).bonds).toBe('60');
});
for (const width of [320, 390, 768, 1440])
  test(`E08 E10 E31 E32 expanded tables and text at ${width}px`, async ({ page, request }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await seed(request, 'OBLIGACJE', 1234567890.12, 'jakub', 'TRZYLETNIE');
    await seed(request, 'GIELDA', 500, 'jakub', 'RYNKI_ROZWINIETE');
    await seed(request, 'PPK', 100);
    await request.put('/api/portfolio-plans', { data: flat });
    await page.goto('/');
    await expect(page.locator('.summaryTotal')).toContainText('234');
    expect(await page.locator('.summaryTotal').evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(600);
    const charts = page.locator('.chartsDisclosure');
    if ((await charts.getAttribute('open')) === null) await charts.locator(':scope > summary').click();
    await page.getByLabel('Pokaż rozbicie').check();
    await page.getByLabel('Zakres czasu').selectOption('custom');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByText('Pokaż dane wykresu', { exact: true }).click();
    expect(
      await page.evaluate(
        (expectedWidth) => document.documentElement.scrollWidth <= expectedWidth && innerWidth === expectedWidth,
        width
      )
    ).toBeTruthy();
    await page.getByRole('region', { name: 'Dane historii wartości', exact: true }).focus();
    await expect(page.getByRole('region', { name: 'Dane historii wartości', exact: true })).toBeFocused();
    await page.screenshot({ path: info.outputPath(`overview-${width}.png`), fullPage: true });
    await charts.getByLabel('Od', { exact: true }).fill('2021-01-01');
    await charts.getByLabel('Do', { exact: true }).fill('2020-01-01');
    await expect(page.getByRole('alert')).toContainText('późniejsza');
    await charts.getByLabel('Od', { exact: true }).fill('');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Przegląd', exact: true }).focus();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Historia', exact: true })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: 'Przegląd', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'Co dokupić?', exact: true }).click();
    await page.getByLabel('Kwota na zakupy — zł').fill('1000');
    await page.getByText('Porównaj z celem', { exact: true }).click();
    expect(
      await page.evaluate(
        (expectedWidth) => document.documentElement.scrollWidth <= expectedWidth && innerWidth === expectedWidth,
        width
      )
    ).toBeTruthy();
    const trackWidths = await page
      .locator('.allocationTrack')
      .evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().width)));
    expect(trackWidths).toHaveLength(8);
    expect(new Set(trackWidths).size).toBe(1);
    await page.evaluate(() => {
      for (const size of [12, 14, 16, 20, 26, 36, 48])
        document.documentElement.style.setProperty(`--font-size-${size}`, `${size * 2}px`);
    });
    expect(
      await page.evaluate(
        (expectedWidth) => document.documentElement.scrollWidth <= expectedWidth && innerWidth === expectedWidth,
        width
      )
    ).toBeTruthy();
  });

test('E06 household missing contributions identify the owner and preserve the selected valuation', async ({
  page,
  request
}) => {
  await seed(request);
  expect(
    (
      await request.post('/api/portfolio-changes', {
        data: {
          requestId: randomUUID(),
          kind: 'VALUATION',
          owner: 'zosia',
          type: 'PPK',
          date: '2020-01-01',
          valuePln: 500
        }
      })
    ).ok()
  ).toBeTruthy();
  await page.goto('/');
  await page.getByRole('button', { name: 'Razem', exact: true }).click();
  await page.getByRole('button', { name: 'Zosia — PPK', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Oszczędności: Zosia', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Uzupełnij wpłaty', exact: true })).toBeVisible();
  await expect(page.getByLabel('Ile masz teraz — zł')).toHaveValue('500');
  await expect(page.getByLabel('Data zmiany')).toHaveValue('2020-01-01');
  await expect(page.getByLabel('Data zmiany')).toBeDisabled();
  await page.getByLabel('Wpłaty łącznie — zł').fill('400');
  await page.getByRole('button', { name: 'Zapisz poprawkę', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const result = await (await request.get('/api/portfolio-performance?owner=zosia')).json();
  expect(result.currentValuePln).toBe(500);
  expect(result.depositsTotalPln).toBe(400);
  expect(result.nominalResultPln).toBe(100);
});
test('E25 E27 history filters and deletion share labelled initial amounts and cancel never writes', async ({
  page,
  request
}) => {
  await seed(request);
  await seed(request, 'PPK', 200);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Historia', exact: true }).click();
  await expect(page.locator('.entryRow')).toHaveCount(2);
  await page.getByLabel('Znajdź wpis', { exact: true }).fill('PPK');
  await expect(page.locator('.entryRow')).toHaveCount(1);
  await expect(page.locator('.entryRow')).toContainText('Wartość: 200,00');
  await expect(page.locator('.entryRow')).toContainText('Wpłaty: 200,00');
  let confirmation = '';
  page.once('dialog', async (dialog) => {
    confirmation = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: /^Usuń wpis:/ }).click();
  expect(confirmation).toMatch(/Wartość: 200,00.*Wpłaty: 200,00/);
  await expect(page.locator('.entryRow')).toHaveCount(1);
  expect((await (await request.get('/api/investment-operations?owner=jakub')).json()).length).toBe(2);
  await page.getByText('Filtr okresu i działania', { exact: true }).click();
  const history = page.getByRole('tabpanel', { name: 'Historia', exact: true });
  await history.getByLabel('Od', { exact: true }).fill('2021-01-01');
  await expect(page.locator('.entryRow')).toHaveCount(0);
  await expect(history).toContainText('Brak wpisów spełniających');
});

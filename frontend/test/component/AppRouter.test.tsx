import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouter } from '../../src/app/AppRouter.js';
import { PortfolioChangeValidationFailure } from '../../src/application/portfolio/RecordPortfolioChange.js';
import { expectNoAccessibilityViolations } from './accessibility.js';
function deferred() {
  let resolve!: (value: unknown) => void, reject!: (reason?: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const entry = {
  id: 'entry',
  owner: 'jakub',
  type: 'KONTO_BANKOWE',
  subcategory: null,
  valuePln: 100,
  date: '2026-09-01',
  createdAt: '2026-09-01T00:00:00Z'
};
const operation = { ...entry, id: 'op', operationType: 'DEPOSIT', amountPln: 100 };
function dependencies(overrides = {}) {
  return {
    preferences: { selectedOwner: () => 'jakub', selectOwner: vi.fn() },
    useCases: {
      loadReferenceData: {
        execute: async () => ({ users: ['jakub', 'zosia'], types: ['KONTO_BANKOWE', 'GIELDA', 'IKE', 'IKZE'] })
      },
      loadPortfolio: { execute: async () => [entry] },
      loadPortfolioPerformance: { execute: async () => ({ operations: [], performance: null }) },
      recordPortfolioChange: { execute: async () => ({ nextValue: 110, kind: 'DEPOSIT', atomic: true }) },
      deleteInvestmentEntry: { execute: async () => undefined },
      deleteInvestmentOperation: { execute: async () => undefined },
      importDatabaseBackup: { execute: async () => undefined },
      exportDatabaseBackup: { execute: async () => new Blob() },
      ...overrides
    }
  };
}
async function openForm(value?: string) {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Dodaj zmianę' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Dodaj zmianę' }));
  const dialog = await screen.findByRole('dialog', { name: 'Dodaj zmianę' });
  if (value) fireEvent.change(screen.getByLabelText('Kwota — zł'), { target: { value } });
  return dialog;
}
beforeEach(() => window.history.pushState({}, '', '/'));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('Savings workspace', () => {
  it('renders about', () => {
    window.history.pushState({}, '', '/about');
    render(<AppRouter dependencies={{}} />);
    expect(screen.getByText(/Portfele bez logowania/i)).toBeTruthy();
  });
  it('provides a stable skip link', () => {
    render(<AppRouter dependencies={dependencies()} />);
    expect(screen.getByRole('link', { name: 'Przejdź do treści' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
  it.each([
    ['/', 'Portfele | Oszczędności'],
    ['/about', 'Informacje | Oszczędności'],
    ['/brak', 'Nie znaleziono strony | Oszczędności']
  ])('sets title for %s', (path, title) => {
    window.history.pushState({}, '', path);
    render(<AppRouter dependencies={dependencies()} />);
    expect(document.title).toBe(title);
  });
  it('focuses the next route heading without stealing initial focus', async () => {
    render(
      <React.StrictMode>
        <AppRouter dependencies={dependencies()} />
      </React.StrictMode>
    );
    expect(screen.getByRole('heading', { name: 'Oszczędności: Jakub' })).not.toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }));
    fireEvent.click(screen.getByRole('link', { name: 'Informacje o aplikacji' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Portfele bez logowania.' })).toHaveFocus());
  });
  it('uses three tabs with one visible panel and keyboard navigation', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    const summary = screen.getByRole('tab', { name: 'Przegląd' });
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Przegląd', 'Co dokupić?', 'Historia']);
    expect(summary).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', summary.id);
    fireEvent.keyDown(summary, { key: 'End' });
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Historia' })).toHaveFocus());
    expect(screen.getByRole('tabpanel', { name: 'Historia' })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Historia' }), { key: 'Home' });
    await waitFor(() => expect(summary).toHaveFocus());
    fireEvent.keyDown(summary, { key: 'ArrowLeft' });
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Historia' })).toHaveFocus());
  });
  it('keeps household plan, history and settings available', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Razem' }));
    expect(screen.getByRole('heading', { name: 'Nasze oszczędności' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Co dokupić?' }));
    expect(screen.getByRole('tabpanel', { name: 'Co dokupić?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }));
    expect(screen.getByRole('heading', { name: 'Ustawienia i kopia danych' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Co dokupić?' })).toHaveAttribute('tabindex', '0');
    fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
    expect(screen.getByRole('tabpanel', { name: 'Historia' })).toBeVisible();
  });
  it('starts existing savings with INITIAL and allows unknown contributions', async () => {
    render(<AppRouter dependencies={dependencies({ loadPortfolio: { execute: async () => [] } })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Dodaj aktualny stan konta lub inwestycji' }));
    expect(screen.getByLabelText('Co chcesz zrobić?')).toHaveValue('INITIAL');
    expect(screen.getByLabelText('Ile masz teraz — zł')).toBeVisible();
    expect(screen.getByLabelText('Ile łącznie wpłaciłem — zł')).toHaveAccessibleDescription(
      'Suma Twoich wpłat do wybranego dnia, bez zysków i strat, np. 10 000 zł. Służy do obliczenia wyniku inwestycji.'
    );
    fireEvent.click(screen.getByLabelText('Znam kwotę, którą wpłaciłem'));
    expect(screen.queryByLabelText('Ile łącznie wpłaciłem — zł')).not.toBeInTheDocument();
    expect(screen.getByText(/Nie pamiętasz wpłat/)).toBeVisible();
  });
  it('resets all investments safely and keeps filters separate from drafts', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: {
            execute: async () => [entry, { ...entry, id: 'stock', type: 'GIELDA', subcategory: 'ZLOTO' }]
          }
        })}
      />
    );
    fireEvent.click(await screen.findByText(/Filtruj inwestycje/));
    fireEvent.click(await screen.findByRole('button', { name: 'Giełda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wszystkie inwestycje' }));
    expect(screen.getByRole('button', { name: 'Wszystkie inwestycje' })).toHaveAttribute('aria-pressed', 'true');
    await openForm('123.45');
    expect(screen.getByLabelText('Inwestycja / rachunek')).toHaveValue('KONTO_BANKOWE');
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Przegląd' }));
    expect(screen.getByRole('button', { name: 'Wszystkie inwestycje' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('clears owner filters before loading household performance', async () => {
    const execute = vi.fn(async () => ({ operations: [], performance: null }));
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolioPerformance: { execute },
          loadPortfolio: {
            execute: async () => [entry, { ...entry, id: 'stock', type: 'GIELDA', subcategory: 'ZLOTO' }]
          }
        })}
      />
    );
    fireEvent.click(await screen.findByText(/Filtruj inwestycje/));
    fireEvent.click(await screen.findByRole('button', { name: 'Giełda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Razem' }));
    await waitFor(() =>
      expect(execute).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scope: { kind: 'HOUSEHOLD', ownerIds: ['jakub', 'zosia'] },
          filters: { type: undefined, subcategory: undefined }
        })
      )
    );
    expect(screen.queryByText(/Filtruj inwestycje/)).not.toBeInTheDocument();
  });
  it('displays the actual draft owner and clears fields when selecting another', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    await openForm();
    expect(screen.getByText('Zapisujesz dla:')).toHaveTextContent('Jakub');
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Razem' }));
    await openForm('100');
    fireEvent.change(screen.getByLabelText('Zapisujesz dla'), { target: { value: 'zosia' } });
    expect(screen.getByLabelText('Kwota — zł')).toHaveValue(null);
    expect(screen.getByLabelText('Inwestycja / rachunek')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Zapisz zmianę' })).toBeDisabled();
  });
  it('closes with Escape and restores focus', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    const trigger = screen.getByRole('button', { name: 'Dodaj zmianę' });
    await waitFor(() => expect(trigger).toBeEnabled());
    trigger.focus();
    const dialog = await openForm();
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('offers direct actions and accessible dialog controls', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    const dialog = await openForm();
    expect(
      within(screen.getByLabelText('Co chcesz zrobić?'))
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['Wpłaciłem', 'Kupiłem', 'Wypłaciłem', 'Sprzedałem', 'Wpisuję obecną wartość']);
    fireEvent.change(screen.getByLabelText('Co chcesz zrobić?'), { target: { value: 'BUY' } });
    expect(screen.getByLabelText('Płacę z konta')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Co chcesz zrobić?'), { target: { value: 'VALUATION' } });
    expect(screen.queryByLabelText('Płacę z konta')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ile masz teraz — zł')).toBeVisible();
    await expectNoAccessibilityViolations(dialog);
  });
  it('preserves the dedicated contribution completion flow for an existing valuation', async () => {
    const execute = vi.fn(async () => ({ nextValue: 100, kind: 'INITIAL', atomic: true }));
    render(<AppRouter dependencies={dependencies({ recordPortfolioChange: { execute } })} />);
    const buttons = await screen.findAllByRole('button', { name: 'Podaj sumę dotychczasowych wpłat', hidden: true });
    fireEvent.click(buttons[0]!);
    expect(screen.getByRole('dialog', { name: 'Uzupełnij wpłaty' })).toBeVisible();
    expect(screen.getByLabelText('Inwestycja / rachunek')).toBeDisabled();
    expect(screen.getByLabelText('Ile masz teraz — zł')).toHaveValue(100);
    fireEvent.change(screen.getByLabelText('Ile łącznie wpłaciłem — zł'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    await waitFor(() =>
      expect(execute).toHaveBeenCalledWith(expect.objectContaining({ kind: 'INITIAL', amountPln: '90', valuePln: '100' }))
    );
  });
  it('selects the investment before offering actions and updates them for each holding', async () => {
    render(
      <AppRouter dependencies={dependencies({ loadPortfolio: { execute: async () => [{ ...entry, valuePln: 0 }] } })} />
    );
    const dialog = await openForm();
    const type = screen.getByLabelText('Inwestycja / rachunek');
    const action = screen.getByLabelText('Co chcesz zrobić?');
    expect(within(dialog).getAllByRole('combobox').indexOf(type)).toBeLessThan(
      within(dialog).getAllByRole('combobox').indexOf(action)
    );
    expect(within(action).queryByRole('option', { name: 'Wpisuję stan początkowy' })).not.toBeInTheDocument();
    fireEvent.change(type, { target: { value: 'IKE' } });
    expect(action).toHaveValue('INITIAL');
    expect(
      within(action)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['Wpisuję stan początkowy']);
    fireEvent.change(screen.getByLabelText('Ile masz teraz — zł'), { target: { value: '500' } });
    fireEvent.change(type, { target: { value: 'KONTO_BANKOWE' } });
    expect(action).toHaveValue('DEPOSIT');
    expect(screen.getByLabelText('Kwota — zł')).toHaveValue(null);
    fireEvent.change(type, { target: { value: '' } });
    expect(action).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zapisz zmianę' })).toBeDisabled();
  });
  it('checks the owner and subcategory independently when offering initial values', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: { execute: async () => [entry, { ...entry, type: 'GIELDA', subcategory: 'RYNKI_ROZWINIETE' }] }
        })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Razem' }));
    await openForm();
    fireEvent.change(screen.getByLabelText('Inwestycja / rachunek'), { target: { value: 'GIELDA' } });
    fireEvent.change(screen.getByLabelText('Rodzaj inwestycji'), { target: { value: 'RYNKI_ROZWINIETE' } });
    expect(screen.getByLabelText('Co chcesz zrobić?')).toHaveValue('DEPOSIT');
    fireEvent.change(screen.getByLabelText('Rodzaj inwestycji'), { target: { value: 'ZLOTO' } });
    expect(screen.getByLabelText('Co chcesz zrobić?')).toHaveValue('INITIAL');
    fireEvent.change(screen.getByLabelText('Zapisujesz dla'), { target: { value: 'zosia' } });
    fireEvent.change(screen.getByLabelText('Inwestycja / rachunek'), { target: { value: 'KONTO_BANKOWE' } });
    expect(screen.getByLabelText('Co chcesz zrobić?')).toHaveValue('INITIAL');
  });
  it.each(['DEPOSIT', 'BUY', 'WITHDRAWAL', 'SELL', 'VALUATION', 'INITIAL'])('maps direct %s action', async (kind) => {
    const execute = vi.fn(async () => ({ nextValue: 100, kind, atomic: true }));
    render(<AppRouter dependencies={dependencies({ recordPortfolioChange: { execute } })} />);
    await openForm();
    if (kind === 'INITIAL')
      fireEvent.change(screen.getByLabelText('Inwestycja / rachunek'), { target: { value: 'IKE' } });
    else fireEvent.change(screen.getByLabelText('Co chcesz zrobić?'), { target: { value: kind } });
    if (['VALUATION', 'INITIAL'].includes(kind))
      fireEvent.change(screen.getByLabelText('Ile masz teraz — zł'), { target: { value: '100' } });
    if (kind === 'INITIAL')
      fireEvent.change(screen.getByLabelText('Ile łącznie wpłaciłem — zł'), { target: { value: '90' } });
    else if (kind !== 'VALUATION') fireEvent.change(screen.getByLabelText('Kwota — zł'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    await waitFor(() =>
      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({ kind, asset: expect.objectContaining({ owner: 'jakub' }) })
      )
    );
  });
  it.each([
    ['DEPOSIT', 'amountPln', 'Kwota — zł'],
    ['VALUATION', 'currentValuePln', 'Ile masz teraz — zł']
  ])('associates and focuses %s validation', async (kind, field, label) => {
    const failure = new PortfolioChangeValidationFailure(field, 'Niepoprawna kwota.', 'INVALID');
    render(
      <AppRouter
        dependencies={dependencies({
          recordPortfolioChange: {
            execute: async () => {
              throw failure;
            }
          }
        })}
      />
    );
    await openForm();
    fireEvent.change(screen.getByLabelText('Co chcesz zrobić?'), { target: { value: kind } });
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      kind === 'VALUATION'
        ? 'Wartość widoczna na rachunku, np. 11 000 zł po wzroście inwestycji. Niepoprawna kwota.'
        : 'Niepoprawna kwota.'
    );
  });
  it('focuses sanitized general errors and keeps retry drafts', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          recordPortfolioChange: {
            execute: async () => {
              throw new Error('private database path');
            }
          }
        })}
      />
    );
    await openForm('10');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).toHaveTextContent('Nie udało się zapisać zmiany');
    expect(alert).not.toHaveTextContent('private');
    expect(screen.getByLabelText('Kwota — zł')).toHaveValue(10);
  });
  it.each(['resolved', 'rejected'])('deduplicates a %s save and unlocks controls', async (outcome) => {
    const pending = deferred(),
      execute = vi.fn(() => pending.promise);
    render(<AppRouter dependencies={dependencies({ recordPortfolioChange: { execute } })} />);
    await openForm('10');
    const form = screen.getByLabelText('Kwota — zł').closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(execute).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Zapisywanie…' })).toBeDisabled();
    expect(form).toHaveAttribute('aria-busy', 'true');
    if (outcome === 'resolved') {
      pending.resolve({ nextValue: 110, kind: 'DEPOSIT', atomic: true });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    } else {
      pending.reject(new Error('failure'));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Zapisz zmianę' })).toBeEnabled());
    }
    expect(screen.getByRole('button', { name: 'Jakub' })).toBeEnabled();
  });
  it('clears old owner data while the new snapshot loads', async () => {
    const pending = deferred();
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: {
            execute: ({ scope, filters }: { scope: { ownerId: string }; filters?: object }) =>
              scope.ownerId === 'zosia' && !filters ? pending.promise : Promise.resolve([entry])
          }
        })}
      />
    );
    await screen.findAllByText('100,00 zł');
    fireEvent.click(screen.getByRole('button', { name: 'Zosia' }));
    expect(screen.queryAllByText('100,00 zł')).toHaveLength(0);
    pending.resolve([{ ...entry, owner: 'zosia', valuePln: 2800 }]);
    await screen.findAllByText(/2800,00/);
  });
  it('opens selected holding history, allows editing and clears the filter', async () => {
    const gold = { ...entry, id: 'gold', type: 'GIELDA', subcategory: 'ZLOTO' };
    render(<AppRouter dependencies={dependencies({ loadPortfolio: { execute: async () => [entry, gold] } })} />);
    const table = await screen.findByRole('table', { name: 'Wpłaty, wartość i wynik każdej inwestycji' });
    const row = within(table).getByRole('rowheader', { name: /Złoto/ }).closest('tr')!;
    fireEvent.click(within(row).getByText('Szczegóły'));
    fireEvent.click(within(row).getByRole('button', { name: 'Edytuj / usuń' }));
    const history = screen.getByRole('tabpanel', { name: 'Historia' });
    expect(within(history).getAllByRole('button', { name: 'Edytuj' })).toHaveLength(1);
    expect(within(history).getByRole('button', { name: 'Usuń wpis' })).toBeEnabled();
    fireEvent.click(within(history).getByRole('button', { name: 'Edytuj' }));
    expect(screen.getByLabelText('Inwestycja / rachunek')).toHaveValue('GIELDA');
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    fireEvent.click(within(history).getByRole('button', { name: 'Pokaż całą historię' }));
    expect(within(history).getAllByRole('button', { name: 'Edytuj' })).toHaveLength(2);
  });
  it('keeps independent history available after snapshot failure', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: {
            execute: ({ filters }: { filters?: object }) =>
              filters ? Promise.resolve([entry]) : Promise.reject(new Error('private'))
          }
        })}
      />
    );
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
    expect(await screen.findByRole('button', { name: 'Edytuj' })).toBeEnabled();
    expect(screen.queryByText('private')).not.toBeInTheDocument();
  });
  it('merges transfer legs into one correction with its original owner', async () => {
    const buy = {
        ...operation,
        id: 'buy',
        groupId: 'buy',
        operationType: 'BUY',
        owner: 'zosia',
        type: 'GIELDA',
        subcategory: 'ZLOTO'
      },
      cash = { ...operation, id: 'cash', groupId: 'buy', operationType: 'SELL', owner: 'zosia' };
    const execute = vi.fn(async () => ({ nextValue: 125, kind: 'BUY', atomic: true }));
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: {
            execute: async () => [
              { ...entry, id: 'buy', owner: 'zosia', type: 'GIELDA', subcategory: 'ZLOTO' },
              { ...entry, id: 'cash', owner: 'zosia' }
            ]
          },
          loadPortfolioPerformance: { execute: async () => ({ operations: [buy, cash], performance: null }) },
          recordPortfolioChange: { execute }
        })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Razem' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj' }));
    expect(screen.getByText('Zapisujesz dla:')).toHaveTextContent('Zosia');
    expect(screen.getByLabelText('Inwestycja / rachunek')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Kwota — zł'), { target: { value: '125' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz poprawkę' }));
    await waitFor(() =>
      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({ editId: 'buy', kind: 'BUY', asset: expect.objectContaining({ owner: 'zosia' }) })
      )
    );
  });
  it('uses the same planner for retirement accounts', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: { execute: async () => [{ ...entry, type: 'IKE', subcategory: 'ZLOTO' }] }
        })}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Co dokupić?' }));
    expect(await screen.findByLabelText('Mam do zainwestowania — zł')).toBeVisible();
  });
  it('keeps the value chart collapsed until requested', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    const summary = await screen.findByText('Zobacz historię wartości');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
  });
  it('cancels undo and restores focus', async () => {
    const execute = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<AppRouter dependencies={dependencies({ deleteInvestmentEntry: { execute } })} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
    const button = await screen.findByRole('button', { name: 'Usuń wpis' });
    fireEvent.click(button);
    expect(execute).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Jakub'));
  });
  it.each(['entry', 'operation'])('confirms and deduplicates pending %s undo with context', async (record) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const pending = deferred(),
      execute = vi.fn(() => pending.promise);
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolioPerformance: {
            execute: async () => ({ operations: record === 'operation' ? [operation] : [], performance: null })
          },
          [record === 'operation' ? 'deleteInvestmentOperation' : 'deleteInvestmentEntry']: { execute }
        })}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
    const buttons = await screen.findAllByRole('button', { name: 'Usuń wpis' });
    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[0]!);
    expect(execute).toHaveBeenCalledOnce();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('2026-09-01'));
    expect(screen.getByRole('button', { name: 'Usuwanie…' })).toBeDisabled();
    pending.reject(new Error('failure'));
    await screen.findByText(/Nie udało się usunąć/);
    expect(screen.getAllByRole('button', { name: 'Usuń wpis' })[0]).toBeEnabled();
  });
  it('announces async export and blocks duplicate downloads', async () => {
    const pending = deferred(),
      execute = vi.fn(() => pending.promise);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<AppRouter dependencies={dependencies({ exportDatabaseBackup: { execute } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz kopię danych' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pobieranie…' }));
    expect(execute).toHaveBeenCalledOnce();
    expect(screen.getByText('Przygotowujemy kopię danych…')).toHaveAttribute('role', 'status');
    pending.resolve(new Blob());
    await screen.findByText('Pobrano kopię danych.');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
  it('confirms import, blocks duplicate uploads and focuses sanitized failures', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const pending = deferred(),
      execute = vi.fn(() => pending.promise);
    render(<AppRouter dependencies={dependencies({ importDatabaseBackup: { execute } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }));
    const input = screen.getByLabelText('Wybierz plik kopii danych'),
      file = new File(['{}'], 'backup.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });
    expect(execute).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Przywracanie…' })).toBeDisabled();
    pending.reject(new Error('private path'));
    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).toHaveTextContent('Nie udało się przywrócić kopii');
    expect(alert).not.toHaveTextContent('private');
  });

  it('distinguishes accepted writes from refreshed projections', async () => {
    const accepted = deferred(),
      refreshed = deferred();
    let waiting = false;
    render(
      <AppRouter
        dependencies={dependencies({
          recordPortfolioChange: { execute: () => accepted.promise },
          loadPortfolio: { execute: () => (waiting ? refreshed.promise : Promise.resolve([entry])) },
          loadPortfolioPerformance: {
            execute: () =>
              waiting
                ? refreshed.promise.then(() => ({ operations: [], performance: null }))
                : Promise.resolve({ operations: [], performance: null })
          }
        })}
      />
    );
    await openForm('10');
    waiting = true;
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    expect(screen.getByText('Zapisywanie…', { selector: '.inlineMessage' })).toHaveAttribute('role', 'status');
    accepted.resolve({ id: 'saved', nextValue: 110, kind: 'DEPOSIT', atomic: true });
    await screen.findByText('Zmiana zapisana. Odświeżamy oszczędności…');
    expect(document.getElementById('portfolio-panel-summary')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    refreshed.resolve([{ ...entry, valuePln: 110 }]);
    await screen.findByText('Zmiana zapisana. Podsumowanie jest aktualne.');
    expect(document.getElementById('portfolio-panel-summary')).toHaveAttribute('aria-busy', 'false');
  });
  it('leaves unrelated history controls usable during an undo and restores the failed row', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const pending = deferred();
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: { execute: async () => [entry, { ...entry, id: 'second', date: '2026-09-02' }] },
          deleteInvestmentEntry: { execute: () => pending.promise }
        })}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Historia' }));
    const buttons = await screen.findAllByRole('button', { name: 'Usuń wpis' });
    fireEvent.click(buttons[0]!);
    expect(screen.getByRole('button', { name: 'Usuwanie…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Usuń wpis' })).toBeEnabled();
    pending.reject(new Error('failure'));
    await screen.findByText(/Nie udało się usunąć/);
    expect(
      screen.getAllByRole('button', { name: 'Usuń wpis' }).every((button) => !button.hasAttribute('disabled'))
    ).toBe(true);
  });
  it('updates a holding value directly and prefills the correct asset and owner', async () => {
    render(<AppRouter dependencies={dependencies()} />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Zmień obecną wartość' }))[0]!);
    expect(screen.getByLabelText('Co chcesz zrobić?')).toHaveValue('VALUATION');
    expect(screen.getByLabelText('Ile masz teraz — zł')).toHaveValue(100);
    expect(screen.getByLabelText('Ile masz teraz — zł')).toHaveAccessibleDescription(
      'Wartość widoczna na rachunku, np. 11 000 zł po wzroście inwestycji.'
    );
    expect(screen.queryByLabelText('Ile łącznie wpłaciłem — zł')).not.toBeInTheDocument();
    expect(screen.getByText(/Suma Twoich wpłat pozostaje bez zmian/)).toBeVisible();
    expect(screen.getByText('Zapisujesz dla:')).toHaveTextContent('Jakub');
  });
});

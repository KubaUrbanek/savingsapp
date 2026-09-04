import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouter } from '../../src/app/AppRouter.js';
import { PortfolioChangeValidationFailure } from '../../src/application/portfolio/RecordPortfolioChange.js';

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<unknown>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function dependencies(overrides = {}) {
  return {
    preferences: {
      selectedOwner: () => 'jakub',
      selectOwner: vi.fn(),
      globalAllocation: () => ({ BONDS: 50, STOCKS: 30, GOLD: 20 }),
      changeGlobalAllocation: vi.fn(),
      stockAllocation: () => ({ ZLOTO: 40, RYNKI_ROZWINIETE: 30, RYNKI_ROZWIJAJACE_SIE: 30 }),
      changeStockAllocation: vi.fn(),
      householdGoal: () => 500000,
      changeHouseholdGoal: vi.fn()
    },
    useCases: {
      loadReferenceData: { execute: async () => ({ users: ['jakub'], types: ['KONTO_BANKOWE'] }) },
      loadPortfolio: { execute: async () => [] },
      loadPortfolioPerformance: { execute: async () => ({ operations: [], performance: null }) },
      recordPortfolioChange: { execute: async () => ({ nextValue: 10, kind: 'DEPOSIT', atomic: true }) },
      deleteInvestmentEntry: { execute: async () => undefined },
      deleteInvestmentOperation: { execute: async () => undefined },
      importDatabaseBackup: { execute: async () => undefined },
      exportDatabaseBackup: { execute: async () => new Blob() },
      ...overrides
    }
  };
}

describe('AppRouter', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the about route', () => {
    window.history.pushState({}, '', '/about');
    render(<AppRouter dependencies={{}} />);
    expect(screen.getByText(/Portfele bez logowania/i)).toBeTruthy();
  });

  it('links past the header to the stable main-content destination', () => {
    render(<AppRouter dependencies={dependencies()} />);

    expect(screen.getByRole('link', { name: 'Przejdź do treści' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it.each([
    ['/', 'Portfele | Oszczędności'],
    ['/about', 'Informacje | Oszczędności'],
    ['/brak', 'Nie znaleziono strony | Oszczędności']
  ])('sets the document title for %s', (path, title) => {
    window.history.pushState({}, '', path);
    render(<AppRouter dependencies={dependencies()} />);

    expect(document.title).toBe(title);
  });

  it('focuses the primary heading after client-side navigation but not on initial load', async () => {
    render(
      <React.StrictMode>
        <AppRouter dependencies={dependencies()} />
      </React.StrictMode>
    );

    const initialHeading = screen.getByRole('heading', { level: 1, name: 'Oszczędności pod kontrolą.' });
    expect(initialHeading).not.toHaveFocus();

    fireEvent.click(screen.getByRole('link', { name: 'Informacje' }));

    const nextHeading = await screen.findByRole('heading', { level: 1, name: 'Portfele bez logowania.' });
    await waitFor(() => expect(nextHeading).toHaveFocus());
    expect(document.title).toBe('Informacje | Oszczędności');
  });

  it('names filter groups and announces each toggle button selected state', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          loadReferenceData: {
            execute: async () => ({ users: ['jakub', 'zosia'], types: ['OBLIGACJE', 'KONTO_BANKOWE'] })
          }
        })}
      />
    );

    const ownerGroup = await screen.findByRole('group', { name: 'Czyj portfel wyświetlić?' });
    const typeGroup = screen.getByRole('group', { name: 'Rodzaj inwestycji' });
    const subcategoryGroup = await screen.findByRole('group', { name: 'Podkategorie inwestycji' });
    expect(ownerGroup).toHaveAccessibleName('Czyj portfel wyświetlić?');
    expect(typeGroup).toHaveAccessibleName('Rodzaj inwestycji');
    expect(subcategoryGroup).toHaveAccessibleName('Podkategorie inwestycji');

    expect(screen.getByRole('button', { name: /jakub/i, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zosia/i, pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Obligacje', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Konto bankowe', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wszystkie', pressed: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3-letnie' }));
    expect(screen.getByRole('button', { name: 'Wszystkie', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3-letnie', pressed: true })).toBeInTheDocument();
  });

  it('associates a validation error with the invalid field and focuses it', async () => {
    const validationError = new PortfolioChangeValidationFailure(
      'amountPln',
      'Kwota przekracza aktualną wartość aktywa.',
      'INSUFFICIENT_PORTFOLIO_VALUE'
    );
    render(
      <AppRouter
        dependencies={dependencies({ recordPortfolioChange: { execute: async () => Promise.reject(validationError) } })}
      />
    );

    const amount = await screen.findByLabelText('Kwota w PLN');
    fireEvent.change(amount, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));

    const message = await screen.findByText(validationError.message);
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(amount).toHaveAttribute('aria-describedby', message.id);
    expect(message).toHaveAttribute('id', 'portfolio-change-amount-error');
    expect(amount).toHaveFocus();
  });

  it('keeps validation feedback associated when the conditional valuation input is shown', async () => {
    const validationError = new PortfolioChangeValidationFailure(
      'currentValuePln',
      'Podaj aktualną wartość aktywa.',
      'INVALID_CURRENT_VALUE'
    );
    render(
      <AppRouter
        dependencies={dependencies({ recordPortfolioChange: { execute: async () => Promise.reject(validationError) } })}
      />
    );

    await screen.findByLabelText('Kwota w PLN');
    fireEvent.change(screen.getByLabelText('Rodzaj zmiany'), { target: { value: 'VALUATION' } });

    const currentValue = screen.getByLabelText('Aktualna wartość w PLN');
    expect(currentValue).toHaveAttribute('id', 'portfolio-change-current-value');
    fireEvent.change(currentValue, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));

    const message = await screen.findByText(validationError.message);
    expect(message).toHaveAttribute('id', 'portfolio-change-current-value-error');
    expect(currentValue).toHaveAttribute('aria-invalid', 'true');
    expect(currentValue).toHaveAttribute('aria-describedby', message.id);
    expect(currentValue).toHaveFocus();
  });

  it('focuses the accessible error summary for a non-field failure', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          recordPortfolioChange: { execute: async () => Promise.reject(new Error('Awaria API')) }
        })}
      />
    );

    fireEvent.change(await screen.findByLabelText('Kwota w PLN'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveTextContent('Awaria API'));
    expect(alert).toHaveFocus();
    expect(alert).not.toHaveTextContent('Nie udało się zapisać');
  });

  it('announces progress and success for an asynchronous export', async () => {
    const operation = deferred();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const exportDatabaseBackup = vi.fn(() => operation.promise);
    const appDependencies = dependencies({ exportDatabaseBackup: { execute: exportDatabaseBackup } });
    render(<AppRouter dependencies={appDependencies} />);

    await screen.findByLabelText('Kwota w PLN');
    await waitFor(() => expect(appDependencies.preferences.selectOwner).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'Eksportuj bazę' }));
    const exportingButton = screen.getByRole('button', { name: 'Eksportowanie…' });
    fireEvent.click(exportingButton);
    expect(exportingButton).toBeDisabled();
    expect(exportDatabaseBackup).toHaveBeenCalledOnce();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Przygotowywanie eksportu');

    operation.resolve(new Blob());
    await waitFor(() => expect(status).toHaveTextContent('Wyeksportowano bazę danych'));
    expect(screen.getByRole('button', { name: 'Eksportuj bazę' })).toBeEnabled();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it('announces import failures without save-related wording and focuses the alert', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const operation = deferred();
    const importDatabaseBackup = vi.fn(() => operation.promise);
    render(
      <AppRouter
        dependencies={dependencies({
          importDatabaseBackup: { execute: importDatabaseBackup }
        })}
      />
    );

    await screen.findByLabelText('Kwota w PLN');
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    if (!fileInput) throw new Error('Import file input was not rendered.');
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByRole('button', { name: 'Importowanie…' })).toBeDisabled();
    expect(importDatabaseBackup).toHaveBeenCalledOnce();
    operation.reject(new Error('Zły plik'));

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveTextContent('Zły plik'));
    expect(alert).not.toHaveTextContent('Nie udało się zapisać');
    expect(alert).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Importuj i nadpisz' })).toBeEnabled();
  });

  it.each([
    [
      'resolved',
      (operation: ReturnType<typeof deferred>) => operation.resolve({ nextValue: 10, kind: 'DEPOSIT', atomic: true })
    ],
    ['rejected', (operation: ReturnType<typeof deferred>) => operation.reject(new Error('Awaria zapisu'))]
  ])('prevents duplicate saves and restores the form after a %s command', async (_outcome, settle) => {
    const operation = deferred();
    const recordPortfolioChange = vi.fn(() => operation.promise);
    render(<AppRouter dependencies={dependencies({ recordPortfolioChange: { execute: recordPortfolioChange } })} />);

    const amount = await screen.findByLabelText('Kwota w PLN');
    fireEvent.change(amount, { target: { value: '10' } });
    const form = amount.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(form).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Zapisywanie…' })).toBeDisabled();
    expect(recordPortfolioChange).toHaveBeenCalledOnce();

    settle(operation);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Zapisz zmianę' })).toBeEnabled());
    expect(form).toHaveAttribute('aria-busy', 'false');
  });

  it('cancels operation deletion and returns focus to the originating button', async () => {
    const deleteOperation = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolioPerformance: {
            execute: async () => ({
              operations: [
                {
                  id: 'operation-1',
                  operationType: 'DEPOSIT',
                  type: 'KONTO_BANKOWE',
                  subcategory: '',
                  date: '2026-08-31',
                  amountPln: 1250,
                  note: 'Test'
                }
              ],
              performance: null
            })
          },
          deleteInvestmentOperation: { execute: deleteOperation }
        })}
      />
    );

    const deleteButton = await screen.findByRole('button', { name: 'Usuń' });
    deleteButton.focus();
    fireEvent.click(deleteButton);

    expect(deleteOperation).not.toHaveBeenCalled();
    expect(deleteButton).toHaveFocus();
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Typ rekordu: operacja/));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Aktywo: Konto bankowe/));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Data: 2026-08-31/));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Kwota: 1\s?250,00\s*zł/));
  });

  it('confirms valuation deletion with identifying context before invoking the command', async () => {
    const deletion = deferred();
    const deleteEntry = vi.fn(() => deletion.promise);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const appDependencies = dependencies({
      loadPortfolio: {
        execute: async () => [
          {
            id: 'entry-1',
            owner: 'jakub',
            type: 'KONTO_BANKOWE',
            subcategory: '',
            date: '2026-09-01',
            valuePln: 4321.5
          }
        ]
      },
      deleteInvestmentEntry: { execute: deleteEntry }
    });
    render(<AppRouter dependencies={appDependencies} />);

    await waitFor(() => expect(appDependencies.preferences.selectOwner).toHaveBeenCalledTimes(2));
    const buttons = await screen.findAllByRole('button', { name: 'Usuń' });
    const deleteButton = buttons.at(-1)!;
    deleteButton.focus();
    fireEvent.click(deleteButton);

    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Typ rekordu: wpis wyceny/));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Wartość: 4\s?321,50\s*zł/));
    expect(deleteEntry).toHaveBeenCalledOnce();
    expect(deleteEntry).toHaveBeenCalledWith('entry-1');
    expect(deleteButton).toHaveFocus();
    deletion.resolve(undefined);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Usunięto wpis'));
  });

  it('disables a confirmed delete while pending and prevents duplicate submissions', async () => {
    const deletion = deferred();
    const deleteOperation = vi.fn(() => deletion.promise);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolioPerformance: {
            execute: async () => ({
              operations: [
                {
                  id: 'operation-1',
                  operationType: 'WITHDRAWAL',
                  type: 'KONTO_BANKOWE',
                  date: '2026-09-01',
                  amountPln: 50
                }
              ],
              performance: null
            })
          },
          deleteInvestmentOperation: { execute: deleteOperation }
        })}
      />
    );

    const deleteButton = await screen.findByRole('button', { name: 'Usuń' });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    const pendingButton = await screen.findByRole('button', { name: 'Usuwanie…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton.closest('.entryRow')).toHaveAttribute('aria-busy', 'true');
    expect(deleteOperation).toHaveBeenCalledOnce();

    deletion.resolve(undefined);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usuń' })).toBeEnabled());
  });

  it('keeps unrelated rows usable and restores a delete control after rejection', async () => {
    const deletion = deferred();
    const deleteOperation = vi.fn(() => deletion.promise);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const appDependencies = dependencies({
      loadPortfolioPerformance: {
        execute: async () => ({
          operations: [
            {
              id: 'operation-1',
              operationType: 'DEPOSIT',
              type: 'KONTO_BANKOWE',
              date: '2026-09-01',
              amountPln: 50
            },
            {
              id: 'operation-2',
              operationType: 'WITHDRAWAL',
              type: 'KONTO_BANKOWE',
              date: '2026-09-02',
              amountPln: 25
            }
          ],
          performance: null
        })
      },
      deleteInvestmentOperation: { execute: deleteOperation }
    });
    render(<AppRouter dependencies={appDependencies} />);

    await waitFor(() => expect(appDependencies.preferences.selectOwner).toHaveBeenCalledTimes(2));
    const deleteButtons = await screen.findAllByRole('button', { name: 'Usuń' });
    const firstDelete = deleteButtons[0]!;
    const secondDelete = deleteButtons[1]!;
    fireEvent.click(firstDelete);

    expect(screen.getByRole('button', { name: 'Usuwanie…' })).toBeDisabled();
    expect(secondDelete).toBeEnabled();
    deletion.reject(new Error('Nie udało się usunąć'));

    await waitFor(() => expect(firstDelete).toBeEnabled());
    expect(secondDelete).toBeEnabled();
  });
});

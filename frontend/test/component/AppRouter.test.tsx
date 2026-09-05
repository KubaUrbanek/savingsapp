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

  it('links the local portfolio navigation to stable section destinations', () => {
    render(<AppRouter dependencies={dependencies()} />);

    const navigation = screen.getByRole('navigation', { name: 'Nawigacja po sekcjach portfela' });
    const destinations = {
      Podsumowanie: 'portfolio-summary',
      Aktualizacja: 'portfolio-update',
      Analiza: 'portfolio-analysis',
      Alokacja: 'portfolio-allocation',
      Historia: 'portfolio-history'
    };

    for (const [name, id] of Object.entries(destinations)) {
      expect(navigation).toContainElement(screen.getByRole('link', { name }));
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `#${id}`);
      expect(document.getElementById(id)).toBeInTheDocument();
    }
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

    const initialHeading = screen.getByRole('heading', { level: 1, name: 'Portfel: jakub' });
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

  it('orders the workspace context, scope switcher, summary and quick-update form without changing scope behavior', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          loadReferenceData: {
            execute: async () => ({ users: ['jakub', 'zosia'], types: ['KONTO_BANKOWE'] })
          },
          loadPortfolio: {
            execute: async ({ scope }: { scope: { kind: string; ownerId?: string } }) =>
              scope.kind === 'OWNER'
                ? [
                    {
                      id: `entry-${scope.ownerId}`,
                      owner: scope.ownerId,
                      type: 'KONTO_BANKOWE',
                      subcategory: '',
                      date: '2026-09-03',
                      valuePln: scope.ownerId === 'jakub' ? 4200 : 2800
                    }
                  ]
                : []
          }
        })}
      />
    );

    const heading = await screen.findByRole('heading', { level: 1, name: 'Portfel: jakub' });
    const scopeSwitcher = screen.getByRole('group', { name: 'Czyj portfel wyświetlić?' });
    const summary = document.querySelector('.summaryPanel')!;
    const form = screen.getByRole('heading', { level: 2, name: 'Co zmieniło się w portfelu?' }).closest('form')!;

    expect(heading.compareDocumentPosition(scopeSwitcher) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scopeSwitcher.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(summary.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(summary).toHaveTextContent('Stan danych2026-09-03'));

    fireEvent.click(screen.getByRole('button', { name: /zosia/i, pressed: false }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Portfel: zosia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zosia/i, pressed: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Razem', pressed: false }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Portfel całego gospodarstwa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Razem', pressed: true })).toBeInTheDocument();
  });

  it('clears the previous owner data while the newly selected owner is loading', async () => {
    const zosiaSnapshot = deferred();
    render(
      <AppRouter
        dependencies={dependencies({
          loadReferenceData: { execute: async () => ({ users: ['jakub', 'zosia'], types: ['KONTO_BANKOWE'] }) },
          loadPortfolio: {
            execute: async ({ scope, filters }: { scope: { ownerId: string }; filters?: object }) => {
              if (scope.ownerId === 'zosia' && !filters) return zosiaSnapshot.promise;
              return [
                {
                  id: `entry-${scope.ownerId}`,
                  owner: scope.ownerId,
                  type: 'KONTO_BANKOWE',
                  subcategory: '',
                  date: '2026-09-03',
                  valuePln: scope.ownerId === 'jakub' ? 4200 : 2800
                }
              ];
            }
          }
        })}
      />
    );

    expect((await screen.findAllByText(/4200,00/)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /zosia/i, pressed: false }));

    expect(screen.queryAllByText(/4200,00/)).toHaveLength(0);
    expect(screen.getByRole('status', { name: 'Wczytywanie podsumowania portfela…' })).toBeInTheDocument();
    zosiaSnapshot.resolve([
      { id: 'entry-zosia', owner: 'zosia', type: 'KONTO_BANKOWE', subcategory: '', date: '2026-09-04', valuePln: 2800 }
    ]);
    expect((await screen.findAllByText(/2800,00/)).length).toBeGreaterThan(0);
  });

  it('keeps an independent section available when the snapshot query fails', async () => {
    render(
      <AppRouter
        dependencies={dependencies({
          loadPortfolio: {
            execute: async ({ filters }: { filters?: object }) =>
              filters
                ? [
                    {
                      id: 'entry-jakub',
                      owner: 'jakub',
                      type: 'KONTO_BANKOWE',
                      subcategory: '',
                      date: '2026-09-03',
                      valuePln: 4200
                    }
                  ]
                : Promise.reject(new Error('wewnętrzny błąd snapshotu'))
          }
        })}
      />
    );

    expect(await screen.findByText('Historia wycen: jakub')).toBeInTheDocument();
    expect((await screen.findAllByText(/4200,00/)).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('alert').some((alert) => alert.textContent?.includes('Nie udało się wczytać tej sekcji'))
    ).toBe(true);
    expect(screen.queryByText('wewnętrzny błąd snapshotu')).not.toBeInTheDocument();
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
    await waitFor(() => expect(amount).toHaveFocus());
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
    expect(alert).toHaveTextContent('Nie udało się zapisać zmiany');
    expect(alert).toHaveTextContent('Sprawdź dane i spróbuj ponownie');
  });

  it('distinguishes an accepted command from synchronized CQRS projections', async () => {
    const acceptedCommand = deferred();
    const refreshedEntries = deferred();
    const refreshedSnapshot = deferred();
    const refreshedPerformance = deferred();
    let waitForProjection = false;
    const entry = {
      id: 'entry-jakub',
      owner: 'jakub',
      type: 'KONTO_BANKOWE',
      subcategory: '',
      date: '2026-09-03',
      valuePln: 100
    };
    const projectedEntry = { ...entry, date: '2026-09-04', valuePln: 10 };
    const projectedOperation = {
      id: 'operation-1',
      owner: 'jakub',
      operationType: 'DEPOSIT',
      type: 'KONTO_BANKOWE',
      subcategory: '',
      date: '2026-09-04',
      amountPln: 10
    };

    render(
      <AppRouter
        dependencies={dependencies({
          recordPortfolioChange: { execute: () => acceptedCommand.promise },
          loadPortfolio: {
            execute: ({ filters }: { filters?: object }) => {
              if (!waitForProjection) return Promise.resolve([entry]);
              return filters ? refreshedEntries.promise : refreshedSnapshot.promise;
            }
          },
          loadPortfolioPerformance: {
            execute: () =>
              waitForProjection ? refreshedPerformance.promise : Promise.resolve({ operations: [], performance: null })
          }
        })}
      />
    );

    fireEvent.change(await screen.findByLabelText('Kwota w PLN'), { target: { value: '10' } });
    waitForProjection = true;
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmianę' }));
    const liveStatus = screen.getByLabelText('Informacje o operacjach').querySelector('[role="status"]');
    expect(liveStatus).not.toBeNull();
    expect(liveStatus).toHaveTextContent('Zapisywanie…');

    acceptedCommand.resolve({ nextValue: 10, kind: 'DEPOSIT', atomic: true });

    const savedMessage = await screen.findByText('Zmiana zapisana. Aktualizujemy podsumowanie…');
    const status = savedMessage.closest('[role="status"]');
    expect(status).not.toBeNull();
    if (!status) throw new Error('The portfolio command status was not rendered.');
    await waitFor(() => expect(status).toHaveTextContent('Aktualizujemy podsumowanie'));
    expect(document.getElementById('portfolio-summary')).toHaveAttribute('aria-busy', 'true');
    expect(document.getElementById('portfolio-allocation')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /jakub/i, pressed: true })).toBeEnabled();

    refreshedEntries.resolve([projectedEntry]);
    refreshedSnapshot.resolve([projectedEntry]);
    refreshedPerformance.resolve({ operations: [projectedOperation], performance: null });

    await waitFor(() => expect(status).toHaveTextContent('Podsumowanie jest aktualne'));
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
    let deleted = false;
    const appDependencies = dependencies({
      loadPortfolio: {
        execute: async () =>
          deleted
            ? []
            : [
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
    deleted = true;
    deletion.resolve(undefined);
    await screen.findByText('Zmiana zapisana. Podsumowanie jest aktualne.');
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

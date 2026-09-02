// @ts-nocheck
import React from 'react';
import { FALLBACK_USERS, subcategoriesFor } from '../../domain/portfolio/constants.js';
import { HouseholdPortfolio, OwnerPortfolio, PortfolioScopeKind } from '../../application/PortfolioScope.js';
import { buildCurrentSnapshot } from '../../domain/portfolio/snapshot.js';
import { usePortfolioController } from '../portfolio/hooks/usePortfolioController.js';
import { dataFrom } from '../portfolio/hooks/queryState.js';
import { GlobalAllocationPanel } from '../components/GlobalAllocationPanel.jsx';
import { StockAllocationPanel } from '../components/StockAllocationPanel.jsx';
import { SummaryChart } from '../components/SummaryChart.jsx';
import { HouseholdDashboard } from '../components/HouseholdDashboard.jsx';
import {
  displayName,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  OPERATION_LABELS,
  SUBCATEGORY_LABELS,
  TYPE_LABELS,
  today
} from '../viewModels/formatters.js';
import { mapPortfolioChangeForm } from '../mappers/portfolioChangeFormMapper.js';
import { PortfolioChangeValidationFailure } from '../../application/portfolio/RecordPortfolioChange.js';

export function Home({ dependencies }) {
  const { useCases, preferences } = dependencies;
  const [portfolioScope, setPortfolioScope] = React.useState(() => OwnerPortfolio(preferences.selectedOwner()));
  const [typeFilter, setTypeFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});
  const fieldRefs = React.useRef({});
  const errorSummaryRef = React.useRef(null);
  const pendingErrorFocusRef = React.useRef(false);
  const [operationForm, setOperationForm] = React.useState({
    operationType: 'DEPOSIT',
    type: '',
    subcategory: '',
    amountPln: '',
    currentValuePln: '',
    date: today()
  });
  const importInputRef = React.useRef(null);
  const isHouseholdView = portfolioScope.kind === PortfolioScopeKind.HOUSEHOLD;
  const selectedOwner = isHouseholdView ? null : portfolioScope.ownerId;
  const controller = usePortfolioController(useCases, portfolioScope, {
    type: typeFilter,
    subcategory: subcategoryFilter
  });
  const referenceData = dataFrom(controller.referenceData, { users: FALLBACK_USERS, types: [] });
  const { users, types } = referenceData;
  const graphEntries = dataFrom(controller.snapshot, []);
  const operations = dataFrom(controller.operations, []);
  const performance = dataFrom(controller.performance, null);
  const reportError = React.useCallback((nextError) => {
    setStatus('');
    pendingErrorFocusRef.current = true;
    setError(nextError.message);
  }, []);

  React.useEffect(() => {
    const [invalidField] = Object.keys(fieldErrors);
    if (invalidField) fieldRefs.current[invalidField]?.focus();
  }, [fieldErrors]);

  React.useEffect(() => {
    if (!error || !pendingErrorFocusRef.current) return;
    errorSummaryRef.current?.focus();
    pendingErrorFocusRef.current = false;
  }, [error]);

  React.useEffect(() => {
    if (controller.referenceData.status === 'success') {
      const { users: loadedUsers, types: loadedTypes } = controller.referenceData.data;
      const firstType = loadedTypes[0] || '';
      setTypeFilter((current) => current || firstType);

      setOperationForm((current) => ({
        ...current,
        type: current.type || firstType,
        subcategory: subcategoriesFor(current.type || firstType)[0] || ''
      }));

      setPortfolioScope((current) =>
        current.kind === PortfolioScopeKind.HOUSEHOLD
          ? HouseholdPortfolio(loadedUsers)
          : OwnerPortfolio(loadedUsers.includes(current.ownerId) ? current.ownerId : loadedUsers[0])
      );
    }
  }, [controller.referenceData.status]);

  React.useEffect(() => {
    if (!isHouseholdView) {
      try {
        preferences.selectOwner(selectedOwner);
      } catch (preferenceError) {
        reportError(preferenceError);
      }
    }
    setStatus('');
  }, [portfolioScope, selectedOwner, isHouseholdView, preferences, reportError]);

  React.useEffect(() => {
    const failed = [
      controller.referenceData,
      controller.entries,
      controller.snapshot,
      controller.operations,
      controller.performance
    ].find((state) => state.status === 'failure');
    if (failed) reportError(failed.error);
  }, [
    controller.referenceData,
    controller.entries,
    controller.snapshot,
    controller.operations,
    controller.performance,
    reportError
  ]);

  const currentEntries = buildCurrentSnapshot(graphEntries);
  const currentEntriesForView = typeFilter
    ? currentEntries.filter((entry) => entry.type === typeFilter)
    : currentEntries;
  const totalsByType = currentEntries.reduce((totals, entry) => {
    totals[entry.type] = (totals[entry.type] || 0) + Number(entry.valuePln);
    return totals;
  }, {});
  const totalValue = currentEntriesForView.reduce((sum, entry) => sum + Number(entry.valuePln), 0);
  const filterSubcategories = typeFilter ? subcategoriesFor(typeFilter) : [];
  const operationSubcategories = operationForm.type ? subcategoriesFor(operationForm.type) : [];

  function changeType(nextType) {
    setTypeFilter(nextType);
    setSubcategoryFilter('');
    setOperationForm((current) => ({ ...current, type: nextType, subcategory: subcategoriesFor(nextType)[0] || '' }));
  }

  function exportDatabase() {
    setError('');
    setStatus('Przygotowywanie eksportu...');

    controller.commands
      .exportDatabaseBackup()
      .then((blob) => {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `oszczednosci-database-${today()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        setStatus('Wyeksportowano bazę danych do pliku JSON.');
      })
      .catch((fetchError) => {
        reportError(fetchError);
      });
  }

  function chooseImportFile() {
    importInputRef.current?.click();
  }

  function importDatabase(event) {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm('Import nadpisze aktualną bazę danych. Czy na pewno chcesz kontynuować?');
    if (!confirmed) return;

    setError('');
    setStatus('Importowanie bazy danych...');

    controller.commands
      .importDatabaseBackup(file)
      .then(() => {
        setStatus('Zaimportowano bazę danych i odświeżono widok.');
      })
      .catch((fetchError) => {
        reportError(fetchError);
      });
  }

  function prepareStockEntry(subcategory) {
    setOperationForm((current) => ({
      ...current,
      operationType: 'VALUATION',
      type: 'GIELDA',
      subcategory,
      currentValuePln: '',
      date: today()
    }));
    setTypeFilter('GIELDA');
    setSubcategoryFilter(subcategory);
    setStatus(`Wpisz aktualną wartość ETF: ${SUBCATEGORY_LABELS[subcategory]}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteEntry(id) {
    controller.commands
      .deleteInvestmentEntry(id)
      .then(() => {
        setStatus('Usunięto wpis.');
      })
      .catch(reportError);
  }

  function submitOperation(event) {
    event.preventDefault();
    const command = mapPortfolioChangeForm(operationForm, selectedOwner, currentEntries);
    setError('');
    setFieldErrors({});
    setStatus('Zapisywanie…');
    controller.commands
      .recordPortfolioChange(command)
      .then(({ nextValue, kind, atomic }) => {
        setOperationForm((current) => ({ ...current, amountPln: '', currentValuePln: '' }));
        const saved =
          kind === 'VALUATION'
            ? 'Zapisano aktualną wycenę.'
            : `Zapisano operację. Nowy stan: ${formatMoney(nextValue)}.`;
        setStatus(atomic ? saved : `${saved} Operacja i wycena zostały zapisane oddzielnie.`);
      })
      .catch((fetchError) => {
        setStatus('');
        if (fetchError instanceof PortfolioChangeValidationFailure) {
          setFieldErrors({ [fetchError.field]: fetchError.message });
        } else reportError(fetchError);
      });
  }

  function deleteOperation(id) {
    controller.commands.deleteInvestmentOperation(id).catch(reportError);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Twój finansowy pulpit</p>
        <h1>Oszczędności pod kontrolą.</h1>
        <p>
          Sprawdzaj wartość portfela, aktualizuj wyceny i pilnuj przyjętego planu — wszystko w jednym, czytelnym
          miejscu.
        </p>
      </section>

      <section className="controlSurface" aria-label="Ustawienia widoku portfela">
        <div className="filterGroup">
          <p className="filterLabel">Czyj portfel wyświetlić?</p>
          <div className="userSwitcher" aria-label="Wybór użytkownika">
            {users.map((user) => (
              <button
                className={!isHouseholdView && user === selectedOwner ? 'userPill active' : 'userPill'}
                key={user}
                type="button"
                onClick={() => setPortfolioScope(OwnerPortfolio(user))}
              >
                <span className="userAvatar" aria-hidden="true">
                  {displayName(user).charAt(0)}
                </span>
                {displayName(user)}
              </button>
            ))}
            <button
              className={isHouseholdView ? 'userPill active' : 'userPill'}
              type="button"
              onClick={() => setPortfolioScope(HouseholdPortfolio(users))}
            >
              <span className="userAvatar" aria-hidden="true">
                ⌂
              </span>
              Razem
            </button>
          </div>
        </div>
        {!isHouseholdView && (
          <div className="filterGroup">
            <p className="filterLabel">Rodzaj inwestycji</p>
            <div className="typeNav" aria-label="Rodzaje inwestycji">
              {types.map((type) => (
                <button
                  className={type === typeFilter ? 'typeTab active' : 'typeTab'}
                  key={type}
                  type="button"
                  onClick={() => changeType(type)}
                >
                  {TYPE_LABELS[type] || type}
                </button>
              ))}
            </div>
            {filterSubcategories.length > 0 && (
              <div className="subtypeNav" aria-label="Podkategorie inwestycji">
                <button
                  className={!subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'}
                  type="button"
                  onClick={() => setSubcategoryFilter('')}
                >
                  Wszystkie
                </button>
                {filterSubcategories.map((subcategory) => (
                  <button
                    className={subcategory === subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'}
                    key={subcategory}
                    type="button"
                    onClick={() => setSubcategoryFilter(subcategory)}
                  >
                    {SUBCATEGORY_LABELS[subcategory] || subcategory}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="formFeedback" aria-label="Informacje o operacjach">
        <p className="success" role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
        <p ref={errorSummaryRef} className="error" role="alert" tabIndex={-1} aria-atomic="true">
          {error}
        </p>
      </div>

      {isHouseholdView ? (
        <HouseholdDashboard
          entries={graphEntries}
          users={users}
          types={types}
          preferences={preferences}
          onPreferenceError={reportError}
        />
      ) : (
        <>
          <section className="dashboardGrid">
            <article className="panel summaryPanel">
              <p className="eyebrow">Aktualny widok</p>
              <h2>
                {displayName(selectedOwner)} — {typeFilter ? TYPE_LABELS[typeFilter] : 'wszystkie inwestycje'}
              </h2>
              <p className="totalValue">{formatMoney(totalValue)}</p>
              <div className="summaryGrid">
                {types.map((type) => (
                  <div className="summaryCard" key={type}>
                    <span>{TYPE_LABELS[type] || type}</span>
                    <strong>{formatMoney(totalsByType[type] || 0)}</strong>
                  </div>
                ))}
              </div>
              {performance && (
                <div className="performanceGrid compactPerformance">
                  <div>
                    <span>Wynik w tym miesiącu</span>
                    <strong className={Number(performance.monthlyResultPln) >= 0 ? 'positiveText' : 'negativeText'}>
                      {formatSignedMoney(performance.monthlyResultPln)}
                    </strong>
                  </div>
                  <div>
                    <span>Miesięczna stopa zwrotu</span>
                    <strong>
                      {formatPercent(
                        performance.monthlyReturnRatePercent == null
                          ? NaN
                          : Number(performance.monthlyReturnRatePercent)
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Łączny wynik inwestycji</span>
                    <strong>{formatSignedMoney(performance.nominalResultPln)}</strong>
                  </div>
                </div>
              )}
            </article>
            <form className="panel formPanel unifiedForm" onSubmit={submitOperation}>
              <p className="eyebrow">Jedno miejsce do aktualizacji</p>
              <h2>Co zmieniło się w portfelu?</h2>
              <p className="formHint">
                Wpłata i wypłata automatycznie zmienią stan. „Aktualna wycena” zapisuje zmianę rynku bez przepływu
                pieniędzy.
              </p>
              <label>
                Rodzaj zmiany
                <select
                  id="portfolio-change-operation-type"
                  ref={(element) => {
                    fieldRefs.current.operationType = element;
                  }}
                  aria-invalid={fieldErrors.operationType ? 'true' : undefined}
                  aria-describedby={fieldErrors.operationType ? 'portfolio-change-operation-type-error' : undefined}
                  value={operationForm.operationType}
                  onChange={(event) => setOperationForm({ ...operationForm, operationType: event.target.value })}
                >
                  <option value="DEPOSIT">Wpłata — zwiększ stan</option>
                  <option value="WITHDRAWAL">Wypłata — zmniejsz stan</option>
                  <option value="VALUATION">Aktualna wycena — policz zysk lub stratę</option>
                  <option value="BUY">Kupno — zwiększ stan</option>
                  <option value="SELL">Sprzedaż — zmniejsz stan</option>
                </select>
                {fieldErrors.operationType && (
                  <span id="portfolio-change-operation-type-error" className="error">
                    {fieldErrors.operationType}
                  </span>
                )}
              </label>
              <label>
                Aktywo
                <select
                  id="portfolio-change-type"
                  ref={(element) => {
                    fieldRefs.current.type = element;
                  }}
                  aria-invalid={fieldErrors.type ? 'true' : undefined}
                  aria-describedby={fieldErrors.type ? 'portfolio-change-type-error' : undefined}
                  required
                  value={operationForm.type}
                  onChange={(event) => {
                    const type = event.target.value;
                    setOperationForm({ ...operationForm, type, subcategory: subcategoriesFor(type)[0] || '' });
                  }}
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type] || type}
                    </option>
                  ))}
                </select>
                {fieldErrors.type && (
                  <span id="portfolio-change-type-error" className="error">
                    {fieldErrors.type}
                  </span>
                )}
              </label>
              {operationSubcategories.length > 0 && (
                <label>
                  Podkategoria
                  <select
                    id="portfolio-change-subcategory"
                    ref={(element) => {
                      fieldRefs.current.subcategory = element;
                    }}
                    aria-invalid={fieldErrors.subcategory ? 'true' : undefined}
                    aria-describedby={fieldErrors.subcategory ? 'portfolio-change-subcategory-error' : undefined}
                    required
                    value={operationForm.subcategory}
                    onChange={(event) => setOperationForm({ ...operationForm, subcategory: event.target.value })}
                  >
                    {operationSubcategories.map((value) => (
                      <option key={value} value={value}>
                        {SUBCATEGORY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.subcategory && (
                    <span id="portfolio-change-subcategory-error" className="error">
                      {fieldErrors.subcategory}
                    </span>
                  )}
                </label>
              )}
              {operationForm.operationType === 'VALUATION' ? (
                <label>
                  Aktualna wartość w PLN
                  <input
                    id="portfolio-change-current-value"
                    ref={(element) => {
                      fieldRefs.current.currentValuePln = element;
                    }}
                    aria-invalid={fieldErrors.currentValuePln ? 'true' : undefined}
                    aria-describedby={fieldErrors.currentValuePln ? 'portfolio-change-current-value-error' : undefined}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={operationForm.currentValuePln}
                    onChange={(event) => setOperationForm({ ...operationForm, currentValuePln: event.target.value })}
                  />
                  {fieldErrors.currentValuePln && (
                    <span id="portfolio-change-current-value-error" className="error">
                      {fieldErrors.currentValuePln}
                    </span>
                  )}
                </label>
              ) : (
                <label>
                  Kwota w PLN
                  <input
                    id="portfolio-change-amount"
                    ref={(element) => {
                      fieldRefs.current.amountPln = element;
                    }}
                    aria-invalid={fieldErrors.amountPln ? 'true' : undefined}
                    aria-describedby={fieldErrors.amountPln ? 'portfolio-change-amount-error' : undefined}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={operationForm.amountPln}
                    onChange={(event) => setOperationForm({ ...operationForm, amountPln: event.target.value })}
                  />
                  {fieldErrors.amountPln && (
                    <span id="portfolio-change-amount-error" className="error">
                      {fieldErrors.amountPln}
                    </span>
                  )}
                </label>
              )}
              <label>
                Data
                <input
                  id="portfolio-change-date"
                  ref={(element) => {
                    fieldRefs.current.date = element;
                  }}
                  aria-invalid={fieldErrors.date ? 'true' : undefined}
                  aria-describedby={fieldErrors.date ? 'portfolio-change-date-error' : undefined}
                  type="date"
                  required
                  value={operationForm.date}
                  onChange={(event) => setOperationForm({ ...operationForm, date: event.target.value })}
                />
                {fieldErrors.date && (
                  <span id="portfolio-change-date-error" className="error">
                    {fieldErrors.date}
                  </span>
                )}
              </label>
              <button className="button primaryButton" type="submit" disabled={!operationForm.type}>
                Zapisz zmianę
              </button>
            </form>
          </section>
          <section className="panel entriesPanel operationList">
            <div className="entriesHeader">
              <h2>Historia wpłat i wypłat</h2>
            </div>
            {operations.length === 0 ? (
              <p>Brak przepływów dla wybranego aktywa.</p>
            ) : (
              operations.map((operation) => (
                <div className="entryRow" key={operation.id}>
                  <div>
                    <strong>{OPERATION_LABELS[operation.operationType]}</strong>
                    <span>
                      {TYPE_LABELS[operation.type]}
                      {operation.subcategory ? ` · ${SUBCATEGORY_LABELS[operation.subcategory]}` : ''} ·{' '}
                      {operation.date}
                    </span>
                    <small>{operation.note}</small>
                  </div>
                  <strong>{formatMoney(operation.amountPln)}</strong>
                  <button type="button" onClick={() => deleteOperation(operation.id)}>
                    Usuń
                  </button>
                </div>
              ))
            )}
          </section>

          <GlobalAllocationPanel entries={graphEntries} preferences={preferences} onPreferenceError={reportError} />

          {types.includes('GIELDA') && (
            <StockAllocationPanel
              entries={graphEntries}
              onAddStockValue={prepareStockEntry}
              preferences={preferences}
              onPreferenceError={reportError}
            />
          )}
        </>
      )}

      <SummaryChart entries={graphEntries} types={types} />

      {!isHouseholdView && (
        <section className="panel entriesPanel">
          <div className="entriesHeader">
            <h2>Historia wycen: {displayName(selectedOwner)}</h2>
          </div>
          {graphEntries.length === 0 ? (
            <p>Brak wpisów dla wybranej osoby.</p>
          ) : (
            <div className="entryList">
              {graphEntries.map((entry) => (
                <div className="entryRow" key={entry.id}>
                  <div>
                    <strong>{TYPE_LABELS[entry.type] || entry.type}</strong>
                    <span>
                      {entry.subcategory ? SUBCATEGORY_LABELS[entry.subcategory] : 'Bez podkategorii'} · {entry.date}
                    </span>
                    {entry.updatedAt && <small>Ostatnia modyfikacja: {formatDateTime(entry.updatedAt)}</small>}
                  </div>
                  <strong>{formatMoney(entry.valuePln)}</strong>
                  <div className="entryActions">
                    <button type="button" onClick={() => deleteEntry(entry.id)}>
                      Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="panel databasePanel">
        <div>
          <p className="eyebrow">Kopia bezpieczeństwa</p>
          <h2>Eksport i import danych</h2>
          <p>
            Pobierz aktualny plik bazy danych lub wgraj wcześniej wyeksportowany plik. Import nadpisuje całą obecną
            bazę.
          </p>
        </div>
        <div className="databaseActions">
          <button className="button secondaryButton" type="button" onClick={exportDatabase}>
            Eksportuj bazę
          </button>
          <button className="button dangerButton" type="button" onClick={chooseImportFile}>
            Importuj i nadpisz
          </button>
          <input
            ref={importInputRef}
            className="visuallyHidden"
            type="file"
            accept="application/json,.json"
            onChange={importDatabase}
          />
        </div>
      </section>
    </main>
  );
}

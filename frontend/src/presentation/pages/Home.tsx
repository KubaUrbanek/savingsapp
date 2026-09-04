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
import { Button } from '../components/Button.jsx';
import { Field } from '../components/Field.jsx';
import { InlineMessage } from '../components/InlineMessage.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
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
  const savingRef = React.useRef(false);
  const importingRef = React.useRef(false);
  const exportingRef = React.useRef(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const pendingDeletionsRef = React.useRef(new Set());
  const [pendingDeletions, setPendingDeletions] = React.useState([]);
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
  const reportError = React.useCallback(
    (nextError, action = 'odświeżyć dane', nextStep = 'Odśwież stronę i spróbuj ponownie.') => {
      setStatus('');
      pendingErrorFocusRef.current = true;
      setError(`Nie udało się ${action}. ${nextError.message} ${nextStep}`);
    },
    []
  );

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
        reportError(preferenceError, 'zapisać wyboru użytkownika', 'Wybierz użytkownika ponownie.');
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
    if (failed) reportError(failed.error, 'wczytać portfela');
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
  const activePortfolioLabel = subcategoryFilter
    ? SUBCATEGORY_LABELS[subcategoryFilter] || subcategoryFilter
    : typeFilter
      ? TYPE_LABELS[typeFilter] || typeFilter
      : 'Wszystkie inwestycje';
  const latestDataDate = currentEntriesForView.reduce(
    (latestDate, entry) => (entry.date > latestDate ? entry.date : latestDate),
    ''
  );

  function changeType(nextType) {
    setTypeFilter(nextType);
    setSubcategoryFilter('');
    setOperationForm((current) => ({ ...current, type: nextType, subcategory: subcategoriesFor(nextType)[0] || '' }));
  }

  function exportDatabase() {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setIsExporting(true);
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
        reportError(fetchError, 'wyeksportować bazy danych', 'Sprawdź połączenie i spróbuj ponownie.');
      })
      .finally(() => {
        exportingRef.current = false;
        setIsExporting(false);
      });
  }

  function chooseImportFile() {
    if (importingRef.current) return;
    importInputRef.current?.click();
  }

  function importDatabase(event) {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm('Import nadpisze aktualną bazę danych. Czy na pewno chcesz kontynuować?');
    if (!confirmed) return;

    if (importingRef.current) return;
    importingRef.current = true;
    setIsImporting(true);
    setError('');
    setStatus('Importowanie bazy danych...');

    controller.commands
      .importDatabaseBackup(file)
      .then(() => {
        setStatus('Zaimportowano bazę danych i odświeżono widok.');
      })
      .catch((fetchError) => {
        reportError(fetchError, 'zaimportować bazy danych', 'Sprawdź plik kopii i spróbuj ponownie.');
      })
      .finally(() => {
        importingRef.current = false;
        setIsImporting(false);
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

  function confirmDeletion({ recordType, type, subcategory, date, amountLabel, amount }) {
    const asset = [TYPE_LABELS[type] || type, subcategory && (SUBCATEGORY_LABELS[subcategory] || subcategory)]
      .filter(Boolean)
      .join(' · ');

    return window.confirm(
      `Czy na pewno chcesz usunąć ten rekord?\n\nTyp rekordu: ${recordType}\nAktywo: ${asset}\nData: ${date}\n${amountLabel}: ${formatMoney(amount)}`
    );
  }

  function deleteRecord({ key, record, confirmation, command, onSuccess, trigger }) {
    if (pendingDeletionsRef.current.has(key)) return;

    const confirmed = confirmDeletion(confirmation);

    // Native confirmation restores focus itself; this also makes that behavior deterministic in browsers and tests.
    trigger?.focus();
    if (!confirmed) return;

    pendingDeletionsRef.current.add(key);
    setPendingDeletions(Array.from(pendingDeletionsRef.current));

    command(record.id)
      .then(onSuccess)
      .catch((deleteError) => reportError(deleteError, 'usunąć rekordu', 'Spróbuj usunąć go ponownie.'))
      .finally(() => {
        pendingDeletionsRef.current.delete(key);
        setPendingDeletions(Array.from(pendingDeletionsRef.current));
      });
  }

  function deleteEntry(entry, trigger) {
    deleteRecord({
      key: `entry:${entry.id}`,
      record: entry,
      confirmation: {
        recordType: 'wpis wyceny',
        type: entry.type,
        subcategory: entry.subcategory,
        date: entry.date,
        amountLabel: 'Wartość',
        amount: entry.valuePln
      },
      command: controller.commands.deleteInvestmentEntry,
      onSuccess: () => setStatus('Usunięto wpis.'),
      trigger
    });
  }

  function submitOperation(event) {
    event.preventDefault();
    if (savingRef.current) return;
    const command = mapPortfolioChangeForm(operationForm, selectedOwner, currentEntries);
    savingRef.current = true;
    setIsSaving(true);
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
        } else reportError(fetchError, 'zapisać zmiany', 'Sprawdź dane i spróbuj ponownie.');
      })
      .finally(() => {
        savingRef.current = false;
        setIsSaving(false);
      });
  }

  function deleteOperation(operation, trigger) {
    deleteRecord({
      key: `operation:${operation.id}`,
      record: operation,
      confirmation: {
        recordType: 'operacja',
        type: operation.type,
        subcategory: operation.subcategory,
        date: operation.date,
        amountLabel: 'Kwota',
        amount: operation.amountPln
      },
      command: controller.commands.deleteInvestmentOperation,
      onSuccess: undefined,
      trigger
    });
  }

  return (
    <main className="page" id="main-content">
      <header className="workspaceHeader">
        <section className="hero">
          <p className="eyebrow">Pulpit portfela</p>
          <h1 tabIndex={-1}>
            {isHouseholdView ? 'Portfel całego gospodarstwa' : `Portfel: ${displayName(selectedOwner)}`}
          </h1>
          <p>{isHouseholdView ? 'Wspólny obraz oszczędności' : activePortfolioLabel}</p>
        </section>

        <section className="controlSurface" aria-label="Ustawienia widoku portfela">
          <div className="filterGroup">
            <p className="filterLabel" id="owner-filter-label">
              Czyj portfel wyświetlić?
            </p>
            <div className="userSwitcher" role="group" aria-labelledby="owner-filter-label">
              {users.map((user) => (
                <button
                  className={!isHouseholdView && user === selectedOwner ? 'userPill active' : 'userPill'}
                  key={user}
                  type="button"
                  aria-pressed={!isHouseholdView && user === selectedOwner}
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
                aria-pressed={isHouseholdView}
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
              <p className="filterLabel" id="investment-type-filter-label">
                Rodzaj inwestycji
              </p>
              <div className="typeNav" role="group" aria-labelledby="investment-type-filter-label">
                {types.map((type) => (
                  <button
                    className={type === typeFilter ? 'typeTab active' : 'typeTab'}
                    key={type}
                    type="button"
                    aria-pressed={type === typeFilter}
                    onClick={() => changeType(type)}
                  >
                    {TYPE_LABELS[type] || type}
                  </button>
                ))}
              </div>
              {filterSubcategories.length > 0 && (
                <div className="subtypeNav" role="group" aria-labelledby="investment-subcategory-filter-label">
                  <span className="visuallyHidden" id="investment-subcategory-filter-label">
                    Podkategorie inwestycji
                  </span>
                  <button
                    className={!subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'}
                    type="button"
                    aria-pressed={!subcategoryFilter}
                    onClick={() => setSubcategoryFilter('')}
                  >
                    Wszystkie
                  </button>
                  {filterSubcategories.map((subcategory) => (
                    <button
                      className={subcategory === subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'}
                      key={subcategory}
                      type="button"
                      aria-pressed={subcategory === subcategoryFilter}
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

        {!isHouseholdView && (
          <nav className="sectionNavigation" aria-label="Nawigacja po sekcjach portfela">
            <a href="#portfolio-summary">Podsumowanie</a>
            <a href="#portfolio-update">Aktualizacja</a>
            <a href="#portfolio-analysis">Analiza</a>
            <a href="#portfolio-allocation">Alokacja</a>
            <a href="#portfolio-history">Historia</a>
          </nav>
        )}

        {!isHouseholdView && (
          <article
            className="summaryPanel sectionAnchor"
            id="portfolio-summary"
            aria-labelledby="portfolio-summary-heading"
          >
            <div className="summaryHeading">
              <div>
                <p className="eyebrow">Wartość aktywnego zakresu</p>
                <h2 id="portfolio-summary-heading">{activePortfolioLabel}</h2>
              </div>
              <p className="dataFreshness">
                <span>Stan danych</span>
                <strong>{latestDataDate || 'Brak wycen'}</strong>
              </p>
            </div>
            <p className="totalValue">{formatMoney(totalValue)}</p>
            {performance && (
              <p className="headlineChange">
                <span>Zmiana w tym miesiącu</span>
                <strong className={Number(performance.monthlyResultPln) >= 0 ? 'positiveText' : 'negativeText'}>
                  {formatSignedMoney(performance.monthlyResultPln)}
                </strong>
                <small>
                  {formatPercent(
                    performance.monthlyReturnRatePercent == null ? NaN : Number(performance.monthlyReturnRatePercent)
                  )}
                </small>
              </p>
            )}
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
                  <span>Łączny wynik inwestycji</span>
                  <strong>{formatSignedMoney(performance.nominalResultPln)}</strong>
                </div>
              </div>
            )}
          </article>
        )}
      </header>

      <div className="formFeedback" aria-label="Informacje o operacjach">
        <InlineMessage variant="success">{status}</InlineMessage>
        <InlineMessage ref={errorSummaryRef} variant="error">
          {error}
        </InlineMessage>
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
          <section className="quickUpdate sectionAnchor" id="portfolio-update" aria-labelledby="quick-update-heading">
            <form className="panel formPanel unifiedForm" onSubmit={submitOperation} aria-busy={isSaving}>
              <SectionHeader
                eyebrow="Jedno miejsce do aktualizacji"
                titleId="quick-update-heading"
                title="Co zmieniło się w portfelu?"
                description="Wpłata i wypłata automatycznie zmienią stan. „Aktualna wycena” zapisuje zmianę rynku bez przepływu pieniędzy."
              />
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
                  disabled={isSaving}
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
                  disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
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
                    disabled={isSaving}
                    onChange={(event) => setOperationForm({ ...operationForm, amountPln: event.target.value })}
                  />
                  {fieldErrors.amountPln && (
                    <span id="portfolio-change-amount-error" className="error">
                      {fieldErrors.amountPln}
                    </span>
                  )}
                </label>
              )}
              <Field
                label="Data"
                error={fieldErrors.date}
                errorId="portfolio-change-date-error"
                control={
                  <input
                    id="portfolio-change-date"
                    ref={(element) => {
                      fieldRefs.current.date = element;
                    }}
                    type="date"
                    required
                    value={operationForm.date}
                    disabled={isSaving}
                    onChange={(event) => setOperationForm({ ...operationForm, date: event.target.value })}
                  />
                }
              />
              <Button
                variant="primary"
                type="submit"
                disabled={!operationForm.type}
                busy={isSaving}
                busyLabel="Zapisywanie…"
              >
                Zapisz zmianę
              </Button>
            </form>
          </section>

          <GlobalAllocationPanel
            id="portfolio-allocation"
            entries={graphEntries}
            preferences={preferences}
            onPreferenceError={reportError}
          />

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

      <SummaryChart id="portfolio-analysis" entries={graphEntries} types={types} />

      {!isHouseholdView && (
        <>
          <section className="panel entriesPanel operationList sectionAnchor" id="portfolio-history">
            <div className="entriesHeader">
              <h2>Historia wpłat i wypłat</h2>
            </div>
            {operations.length === 0 ? (
              <p>Brak przepływów dla wybranego aktywa.</p>
            ) : (
              operations.map((operation) => (
                <div
                  className="entryRow"
                  key={operation.id}
                  aria-busy={pendingDeletions.includes(`operation:${operation.id}`)}
                >
                  <div>
                    <strong>
                      <span className="entryFieldLabel">Typ zdarzenia: </span>
                      {OPERATION_LABELS[operation.operationType]}
                    </strong>
                    <span>
                      {TYPE_LABELS[operation.type]}
                      {operation.subcategory ? ` · ${SUBCATEGORY_LABELS[operation.subcategory]}` : ''} ·{' '}
                      <span className="entryFieldLabel">Data: </span>
                      {operation.date}
                    </span>
                    <small>{operation.note}</small>
                  </div>
                  <strong>
                    <span className="entryFieldLabel">Wartość: </span>
                    {formatMoney(operation.amountPln)}
                  </strong>
                  <div className="entryActions">
                    <span className="entryFieldLabel">Akcja:</span>
                    <Button
                      variant="danger"
                      type="button"
                      disabled={pendingDeletions.includes(`operation:${operation.id}`)}
                      onClick={(event) => deleteOperation(operation, event.currentTarget)}
                    >
                      {pendingDeletions.includes(`operation:${operation.id}`) ? 'Usuwanie…' : 'Usuń'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>
          <section className="panel entriesPanel">
            <div className="entriesHeader">
              <h2>Historia wycen: {displayName(selectedOwner)}</h2>
            </div>
            {graphEntries.length === 0 ? (
              <p>Brak wpisów dla wybranej osoby.</p>
            ) : (
              <div className="entryList">
                {graphEntries.map((entry) => (
                  <div className="entryRow" key={entry.id} aria-busy={pendingDeletions.includes(`entry:${entry.id}`)}>
                    <div>
                      <strong>
                        <span className="entryFieldLabel">Typ zdarzenia: </span>
                        {TYPE_LABELS[entry.type] || entry.type}
                      </strong>
                      <span>
                        {entry.subcategory ? SUBCATEGORY_LABELS[entry.subcategory] : 'Bez podkategorii'} ·{' '}
                        <span className="entryFieldLabel">Data: </span>
                        {entry.date}
                      </span>
                      {entry.updatedAt && <small>Ostatnia modyfikacja: {formatDateTime(entry.updatedAt)}</small>}
                    </div>
                    <strong>
                      <span className="entryFieldLabel">Wartość: </span>
                      {formatMoney(entry.valuePln)}
                    </strong>
                    <div className="entryActions">
                      <span className="entryFieldLabel">Akcja:</span>
                      <Button
                        variant="danger"
                        type="button"
                        disabled={pendingDeletions.includes(`entry:${entry.id}`)}
                        onClick={(event) => deleteEntry(entry, event.currentTarget)}
                      >
                        {pendingDeletions.includes(`entry:${entry.id}`) ? 'Usuwanie…' : 'Usuń'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="panel databasePanel">
        <SectionHeader
          eyebrow="Kopia bezpieczeństwa"
          title="Eksport i import danych"
          description="Pobierz aktualny plik bazy danych lub wgraj wcześniej wyeksportowany plik. Import nadpisuje całą obecną bazę."
        />
        <div className="databaseActions">
          <Button
            variant="secondary"
            type="button"
            onClick={exportDatabase}
            busy={isExporting}
            busyLabel="Eksportowanie…"
          >
            Eksportuj bazę
          </Button>
          <Button
            variant="danger"
            type="button"
            onClick={chooseImportFile}
            busy={isImporting}
            busyLabel="Importowanie…"
          >
            Importuj i nadpisz
          </Button>
          <input
            ref={importInputRef}
            className="visuallyHidden"
            type="file"
            accept="application/json,.json"
            disabled={isImporting}
            onChange={importDatabase}
          />
        </div>
      </section>
    </main>
  );
}

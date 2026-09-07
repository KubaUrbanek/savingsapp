// @ts-nocheck
import React from 'react';
import { FALLBACK_USERS, subcategoriesFor } from '../../domain/portfolio/constants.js';
import { HouseholdPortfolio, OwnerPortfolio, PortfolioScopeKind } from '../../application/PortfolioScope.js';
import { buildCurrentSnapshot } from '../../domain/portfolio/snapshot.js';
import { usePortfolioController } from '../portfolio/hooks/usePortfolioController.js';
import { dataFrom } from '../portfolio/hooks/queryState.js';
import { QueryBoundary } from '../components/QueryBoundary.js';
import { GlobalAllocationPanel } from '../components/GlobalAllocationPanel.jsx';
import { StockAllocationPanel } from '../components/StockAllocationPanel.jsx';
import { SummaryChart } from '../components/SummaryChart.jsx';
import { HouseholdDashboard } from '../components/HouseholdDashboard.jsx';
import { Button } from '../components/Button.jsx';
import { Field } from '../components/Field.jsx';
import { InlineMessage } from '../components/InlineMessage.jsx';
import { Metric } from '../components/Metric.jsx';
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
import { PortfolioQuery } from '../portfolio/hooks/refreshPolicy.js';

export function Home({ dependencies }) {
  const { useCases, preferences } = dependencies;
  const [portfolioScope, setPortfolioScope] = React.useState(() => OwnerPortfolio(preferences.selectedOwner()));
  const [typeFilter, setTypeFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('summary');
  const tabRefs = React.useRef({});
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});
  const fieldRefs = React.useRef({});
  const errorSummaryRef = React.useRef(null);
  const pendingErrorFocusRef = React.useRef(false);
  const [operationForm, setOperationForm] = React.useState({
    action: 'ADD',
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
  const entries = dataFrom(controller.entries, []);
  const operations = dataFrom(controller.operations, []);
  const reportError = React.useCallback(
    (_nextError, action = 'odświeżyć dane', nextStep = 'Odśwież stronę i spróbuj ponownie.') => {
      setStatus('');
      pendingErrorFocusRef.current = true;
      setError(`Nie udało się ${action}. ${nextStep}`);
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
  const projectionPhase =
    controller.projection.status === 'refreshing' ? 'refreshing' : controller.projection.data?.phase;
  const projectionAffects = (query) =>
    projectionPhase === 'refreshing' && controller.projection.data?.affectedQueries.includes(query);
  const availableTabs = isHouseholdView
    ? [
        { id: 'summary', label: 'Podsumowanie' },
        { id: 'analysis', label: 'Analiza' }
      ]
    : [
        { id: 'summary', label: 'Podsumowanie' },
        { id: 'update', label: 'Aktualizacja' },
        { id: 'allocation', label: 'Alokacja' },
        { id: 'history', label: 'Historia' }
      ];

  React.useEffect(() => {
    if (isHouseholdView && activeTab !== 'summary' && activeTab !== 'analysis') setActiveTab('summary');
  }, [isHouseholdView, activeTab]);

  function selectTab(tabId, moveFocus = false) {
    setActiveTab(tabId);
    if (moveFocus) requestAnimationFrame(() => tabRefs.current[tabId]?.focus());
  }

  function handleTabKeyDown(event) {
    const currentIndex = availableTabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % availableTabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + availableTabs.length) % availableTabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = availableTabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(availableTabs[nextIndex].id, true);
  }
  const visibleStatus =
    controller.mutation.status === 'loading'
      ? status
      : projectionPhase === 'refreshing'
        ? 'Zmiana zapisana. Aktualizujemy podsumowanie…'
        : projectionPhase === 'confirmed'
          ? 'Zmiana zapisana. Podsumowanie jest aktualne.'
          : projectionPhase === 'pending'
            ? 'Zmiana została przyjęta, ale aktualność podsumowania nie została potwierdzona.'
            : status;

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
      action: 'VALUATION',
      operationType: 'VALUATION',
      type: 'GIELDA',
      subcategory,
      currentValuePln: '',
      date: today()
    }));
    setTypeFilter('GIELDA');
    setSubcategoryFilter(subcategory);
    setStatus(`Wpisz aktualną wartość ETF: ${SUBCATEGORY_LABELS[subcategory]}.`);
    selectTab('update');
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

        <section
          className="controlSurface"
          aria-label="Ustawienia widoku portfela"
          aria-busy={projectionAffects(PortfolioQuery.REFERENCE_DATA)}
        >
          <div className="filterGroup">
            <p className="filterLabel" id="owner-filter-label">
              Czyj portfel wyświetlić?
            </p>
            <div className="userSwitcher" role="group" aria-labelledby="owner-filter-label">
              {users.map((user) => (
                <Button
                  variant="quiet"
                  className={!isHouseholdView && user === selectedOwner ? 'userPill active' : 'userPill'}
                  key={user}
                  type="button"
                  aria-pressed={!isHouseholdView && user === selectedOwner}
                  onClick={() => setPortfolioScope(OwnerPortfolio(user))}
                >
                  <span className="userAvatar" aria-hidden="true" role="presentation">
                    {displayName(user).charAt(0)}
                  </span>
                  {displayName(user)}
                </Button>
              ))}
              <Button
                variant="quiet"
                className={isHouseholdView ? 'userPill active' : 'userPill'}
                type="button"
                aria-pressed={isHouseholdView}
                onClick={() => setPortfolioScope(HouseholdPortfolio(users))}
              >
                <span className="userAvatar" aria-hidden="true" role="presentation">
                  ⌂
                </span>
                Razem
              </Button>
            </div>
          </div>
          {!isHouseholdView && (
            <div className="filterGroup">
              <p className="filterLabel" id="investment-type-filter-label">
                Rodzaj inwestycji
              </p>
              <div className="typeNav" role="group" aria-labelledby="investment-type-filter-label">
                {types.map((type) => (
                  <Button
                    variant="quiet"
                    className={type === typeFilter ? 'typeTab active' : 'typeTab'}
                    key={type}
                    type="button"
                    aria-pressed={type === typeFilter}
                    onClick={() => changeType(type)}
                  >
                    {TYPE_LABELS[type] || type}
                  </Button>
                ))}
              </div>
              {filterSubcategories.length > 0 && (
                <div className="subtypeNav" role="group" aria-labelledby="investment-subcategory-filter-label">
                  <span className="visuallyHidden" id="investment-subcategory-filter-label">
                    Podkategorie inwestycji
                  </span>
                  <Button
                    variant="quiet"
                    className={!subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'}
                    type="button"
                    aria-pressed={!subcategoryFilter}
                    onClick={() => setSubcategoryFilter('')}
                  >
                    Wszystkie
                  </Button>
                  {filterSubcategories.map((subcategory) => (
                    <Button
                      variant="quiet"
                      className={subcategory === subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'}
                      key={subcategory}
                      type="button"
                      aria-pressed={subcategory === subcategoryFilter}
                      onClick={() => setSubcategoryFilter(subcategory)}
                    >
                      {SUBCATEGORY_LABELS[subcategory] || subcategory}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="sectionNavigation" role="tablist" aria-label="Sekcje portfela">
          {availableTabs.map((tab) => (
            <Button
              variant="quiet"
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              id={`portfolio-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              aria-controls={`portfolio-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {!isHouseholdView && (
          <article
            className="summaryPanel sectionAnchor"
            id="portfolio-panel-summary"
            role="tabpanel"
            aria-labelledby="portfolio-tab-summary"
            hidden={activeTab !== 'summary'}
            aria-busy={projectionAffects(PortfolioQuery.SNAPSHOT) || projectionAffects(PortfolioQuery.PERFORMANCE)}
          >
            <QueryBoundary
              state={controller.snapshot}
              skeletonShape="summary"
              loadingLabel="Wczytywanie podsumowania portfela…"
              emptyTitle="Portfel nie ma jeszcze wyceny"
              emptyDescription="Dodaj pierwszą aktualną wycenę, aby zobaczyć wartość i strukturę portfela."
              emptyAction={
                <Button
                  variant="primary"
                  className="queryStateAction"
                  type="button"
                  onClick={() => selectTab('update')}
                >
                  Dodaj wycenę
                </Button>
              }
              onRetry={controller.retry.snapshot}
            >
              {() => (
                <>
                  <div className="summaryHeading">
                    <div>
                      <p className="eyebrow">Aktualny stan</p>
                      <h2 id="portfolio-summary-heading">{activePortfolioLabel}</h2>
                    </div>
                    <p className="dataFreshness">
                      <span>Data danych</span>
                      <strong>{latestDataDate || 'Brak wycen'}</strong>
                    </p>
                  </div>
                  <Metric className="summaryTotal" label="Wartość portfela" value={formatMoney(totalValue)} />
                  <div className="summaryGrid">
                    {types.map((type) => (
                      <Metric
                        className="summaryCard"
                        key={type}
                        label={TYPE_LABELS[type] || type}
                        value={formatMoney(totalsByType[type] || 0)}
                      />
                    ))}
                  </div>
                  <QueryBoundary
                    state={controller.performance}
                    skeletonShape="summary"
                    loadingLabel="Wczytywanie wyniku portfela…"
                    onRetry={controller.retry.performance}
                    isEmpty={(result) => result == null}
                    emptyTitle="Brak danych o wyniku"
                    emptyDescription="Wynik pojawi się po zapisaniu operacji i wyceny."
                  >
                    {(loadedPerformance) => (
                      <>
                        <Metric
                          className="headlineChange"
                          label="Zmiana w tym miesiącu"
                          value={formatSignedMoney(loadedPerformance.monthlyResultPln)}
                          tone={Number(loadedPerformance.monthlyResultPln) >= 0 ? 'positive' : 'negative'}
                          detail={formatPercent(
                            loadedPerformance.monthlyReturnRatePercent == null
                              ? NaN
                              : Number(loadedPerformance.monthlyReturnRatePercent)
                          )}
                        />
                        <div className="performanceGrid compactPerformance">
                          <Metric
                            label="Łączny wynik inwestycji"
                            value={formatSignedMoney(loadedPerformance.nominalResultPln)}
                            tone={Number(loadedPerformance.nominalResultPln) >= 0 ? 'positive' : 'negative'}
                          />
                        </div>
                      </>
                    )}
                  </QueryBoundary>
                </>
              )}
            </QueryBoundary>
            <QueryBoundary
              state={controller.snapshot}
              skeletonShape="chart"
              onRetry={controller.retry.snapshot}
              emptyTitle="Brak danych do analizy"
              emptyDescription="Wykres pojawi się po zapisaniu pierwszej wyceny."
            >
              {(loadedEntries) => <SummaryChart entries={loadedEntries} types={types} />}
            </QueryBoundary>
          </article>
        )}
      </header>

      <div className="formFeedback" role="region" aria-label="Informacje o operacjach">
        <InlineMessage variant={projectionPhase === 'pending' ? 'warning' : 'success'}>
          {visibleStatus}
          {projectionPhase === 'pending' && (
            <Button variant="secondary" type="button" onClick={controller.retryProjection}>
              Odśwież dotknięte sekcje
            </Button>
          )}
        </InlineMessage>
        <InlineMessage ref={errorSummaryRef} variant="error">
          {error}
        </InlineMessage>
      </div>

      {isHouseholdView ? (
        <div
          id="portfolio-panel-summary"
          role="tabpanel"
          aria-labelledby="portfolio-tab-summary"
          hidden={activeTab !== 'summary'}
          aria-busy={projectionAffects(PortfolioQuery.SNAPSHOT)}
        >
          <QueryBoundary
            state={controller.snapshot}
            skeletonShape="section"
            onRetry={controller.retry.snapshot}
            emptyTitle="Brak wycen gospodarstwa"
            emptyDescription="Dodaj wycenę w portfelu właściciela, aby zobaczyć wspólne podsumowanie."
          >
            {(loadedEntries) => (
              <HouseholdDashboard
                entries={loadedEntries}
                users={users}
                types={types}
                preferences={preferences}
                onPreferenceError={reportError}
              />
            )}
          </QueryBoundary>
        </div>
      ) : (
        <>
          <section
            className="quickUpdate sectionAnchor"
            id="portfolio-panel-update"
            role="tabpanel"
            aria-labelledby="portfolio-tab-update"
            hidden={activeTab !== 'update'}
          >
            <form className="ledgerSection formPanel unifiedForm" onSubmit={submitOperation} aria-busy={isSaving}>
              <SectionHeader
                eyebrow="Jedno miejsce do aktualizacji"
                titleId="quick-update-heading"
                title="Zaktualizuj portfel"
                description="Dodaj lub odejmij środki albo wpisz aktualną wartość wybranego składnika portfela."
              />
              <Field
                label="Co chcesz zrobić?"
                control={
                  <select
                    id="portfolio-change-operation-type"
                    value={operationForm.action}
                    disabled={isSaving}
                    onChange={(event) => {
                      const action = event.target.value;
                      setOperationForm({
                        ...operationForm,
                        action,
                        operationType: action === 'ADD' ? 'DEPOSIT' : action === 'SUBTRACT' ? 'WITHDRAWAL' : 'VALUATION'
                      });
                    }}
                  >
                    <option value="ADD">Dodaj środki</option>
                    <option value="SUBTRACT">Odejmij środki</option>
                    <option value="VALUATION">Ustaw aktualną wartość</option>
                  </select>
                }
              />
              {operationForm.action !== 'VALUATION' && (
                <Field
                  label="Skąd wynika zmiana?"
                  error={fieldErrors.operationType}
                  errorId="portfolio-change-operation-type-error"
                  control={
                    <select
                      id="portfolio-change-operation-reason"
                      ref={(element) => {
                        fieldRefs.current.operationType = element;
                      }}
                      value={operationForm.operationType}
                      disabled={isSaving}
                      onChange={(event) => setOperationForm({ ...operationForm, operationType: event.target.value })}
                    >
                      {operationForm.action === 'ADD' ? (
                        <>
                          <option value="DEPOSIT">Wpłata nowych środków</option>
                          <option value="BUY">Zakup aktywa</option>
                        </>
                      ) : (
                        <>
                          <option value="WITHDRAWAL">Wypłata środków</option>
                          <option value="SELL">Sprzedaż aktywa</option>
                        </>
                      )}
                    </select>
                  }
                />
              )}
              <Field
                label="Składnik portfela"
                error={fieldErrors.type}
                errorId="portfolio-change-type-error"
                control={
                  <select
                    id="portfolio-change-type"
                    ref={(element) => {
                      fieldRefs.current.type = element;
                    }}
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
                }
              />
              {operationSubcategories.length > 0 && (
                <Field
                  label="Rodzaj inwestycji"
                  error={fieldErrors.subcategory}
                  errorId="portfolio-change-subcategory-error"
                  control={
                    <select
                      id="portfolio-change-subcategory"
                      ref={(element) => {
                        fieldRefs.current.subcategory = element;
                      }}
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
                  }
                />
              )}
              {operationForm.action === 'VALUATION' ? (
                <Field
                  label="Nowa wartość składnika"
                  error={fieldErrors.currentValuePln}
                  errorId="portfolio-change-current-value-error"
                  control={
                    <input
                      id="portfolio-change-current-value"
                      ref={(element) => {
                        fieldRefs.current.currentValuePln = element;
                      }}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={operationForm.currentValuePln}
                      disabled={isSaving}
                      onChange={(event) => setOperationForm({ ...operationForm, currentValuePln: event.target.value })}
                    />
                  }
                />
              ) : (
                <Field
                  label={operationForm.action === 'ADD' ? 'Kwota dodana' : 'Kwota odjęta'}
                  error={fieldErrors.amountPln}
                  errorId="portfolio-change-amount-error"
                  control={
                    <input
                      id="portfolio-change-amount"
                      ref={(element) => {
                        fieldRefs.current.amountPln = element;
                      }}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={operationForm.amountPln}
                      disabled={isSaving}
                      onChange={(event) => setOperationForm({ ...operationForm, amountPln: event.target.value })}
                    />
                  }
                />
              )}
              <Field
                label="Data zmiany"
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
                Zaktualizuj portfel
              </Button>
            </form>
          </section>

          <div
            id="portfolio-panel-allocation"
            className="sectionAnchor"
            role="tabpanel"
            aria-labelledby="portfolio-tab-allocation"
            hidden={activeTab !== 'allocation'}
            aria-busy={projectionAffects(PortfolioQuery.SNAPSHOT)}
          >
            <QueryBoundary
              state={controller.snapshot}
              skeletonShape="section"
              onRetry={controller.retry.snapshot}
              emptyTitle="Brak danych do alokacji"
              emptyDescription="Dodaj wycenę, aby zobaczyć podział portfela."
              emptyAction={
                <Button
                  variant="primary"
                  className="queryStateAction"
                  type="button"
                  onClick={() => selectTab('update')}
                >
                  Dodaj wycenę
                </Button>
              }
            >
              {(loadedEntries) => (
                <GlobalAllocationPanel
                  entries={loadedEntries}
                  preferences={preferences}
                  onPreferenceError={reportError}
                />
              )}
            </QueryBoundary>
            {types.includes('GIELDA') && (
              <div aria-busy={projectionAffects(PortfolioQuery.SNAPSHOT)}>
                <QueryBoundary
                  state={controller.snapshot}
                  skeletonShape="section"
                  onRetry={controller.retry.snapshot}
                  emptyTitle="Brak danych o akcjach"
                  emptyDescription="Dodaj wycenę ETF, aby zobaczyć szczegóły."
                >
                  {(loadedEntries) => (
                    <StockAllocationPanel
                      entries={loadedEntries}
                      onAddStockValue={prepareStockEntry}
                      preferences={preferences}
                      onPreferenceError={reportError}
                    />
                  )}
                </QueryBoundary>
              </div>
            )}
          </div>
        </>
      )}

      <div
        id="portfolio-panel-analysis"
        className="sectionAnchor"
        role="tabpanel"
        aria-labelledby="portfolio-tab-analysis"
        hidden={!isHouseholdView || activeTab !== 'analysis'}
        aria-busy={projectionAffects(PortfolioQuery.SNAPSHOT)}
      >
        <QueryBoundary
          state={controller.snapshot}
          skeletonShape="chart"
          onRetry={controller.retry.snapshot}
          emptyTitle="Brak danych do analizy"
          emptyDescription="Wykres pojawi się po zapisaniu pierwszej wyceny."
        >
          {(loadedEntries) => <SummaryChart entries={loadedEntries} types={types} />}
        </QueryBoundary>
      </div>

      {!isHouseholdView && (
        <div
          id="portfolio-panel-history"
          role="tabpanel"
          aria-labelledby="portfolio-tab-history"
          hidden={activeTab !== 'history'}
        >
          <section
            className="ledgerSection entriesPanel operationList sectionAnchor"
            aria-busy={projectionAffects(PortfolioQuery.OPERATIONS)}
          >
            <div className="entriesHeader">
              <h2>Historia wpłat i wypłat</h2>
            </div>
            <QueryBoundary
              state={controller.operations}
              skeletonShape="list"
              onRetry={controller.retry.operations}
              emptyTitle="Brak przepływów"
              emptyDescription="Wpłaty, wypłaty, kupna i sprzedaże pojawią się tutaj po zapisaniu."
            >
              {(loadedOperations) =>
                loadedOperations.map((operation) => (
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
              }
            </QueryBoundary>
          </section>
          <section className="ledgerSection entriesPanel" aria-busy={projectionAffects(PortfolioQuery.ENTRIES)}>
            <div className="entriesHeader">
              <h2>Historia wycen: {displayName(selectedOwner)}</h2>
            </div>
            <QueryBoundary
              state={controller.entries}
              skeletonShape="list"
              onRetry={controller.retry.entries}
              emptyTitle="Brak wycen dla wybranej osoby"
              emptyDescription="Dodaj pierwszą wycenę, aby rozpocząć historię."
              emptyAction={
                <Button
                  variant="primary"
                  className="queryStateAction"
                  type="button"
                  onClick={() => selectTab('update')}
                >
                  Dodaj wycenę
                </Button>
              }
            >
              {() => (
                <div className="entryList">
                  {entries.map((entry) => (
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
            </QueryBoundary>
          </section>
        </div>
      )}

      <section className="ledgerSection databasePanel">
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
            aria-label="Wybierz plik kopii bazy danych do importu"
            accept="application/json,.json"
            disabled={isImporting}
            onChange={importDatabase}
          />
        </div>
      </section>
    </main>
  );
}

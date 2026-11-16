// @ts-nocheck
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { subcategoriesFor, FALLBACK_USERS } from '../../domain/portfolio/constants.js';
import { OwnerPortfolio, HouseholdPortfolio, PortfolioScopeKind } from '../../application/PortfolioScope.js';
import { PortfolioChangeValidationFailure } from '../../application/portfolio/RecordPortfolioChange.js';
import { buildCurrentSnapshot, snapshotKey } from '../../domain/portfolio/snapshot.js';
import { aggregatePerformance } from '../../domain/portfolio/services/PerformanceAggregationService.js';
import {
  availableGroups,
  filterOverviewEntries,
  type OverviewGrouping
} from '../../domain/portfolio/overviewVisualization.js';
import { usePortfolioController } from '../portfolio/hooks/usePortfolioController.js';
import { dataFrom } from '../portfolio/hooks/queryState.js';
import { mapPortfolioChangeForm } from '../mappers/portfolioChangeFormMapper.js';
import { overviewGroupLabel } from '../viewModels/overviewVisualization.js';
import { buildOverviewDistribution } from '../../domain/portfolio/overviewVisualization.js';
import { portfolioHistory, historyValues } from '../viewModels/portfolioHistory.js';
import {
  displayName,
  TYPE_LABELS,
  SUBCATEGORY_LABELS,
  OPERATION_LABELS,
  formatMoney,
  today
} from '../viewModels/formatters.js';
import { Button } from '../components/Button.js';
import { InlineMessage } from '../components/InlineMessage.js';
import { QueryBoundary } from '../components/QueryBoundary.js';
import { PortfolioOverview } from '../components/PortfolioOverview.js';
import { PurchasePlanPanel } from '../components/PurchasePlanPanel.js';
import { OverviewFilters } from '../components/OverviewFilters.js';
import { OverviewCharts } from '../components/OverviewCharts.js';
import { PortfolioChangeDialog } from '../components/PortfolioChangeDialog.js';

const tabs = [
  { id: 'summary', label: 'Przegląd' },
  { id: 'allocation', label: 'Plan portfela' },
  { id: 'history', label: 'Historia' }
];
const blankForm = (kind = '') => ({
  action: kind,
  operationType: kind,
  type: '',
  subcategory: '',
  amountPln: '',
  currentValuePln: '',
  costKnown: false,
  cashType: 'KONTO_BANKOWE',
  date: today()
});

export function Home({ dependencies }) {
  const { useCases, preferences } = dependencies;
  const [scope, setScope] = React.useState(() => OwnerPortfolio(preferences.selectedOwner()));
  const [activeTab, setActiveTab] = React.useState('summary');
  const location = useLocation();
  const [contexts, setContexts] = React.useState({});
  const scopeId = scope.kind === PortfolioScopeKind.HOUSEHOLD ? 'household' : scope.ownerId;
  const context = contexts[scopeId] ?? {};
  const updateContext = (patch) =>
    setContexts((previous) => ({ ...previous, [scopeId]: { ...previous[scopeId], ...patch } }));
  const historyAsset = context.historyAsset ?? null;
  const setHistoryAsset = (historyAsset) => updateContext({ historyAsset });
  const historySearch = context.historySearch ?? '';
  const historyKind = context.historyKind ?? '';
  const historyStart = context.historyStart ?? '';
  const historyEnd = context.historyEnd ?? '';
  const [planRevision, setPlanRevision] = React.useState(0);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  React.useEffect(() => {
    if (location.state?.overview) {
      setActiveTab('summary');
      setSettingsOpen(false);
    }
  }, [location.key, location.state]);
  const overviewGrouping = context.grouping ?? 'accounts';
  const excludedGroups = context.exclusions?.[overviewGrouping] ?? [];
  const setExcludedGroups = (values) =>
    updateContext({ exclusions: { ...context.exclusions, [overviewGrouping]: values } });
  const [formOpen, setFormOpen] = React.useState(false);
  const [completingBasis, setCompletingBasis] = React.useState(false);
  const [formOwner, setFormOwner] = React.useState(() => preferences.selectedOwner());
  const [form, setForm] = React.useState(() => blankForm());
  const [editing, setEditing] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [error, setError] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [exporting, setExporting] = React.useState(false);
  const [backupPreview, setBackupPreview] = React.useState(null);
  const [backupFile, setBackupFile] = React.useState(null);
  const [checkingBackup, setCheckingBackup] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [pendingDeletes, setPendingDeletes] = React.useState([]);
  const [deleteUnconfirmed, setDeleteUnconfirmed] = React.useState(false);
  const tabsRef = React.useRef({});
  const retryCommand = React.useRef(null);
  const suspendedPurchase = React.useRef(null);
  const [addingSource, setAddingSource] = React.useState(false);
  const [dialogRevision, setDialogRevision] = React.useState(0);
  const savingRef = React.useRef(false);
  const exportingRef = React.useRef(false);
  const importingRef = React.useRef(false);
  const pendingRef = React.useRef(new Set());
  const importInput = React.useRef(null);
  const inspectionGeneration = React.useRef(0);
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const household = scope.kind === PortfolioScopeKind.HOUSEHOLD;
  const owner = household ? null : scope.ownerId;
  // Fetch complete scopes once; overview selections never filter history, planning or network queries.
  const controller = usePortfolioController(useCases, scope, {});
  const { users, types } = dataFrom(controller.referenceData, { users: FALLBACK_USERS, types: [] });
  const currentDate = today();
  const allEntries = dataFrom(controller.snapshot, []).filter((e) => e.date <= currentDate);
  const entries = dataFrom(controller.entries, []);
  const operations = dataFrom(controller.operations, []);
  const snapshot = buildCurrentSnapshot(allEntries);
  const overviewEntries = filterOverviewEntries(allEntries, overviewGrouping, excludedGroups);
  const overview = buildCurrentSnapshot(overviewEntries);
  const overviewGroups = availableGroups(allEntries, overviewGrouping);
  const overviewPerformance =
    excludedGroups.length === 0
      ? dataFrom(controller.performance, null)
      : aggregatePerformance(
          overview.map(
            (entry) => controller.assets.find((asset) => snapshotKey(asset) === snapshotKey(entry))?.performance ?? null
          )
        );
  const phase = controller.projection.status === 'refreshing' ? 'refreshing' : controller.projection.data?.phase;
  const feedback =
    phase === 'refreshing'
      ? 'Zmiana zapisana. Odświeżamy oszczędności…'
      : phase === 'confirmed'
        ? controller.projection.data?.command.name === 'importDatabaseBackup'
          ? 'Przywrócono kopię danych.'
          : controller.projection.data?.command.name.startsWith('delete')
            ? 'Usunięto wpis. Podsumowanie jest aktualne.'
            : 'Zmiana zapisana. Podsumowanie jest aktualne.'
        : phase === 'pending'
          ? 'Zmiana zapisana. Nie udało się jeszcze odświeżyć podsumowania.'
          : exporting
            ? 'Przygotowujemy kopię danych…'
            : importing
              ? 'Przywracamy kopię danych…'
              : saving
                ? 'Zapisywanie…'
                : status;
  const historyRows = portfolioHistory(entries, operations).filter(
    (row) =>
      (!historySearch ||
        `${TYPE_LABELS[row.type]} ${SUBCATEGORY_LABELS[row.subcategory] || ''} ${OPERATION_LABELS[row.kind] || 'Aktualizacja wartości'} ${displayName(row.owner)} ${TYPE_LABELS[row.cashType] || ''} ${row.date} ${row.note || ''}`
          .toLocaleLowerCase('pl')
          .includes(historySearch.toLocaleLowerCase('pl'))) &&
      (!historyKind || row.kind === historyKind) &&
      (!historyStart || row.date >= historyStart) &&
      (!historyEnd || row.date <= historyEnd) &&
      (!historyAsset ||
        (row.owner === historyAsset.owner &&
          row.type === historyAsset.type &&
          (row.subcategory || '') === (historyAsset.subcategory || '')))
  );
  const historyState =
    controller.entries.status === 'failure'
      ? controller.entries
      : controller.operations.status === 'failure'
        ? controller.operations
        : controller.entries.status !== 'success' || controller.operations.status !== 'success'
          ? {
              status: 'loading',
              ...('data' in controller.entries && 'data' in controller.operations ? { data: historyRows } : {})
            }
          : { status: 'success', data: historyRows };

  React.useEffect(() => {
    if (controller.referenceData.status !== 'success') return;
    const loaded = controller.referenceData.data;
    const resolvedScope =
      scope.kind === PortfolioScopeKind.HOUSEHOLD
        ? HouseholdPortfolio(loaded.users)
        : OwnerPortfolio(loaded.users.includes(scope.ownerId) ? scope.ownerId : loaded.users[0]);
    const sameScope =
      scope.kind === PortfolioScopeKind.HOUSEHOLD
        ? scope.ownerIds.length === resolvedScope.ownerIds.length &&
          scope.ownerIds.every((id) => resolvedScope.ownerIds.includes(id))
        : scope.ownerId === resolvedScope.ownerId;
    if (sameScope) return;
    setScope(resolvedScope);
  }, [controller.referenceData.status, controller.referenceData.data, scope]);
  React.useEffect(() => {
    if (!household) {
      try {
        preferences.selectOwner(owner);
      } catch {
        setError('Nie udało się zapamiętać wybranej osoby.');
      }
    }
  }, [household, owner, preferences]);

  function changeScope(next) {
    if (saving) return;
    setScope(next);
    setFormOpen(false);
    setEditing(null);
    setForm(blankForm());
    retryCommand.current = null;
    setErrors({});
    setError('');
    setFormError('');
    setStatus('');
  }
  function changeOverviewGrouping(grouping: OverviewGrouping) {
    updateContext({ grouping });
  }
  function selectTab(id) {
    setActiveTab(id);
    setSettingsOpen(false);
  }
  function tabKey(event) {
    const index = tabs.findIndex((t) => t.id === activeTab);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % tabs.length
            : event.key === 'ArrowLeft'
              ? (index + tabs.length - 1) % tabs.length
              : null;
    if (next == null) return;
    event.preventDefault();
    selectTab(tabs[next].id);
    requestAnimationFrame(() => tabsRef.current[tabs[next].id]?.focus());
  }
  function openForm(kind = '', asset = null) {
    setCompletingBasis(kind === 'INITIAL' && asset != null);
    const draftOwner = asset?.owner || owner || '';
    const type = asset?.type || '';
    setFormOwner(draftOwner);
    setEditing(null);
    setForm({
      ...blankForm(kind),
      type,
      subcategory: asset?.subcategory || (type ? subcategoriesFor(type)[0] || '' : ''),
      currentValuePln: asset?.valuePln != null && ['INITIAL', 'VALUATION'].includes(kind) ? String(asset.valuePln) : ''
    });
    setErrors({});
    setFormError('');
    retryCommand.current = null;
    setFormOpen(true);
  }
  function editRow(row) {
    setCompletingBasis(false);
    setEditing(row);
    setFormOwner(row.owner);
    setForm({
      ...blankForm(row.kind),
      type: row.type,
      subcategory: row.subcategory || '',
      date: row.date,
      amountPln: row.amountPln != null ? String(row.amountPln) : '',
      costKnown: row.kind === 'INITIAL',
      currentValuePln: row.valuePln != null ? String(row.valuePln) : '',
      cashType: row.cashType || 'KONTO_BANKOWE'
    });
    setErrors({});
    setFormError('');
    retryCommand.current = null;
    setFormOpen(true);
  }
  function completeBasis(asset) {
    const initial = operations.find(
      (o) =>
        o.owner === asset.owner &&
        o.type === asset.type &&
        (o.subcategory || '') === (asset.subcategory || '') &&
        o.operationType === 'INITIAL'
    );
    if (initial) editRow(portfolioHistory(entries, operations).find((r) => r.id === initial.id));
    else {
      const valuation = portfolioHistory(entries, operations).find(
        (row) => row.record === 'entry' && row.id === asset.id
      );
      if (valuation) {
        editRow({ ...valuation, kind: 'INITIAL' });
        setCompletingBasis(true);
        return;
      }
      openForm('INITIAL', asset);
      setForm((previous) => ({ ...previous, date: asset.date, costKnown: true }));
    }
  }
  function closeForm() {
    if (!saving) {
      suspendedPurchase.current = null;
      setAddingSource(false);
      setFormOpen(false);
      setEditing(null);
      retryCommand.current = null;
    }
  }
  function submit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    let mapped;
    try {
      mapped = {
        ...mapPortfolioChangeForm(form, formOwner, allEntries),
        ...(editing ? { editId: editing.id } : {})
      };
    } catch (cause) {
      setErrors({ [cause.field]: cause.message });
      return;
    }
    const command =
      retryCommand.current && JSON.stringify(retryCommand.current) === JSON.stringify(mapped)
        ? retryCommand.current
        : mapped;
    retryCommand.current = command;
    savingRef.current = true;
    setSaving(true);
    setErrors({});
    setFormError('');
    setError('');
    setStatus('');
    controller.commands
      .recordPortfolioChange(command)
      .then(() => {
        retryCommand.current = null;
        if (suspendedPurchase.current) {
          setForm(suspendedPurchase.current);
          suspendedPurchase.current = null;
          setAddingSource(false);
          setDialogRevision((v) => v + 1);
          setFormOpen(true);
        } else setFormOpen(false);
        setEditing(null);
        setStatus(editing ? 'Poprawiono zmianę.' : 'Zapisano zmianę.');
      })
      .catch((cause) => {
        if (cause instanceof PortfolioChangeValidationFailure) setErrors({ [cause.field]: cause.message });
        else
          setFormError(
            cause.status === 400
              ? cause.message
              : 'Nie potwierdzono zapisu. Sprawdź historię lub ponów tę samą próbę — nie zapisze jej dwukrotnie.'
          );
      })
      .finally(() => {
        savingRef.current = false;
        setSaving(false);
      });
  }
  function undo(row, trigger) {
    const key = `${row.record}:${row.id}`;
    if (pendingRef.current.has(key)) return;
    const asset = [TYPE_LABELS[row.type], row.subcategory && SUBCATEGORY_LABELS[row.subcategory]]
      .filter(Boolean)
      .join(' · ');
    const confirmed = window.confirm(
      `Usunąć ten wpis?\n\n${OPERATION_LABELS[row.kind] || 'Aktualizacja wartości'} · ${displayName(row.owner)}\n${asset} · ${row.date}\n${historyValues(row)}\n\nPowiązane salda i późniejsze zmiany zostaną przeliczone.`
    );
    trigger?.focus();
    if (!confirmed) return;
    pendingRef.current.add(key);
    setPendingDeletes([...pendingRef.current]);
    setDeleteUnconfirmed(false);
    setError('');
    const command =
      row.record === 'operation'
        ? controller.commands.deleteInvestmentOperation
        : controller.commands.deleteInvestmentEntry;
    command(row.id)
      .then(() => setStatus('Usunięto wpis.'))
      .catch((cause) => {
        setDeleteUnconfirmed(cause.status !== 400);
        setError(cause.status === 400 ? cause.message : 'Nie potwierdzono usunięcia. Odśwież dane przed ponowieniem.');
      })
      .finally(() => {
        pendingRef.current.delete(key);
        setPendingDeletes([...pendingRef.current]);
      });
  }
  function exportBackup() {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setError('');
    controller.commands
      .exportDatabaseBackup()
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `oszczednosci-${today()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus('Pobrano kopię danych.');
      })
      .catch(() => setError('Nie udało się pobrać kopii danych. Spróbuj ponownie.'))
      .finally(() => {
        exportingRef.current = false;
        setExporting(false);
      });
  }
  async function inspectBackup(file, selectedPlan) {
    const generation = ++inspectionGeneration.current;
    setCheckingBackup(true);
    setError('');
    setBackupPreview(null);
    try {
      const preview = await useCases.importDatabaseBackup.preview(file, selectedPlan);
      if (generation === inspectionGeneration.current) setBackupPreview(preview);
    } catch (cause) {
      if (generation === inspectionGeneration.current) setError(cause.message);
    } finally {
      if (generation === inspectionGeneration.current) setCheckingBackup(false);
    }
  }
  function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || importingRef.current) return;
    setBackupFile(file);
    inspectBackup(file);
  }
  async function confirmImport() {
    if (!backupPreview?.file || importingRef.current) return;
    importingRef.current = true;
    setImporting(true);
    setError('');
    try {
      await controller.commands.importDatabaseBackup(backupPreview.file);
      setPlanRevision((v) => v + 1);
      setBackupPreview(null);
      setBackupFile(null);
      setStatus('Przywrócono kopię danych.');
    } catch {
      setError('Nie potwierdzono przywrócenia kopii. Sprawdź połączenie i aktualne dane przed ponowieniem.');
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  }

  return (
    <main className="page savingsWorkspace" id="main-content">
      <header className="workspaceHeader">
        <div className="workspaceHeading">
          <div>
            <h1 tabIndex={-1}>{household ? 'Nasze oszczędności' : `Oszczędności: ${displayName(owner)}`}</h1>
          </div>
          <Button
            variant="quiet"
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="portfolio-settings"
            onClick={() => {
              setSettingsOpen(!settingsOpen);
            }}
          >
            Ustawienia
          </Button>
        </div>
        <div className="workspaceControls">
          <div className="userSwitcher" role="group" aria-label="Czyje oszczędności?">
            {users.map((user) => (
              <Button
                key={user}
                variant="quiet"
                className={!household && user === owner ? 'userPill active' : 'userPill'}
                type="button"
                aria-pressed={!household && user === owner}
                disabled={saving}
                onClick={() => changeScope(OwnerPortfolio(user))}
              >
                {displayName(user)}
              </Button>
            ))}
            <Button
              variant="quiet"
              className={household ? 'userPill active' : 'userPill'}
              type="button"
              aria-pressed={household}
              disabled={saving}
              onClick={() => changeScope(HouseholdPortfolio(users))}
            >
              Razem
            </Button>
          </div>
          <Button
            variant="primary"
            type="button"
            disabled={controller.referenceData.status !== 'success'}
            onClick={() => openForm()}
          >
            Dodaj wpis
          </Button>
        </div>
        <div className="sectionNavigation savingsTabs" role="tablist" aria-label="Sekcje portfela">
          {tabs.map((tab) => (
            <Button
              variant="quiet"
              key={tab.id}
              ref={(e) => {
                tabsRef.current[tab.id] = e;
              }}
              id={`portfolio-tab-${tab.id}`}
              role="tab"
              aria-selected={!settingsOpen && activeTab === tab.id}
              aria-controls={`portfolio-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={tabKey}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </header>
      {controller.referenceData.status === 'failure' && (
        <InlineMessage variant="error">
          Nie udało się wczytać dostępnych inwestycji.{' '}
          <Button onClick={controller.retry.referenceData}>Spróbuj ponownie</Button>
        </InlineMessage>
      )}
      {(feedback || error) && (
        <div className="formFeedback" role="region" aria-label="Informacje o zmianach">
          {feedback && (
            <InlineMessage variant={phase === 'pending' ? 'warning' : 'success'}>
              {feedback}
              {phase === 'pending' && <Button onClick={controller.retryProjection}>Odśwież podsumowanie</Button>}
            </InlineMessage>
          )}
          {error && (
            <InlineMessage ref={errorRef} variant="error">
              {error}
              {deleteUnconfirmed && (
                <Button
                  onClick={() => {
                    controller.retry.entries();
                    controller.retry.snapshot();
                    controller.retry.performance();
                    setDeleteUnconfirmed(false);
                  }}
                >
                  Odśwież dane
                </Button>
              )}
            </InlineMessage>
          )}
        </div>
      )}
      <section
        id="portfolio-panel-summary"
        className="summaryPanel sectionAnchor"
        aria-busy={phase === 'refreshing'}
        role="tabpanel"
        aria-labelledby="portfolio-tab-summary"
        hidden={settingsOpen || activeTab !== 'summary'}
      >
        {excludedGroups.length > 0 && overview.length > 0 && (
          <p className="activeOverviewScope">
            Wybrane inwestycje:{' '}
            {overviewGroups
              .filter((key) => !excludedGroups.includes(key))
              .map((key) => overviewGroupLabel(key, overviewGrouping))
              .join(', ') || 'brak'}
            . <Button onClick={() => setExcludedGroups([])}>Pokaż cały portfel</Button>
          </p>
        )}
        <QueryBoundary
          state={controller.snapshot}
          isEmpty={() => snapshot.length === 0}
          skeletonShape="section"
          onRetry={controller.retry.snapshot}
          emptyTitle="Zacznij od aktualnego stanu konta lub inwestycji"
          emptyDescription="Wpisz saldo konta lub wartość inwestycji. Sumę dotychczasowych wpłat możesz uzupełnić, jeśli ją znasz."
          emptyAction={
            <Button variant="primary" onClick={() => openForm('INITIAL')}>
              Dodaj aktualny stan konta lub inwestycji
            </Button>
          }
        >
          {() =>
            overview.length === 0 ? (
              <div className="queryState">
                <p>Nie wybrano inwestycji</p>
                <Button onClick={() => setExcludedGroups([])}>Pokaż cały portfel</Button>
              </div>
            ) : (
              <PortfolioOverview
                household={household}
                filtered={excludedGroups.length > 0}
                failed={controller.performance.status === 'failure'}
                filters={
                  <details
                    className="overviewFilterDisclosure"
                    open={context.filtersOpen ?? false}
                    onToggle={(e) => {
                      if (e.currentTarget.open !== !!context.filtersOpen)
                        updateContext({ filtersOpen: e.currentTarget.open });
                    }}
                  >
                    <summary>Filtruj inwestycje</summary>
                    <OverviewFilters
                      grouping={overviewGrouping}
                      groups={overviewGroups}
                      excludedGroups={excludedGroups}
                      values={Object.fromEntries(
                        buildOverviewDistribution(allEntries, overviewGrouping).map((g) => [g.key, g.value])
                      )}
                      onGroupingChange={changeOverviewGrouping}
                      onExcludedGroupsChange={setExcludedGroups}
                    />
                  </details>
                }
                entries={overview}
                performance={overviewPerformance}
                assets={controller.assets}
                loading={controller.performance.status === 'loading'}
                onUpdate={(asset) => openForm('VALUATION', asset)}
                onCompleteBasis={(asset) => {
                  if (household) setScope(OwnerPortfolio(asset.owner));
                  completeBasis(asset);
                }}
                onManage={(asset) => {
                  selectTab('history');
                  setHistoryAsset(asset);
                  requestAnimationFrame(() => tabsRef.current.history?.focus());
                }}
              >
                <details
                  className="chartsDisclosure"
                  open={context.chartsOpen ?? window.matchMedia?.('(min-width: 768px)').matches ?? true}
                  onToggle={(e) => {
                    if (
                      e.currentTarget.open !==
                      (context.chartsOpen ?? window.matchMedia?.('(min-width: 768px)').matches ?? true)
                    )
                      updateContext({ chartsOpen: e.currentTarget.open });
                  }}
                >
                  <summary>Rozkład i historia wartości</summary>
                  <OverviewCharts
                    view={context.chart ?? {}}
                    onViewChange={(chart) => updateContext({ chart })}
                    entries={overviewEntries}
                    grouping={overviewGrouping}
                    today={currentDate}
                  />
                </details>
              </PortfolioOverview>
            )
          }
        </QueryBoundary>
        {controller.performance.status === 'failure' && (
          <InlineMessage variant="warning">
            Nie udało się wczytać wyników. <Button onClick={controller.retry.performance}>Odśwież wyniki</Button>
          </InlineMessage>
        )}
      </section>
      <section
        id="portfolio-panel-allocation"
        aria-busy={phase === 'refreshing'}
        role="tabpanel"
        aria-labelledby="portfolio-tab-allocation"
        hidden={settingsOpen || activeTab !== 'allocation'}
      >
        <PurchasePlanPanel
          entries={allEntries}
          scope={household ? 'household' : owner}
          useCases={useCases}
          revision={planRevision}
          assetsReady={controller.snapshot.status === 'success'}
        />
      </section>
      <section
        id="portfolio-panel-history"
        role="tabpanel"
        aria-labelledby="portfolio-tab-history"
        hidden={settingsOpen || activeTab !== 'history'}
        className="ledgerSection"
      >
        <h2>Historia zmian</h2>
        <label className="field">
          Znajdź wpis
          <input
            type="search"
            value={historySearch}
            onChange={(e) => updateContext({ historySearch: e.target.value })}
          />
        </label>
        <details>
          <summary>Filtr okresu i działania</summary>
          <div className="overviewHistoryControls">
            <label className="field">
              Od
              <input
                type="date"
                value={historyStart}
                onChange={(e) => updateContext({ historyStart: e.target.value })}
              />
            </label>
            <label className="field">
              Do
              <input type="date" value={historyEnd} onChange={(e) => updateContext({ historyEnd: e.target.value })} />
            </label>
            <label className="field">
              Działanie
              <select value={historyKind} onChange={(e) => updateContext({ historyKind: e.target.value })}>
                <option value="">Wszystkie działania</option>
                {Object.entries({ ...OPERATION_LABELS, VALUATION: 'Aktualizacja wartości' }).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <p>Edytuj lub usuń wybrany wpis. Po usunięciu powiązane salda zostaną przeliczone.</p>
        {historyAsset && (
          <div className="historyFilter">
            <span>
              Historia: {displayName(historyAsset.owner)} · {TYPE_LABELS[historyAsset.type]}
              {historyAsset.subcategory ? ` · ${SUBCATEGORY_LABELS[historyAsset.subcategory]}` : ''}
            </span>
            <Button onClick={() => setHistoryAsset(null)}>Pokaż całą historię</Button>
          </div>
        )}
        <QueryBoundary
          state={historyState}
          isEmpty={() => portfolioHistory(entries, operations).length === 0}
          skeletonShape="list"
          onRetry={() => {
            controller.retry.entries();
            controller.retry.operations();
          }}
          emptyTitle="Tu pojawią się Twoje zmiany"
          emptyDescription="Wpłaty, zakupy i aktualizacje wartości znajdziesz w jednej historii."
          emptyAction={<Button onClick={() => openForm('INITIAL')}>Dodaj aktualny stan konta lub inwestycji</Button>}
        >
          {() => (
            <div className="entryList">
              {historyRows.length === 0 && (
                <div>
                  <p>Brak wpisów spełniających wybrane warunki.</p>
                  <Button
                    onClick={() =>
                      updateContext({
                        historyAsset: null,
                        historySearch: '',
                        historyKind: '',
                        historyStart: '',
                        historyEnd: ''
                      })
                    }
                  >
                    Wyczyść filtry historii
                  </Button>
                </div>
              )}
              {historyRows.map((row, index) => {
                const pending = pendingDeletes.includes(`${row.record}:${row.id}`);
                return (
                  <React.Fragment key={`${row.record}:${row.id}`}>
                    {(index === 0 || historyRows[index - 1].date !== row.date) && (
                      <h3 className="historyDate">
                        {new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' }).format(
                          new Date(`${row.date}T12:00:00`)
                        )}
                      </h3>
                    )}
                    <article className="entryRow" aria-busy={pending}>
                      <div>
                        <strong>{OPERATION_LABELS[row.kind] || 'Aktualizacja wartości'}</strong>
                        <span>
                          {TYPE_LABELS[row.type]}
                          {row.subcategory ? ` · ${SUBCATEGORY_LABELS[row.subcategory]}` : ''}
                        </span>
                        <small>
                          {row.date} · {displayName(row.owner)}
                        </small>
                        {row.cashType && (
                          <small>
                            {row.kind === 'BUY'
                              ? `Z konta ${TYPE_LABELS[row.cashType]} → ${TYPE_LABELS[row.type]}`
                              : `${TYPE_LABELS[row.type]} → konto ${TYPE_LABELS[row.cashType]}`}
                          </small>
                        )}
                        {row.note && <small>{row.note}</small>}
                      </div>
                      <strong className="entryValue">{historyValues(row)}</strong>
                      <div className="entryActions">
                        <Button
                          type="button"
                          aria-label={`Edytuj: ${OPERATION_LABELS[row.kind] || 'Aktualizacja wartości'} · ${TYPE_LABELS[row.type]} · ${displayName(row.owner)} · ${row.date}`}
                          disabled={pending}
                          onClick={() => editRow(row)}
                        >
                          Edytuj
                        </Button>
                        <Button
                          variant="quiet"
                          className="deleteAction"
                          aria-label={`${pending ? 'Usuwanie…' : 'Usuń wpis'}: ${TYPE_LABELS[row.type]} · ${displayName(row.owner)} · ${row.date}`}
                          type="button"
                          disabled={pending}
                          onClick={(event) => undo(row, event.currentTarget)}
                        >
                          {pending ? 'Usuwanie…' : 'Usuń wpis'}
                        </Button>
                      </div>
                    </article>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </QueryBoundary>
      </section>
      <section
        id="portfolio-settings"
        hidden={!settingsOpen}
        className="ledgerSection databasePanel"
        aria-labelledby="settings-heading"
      >
        <h2 id="settings-heading">Ustawienia i kopie danych</h2>
        <Button onClick={() => setSettingsOpen(false)}>Wróć do: {tabs.find((t) => t.id === activeTab)?.label}</Button>
        <p>
          Pobierz kopię swoich oszczędności. Przywrócenie kopii zastępuje wszystkie obecne dane, także zapisane plany.
        </p>
        <h3>Pobierz kopię</h3>
        <p>Kopia obejmuje Jakuba, Zosię i jeden wspólny plan, niezależnie od wybranej osoby.</p>
        <div className="databaseActions">
          <Button onClick={exportBackup} busy={exporting} busyLabel="Pobieranie…">
            Pobierz kopię danych
          </Button>
          <h3>Przywróć kopię</h3>
          <Button onClick={() => importInput.current?.click()} busy={importing} busyLabel="Przywracanie…">
            Przywróć z kopii
          </Button>
          <input
            ref={importInput}
            type="file"
            className="visuallyHidden"
            aria-label="Wybierz plik kopii danych"
            accept="application/json,.json"
            disabled={importing}
            onChange={importBackup}
          />
        </div>
        {checkingBackup && <p role="status">Sprawdzanie kopii…</p>}
        {backupFile && !backupPreview && !checkingBackup && (
          <Button onClick={() => inspectBackup(backupFile)}>Sprawdź kopię ponownie</Button>
        )}
        {backupPreview?.needsPlan && (
          <label className="field">
            Kopia nie ma planu Razem. Wybierz plan, który stanie się wspólny.
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) inspectBackup(backupFile, e.target.value);
              }}
            >
              <option value="">Wybierz plan z kopii</option>
              {backupPreview.choices.map((key) => (
                <option key={key} value={key}>
                  {displayName(key)}
                </option>
              ))}
            </select>
          </label>
        )}
        {backupPreview?.file && (
          <div className="backupPreview">
            <h3>Podgląd kopii</h3>
            <p>
              Format: {backupPreview.format}. Osoby: {backupPreview.owners.map(displayName).join(', ') || 'Brak wpisów'}
              . Wyceny: {backupPreview.entries}. Operacje: {backupPreview.operations}. Wspólny plan:{' '}
              {backupPreview.sharedPlan ? 'tak' : 'brak'}.
            </p>
            <p>Ta kopia zastąpi wszystkie obecne dane Jakuba, Zosi i wspólne plany.</p>
            <Button
              onClick={() => {
                setBackupPreview(null);
                setBackupFile(null);
              }}
              disabled={importing}
            >
              Anuluj przywracanie
            </Button>
            <Button variant="primary" onClick={confirmImport} busy={importing}>
              Potwierdź zastąpienie danych
            </Button>
          </div>
        )}
        <Link to="/about">Jak korzystać</Link>
      </section>
      {formOpen && (
        <PortfolioChangeDialog
          key={dialogRevision}
          onReturnToPurchase={
            addingSource
              ? () => {
                  setForm(suspendedPurchase.current);
                  suspendedPurchase.current = null;
                  setAddingSource(false);
                  setDialogRevision((v) => v + 1);
                }
              : undefined
          }
          onAddSource={() => {
            suspendedPurchase.current = form;
            setAddingSource(true);
            setForm({ ...blankForm('INITIAL'), type: form.cashType, date: form.date });
            setDialogRevision((v) => v + 1);
          }}
          form={form}
          setForm={setForm}
          owner={formOwner}
          owners={household ? users : [formOwner]}
          onOwnerChange={(next) => {
            setFormOwner(next);
            retryCommand.current = null;
            setErrors({});
            setFormError('');
          }}
          types={types}
          entries={allEntries}
          completingBasis={completingBasis}
          editing={!!editing}
          legacy={!!editing?.legacy}
          saving={saving}
          errors={errors}
          error={formError}
          onSubmit={submit}
          onClose={closeForm}
        />
      )}
    </main>
  );
}

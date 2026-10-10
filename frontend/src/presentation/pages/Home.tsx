// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { subcategoriesFor, FALLBACK_USERS } from '../../domain/portfolio/constants.js';
import { OwnerPortfolio, HouseholdPortfolio, PortfolioScopeKind } from '../../application/PortfolioScope.js';
import { PortfolioChangeValidationFailure } from '../../application/portfolio/RecordPortfolioChange.js';
import { buildCurrentSnapshot } from '../../domain/portfolio/snapshot.js';
import { usePortfolioController } from '../portfolio/hooks/usePortfolioController.js';
import { dataFrom } from '../portfolio/hooks/queryState.js';
import { mapPortfolioChangeForm } from '../mappers/portfolioChangeFormMapper.js';
import { portfolioHistory } from '../viewModels/portfolioHistory.js';
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
import { SummaryChart } from '../components/SummaryChart.js';
import { PortfolioChangeDialog } from '../components/PortfolioChangeDialog.js';

const tabs = [
  { id: 'summary', label: 'Przegląd' },
  { id: 'allocation', label: 'Co dokupić?' },
  { id: 'history', label: 'Historia' }
];
const blankForm = (kind = 'DEPOSIT') => ({
  action: kind,
  operationType: kind,
  type: '',
  subcategory: '',
  amountPln: '',
  currentValuePln: '',
  costKnown: true,
  cashType: 'KONTO_BANKOWE',
  date: today()
});

export function Home({ dependencies }) {
  const { useCases, preferences } = dependencies;
  const [scope, setScope] = React.useState(() => OwnerPortfolio(preferences.selectedOwner()));
  const [activeTab, setActiveTab] = React.useState('summary');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [formOwner, setFormOwner] = React.useState(() => preferences.selectedOwner());
  const [form, setForm] = React.useState(() => blankForm());
  const [editing, setEditing] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [error, setError] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [pendingDeletes, setPendingDeletes] = React.useState([]);
  const tabsRef = React.useRef({});
  const retryCommand = React.useRef(null);
  const savingRef = React.useRef(false);
  const exportingRef = React.useRef(false);
  const importingRef = React.useRef(false);
  const pendingRef = React.useRef(new Set());
  const importInput = React.useRef(null);
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const household = scope.kind === PortfolioScopeKind.HOUSEHOLD;
  const owner = household ? null : scope.ownerId;
  // Filters belong to the overview; history, planning and household always use their complete scope.
  const filters =
    activeTab === 'summary' && !settingsOpen && !household ? { type: typeFilter, subcategory: subcategoryFilter } : {};
  const controller = usePortfolioController(useCases, scope, filters);
  const { users, types } = dataFrom(controller.referenceData, { users: FALLBACK_USERS, types: [] });
  const allEntries = dataFrom(controller.snapshot, []).filter((e) => e.date <= today());
  const entries = dataFrom(controller.entries, []);
  const operations = dataFrom(controller.operations, []);
  const snapshot = buildCurrentSnapshot(allEntries);
  const overview =
    !household && typeFilter
      ? snapshot.filter((e) => e.type === typeFilter && (!subcategoryFilter || e.subcategory === subcategoryFilter))
      : snapshot;
  const label = household
    ? 'Wspólne oszczędności'
    : subcategoryFilter
      ? SUBCATEGORY_LABELS[subcategoryFilter]
      : typeFilter
        ? TYPE_LABELS[typeFilter]
        : 'Wszystkie oszczędności';
  const phase = controller.projection.status === 'refreshing' ? 'refreshing' : controller.projection.data?.phase;
  const feedback =
    phase === 'refreshing'
      ? 'Zmiana zapisana. Odświeżamy oszczędności…'
      : phase === 'confirmed'
        ? 'Zmiana zapisana. Podsumowanie jest aktualne.'
        : phase === 'pending'
          ? 'Zmiana zapisana. Nie udało się jeszcze odświeżyć podsumowania.'
          : exporting
            ? 'Przygotowujemy kopię danych…'
            : importing
              ? 'Przywracamy kopię danych…'
              : saving
                ? 'Zapisywanie…'
                : status;
  const historyRows = portfolioHistory(entries, operations);
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
    setScope((current) =>
      current.kind === PortfolioScopeKind.HOUSEHOLD
        ? HouseholdPortfolio(loaded.users)
        : OwnerPortfolio(loaded.users.includes(current.ownerId) ? current.ownerId : loaded.users[0])
    );
  }, [controller.referenceData.status, controller.referenceData.data]);
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
    setTypeFilter('');
    setSubcategoryFilter('');
    setFormOpen(false);
    setEditing(null);
    setForm(blankForm());
    retryCommand.current = null;
    setErrors({});
    setError('');
    setFormError('');
    setStatus('');
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
  function openForm(kind = 'DEPOSIT', asset = null) {
    const draftOwner = asset?.owner || owner || users[0];
    const type = asset?.type || (types.includes('KONTO_BANKOWE') ? 'KONTO_BANKOWE' : types[0] || '');
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
    setEditing(row);
    setFormOwner(row.owner);
    setForm({
      ...blankForm(row.kind),
      type: row.type,
      subcategory: row.subcategory || '',
      date: row.date,
      amountPln: row.amountPln != null ? String(row.amountPln) : '',
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
    else openForm('INITIAL', asset);
  }
  function closeForm() {
    if (!saving) {
      setFormOpen(false);
      setEditing(null);
      retryCommand.current = null;
    }
  }
  function submit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    const mapped = {
      ...mapPortfolioChangeForm(form, formOwner, allEntries),
      ...(editing ? { editId: editing.id } : {})
    };
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
        setFormOpen(false);
        setEditing(null);
        setStatus(editing ? 'Poprawiono zmianę.' : 'Zapisano zmianę.');
      })
      .catch((cause) => {
        if (cause instanceof PortfolioChangeValidationFailure) setErrors({ [cause.field]: cause.message });
        else
          setFormError(
            cause.status === 400
              ? cause.message
              : 'Nie udało się zapisać zmiany. Spróbuj ponownie — ta sama próba nie zapisze jej dwukrotnie.'
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
      `Cofnąć tę zmianę?\n\n${OPERATION_LABELS[row.kind] || 'Aktualizacja wartości'} · ${displayName(row.owner)}\n${asset} · ${row.date}\n${formatMoney(row.amountPln ?? row.valuePln)}\n\nPowiązane salda i późniejsze zmiany zostaną przeliczone.`
    );
    trigger?.focus();
    if (!confirmed) return;
    pendingRef.current.add(key);
    setPendingDeletes([...pendingRef.current]);
    setError('');
    const command =
      row.record === 'operation'
        ? controller.commands.deleteInvestmentOperation
        : controller.commands.deleteInvestmentEntry;
    command(row.id)
      .then(() => setStatus('Cofnięto zmianę.'))
      .catch((cause) =>
        setError(cause.status === 400 ? cause.message : 'Nie udało się cofnąć zmiany. Spróbuj ponownie.')
      )
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
  function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || importingRef.current) return;
    if (!window.confirm('Przywrócenie kopii zastąpi wszystkie obecne dane. Czy kontynuować?')) return;
    importingRef.current = true;
    setImporting(true);
    setError('');
    controller.commands
      .importDatabaseBackup(file)
      .then(() => setStatus('Przywrócono kopię danych.'))
      .catch(() => setError('Nie udało się przywrócić kopii. Sprawdź plik i spróbuj ponownie.'))
      .finally(() => {
        importingRef.current = false;
        setImporting(false);
      });
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
            onClick={() => setSettingsOpen(!settingsOpen)}
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
            Dodaj zmianę
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
              aria-selected={activeTab === tab.id}
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
        {!household && snapshot.length > 0 && (
          <details className="overviewFilters">
            <summary>Filtruj inwestycje: {label}</summary>
            <div className="typeNav" role="group" aria-label="Rodzaj inwestycji">
              <Button
                variant="quiet"
                className={!typeFilter ? 'typeTab active' : 'typeTab'}
                aria-pressed={!typeFilter}
                onClick={() => {
                  setTypeFilter('');
                  setSubcategoryFilter('');
                }}
              >
                Wszystkie inwestycje
              </Button>
              {types
                .filter((t) => snapshot.some((e) => e.type === t))
                .map((type) => (
                  <Button
                    key={type}
                    variant="quiet"
                    className={typeFilter === type ? 'typeTab active' : 'typeTab'}
                    aria-pressed={typeFilter === type}
                    onClick={() => {
                      setTypeFilter(type);
                      setSubcategoryFilter('');
                    }}
                  >
                    {TYPE_LABELS[type]}
                  </Button>
                ))}
            </div>
            {typeFilter && subcategoriesFor(typeFilter).length > 0 && (
              <div className="subtypeNav" role="group" aria-label="Rodzaj instrumentu">
                <Button variant="quiet" aria-pressed={!subcategoryFilter} onClick={() => setSubcategoryFilter('')}>
                  Wszystkie
                </Button>
                {subcategoriesFor(typeFilter).map((sub) => (
                  <Button
                    key={sub}
                    variant="quiet"
                    aria-pressed={subcategoryFilter === sub}
                    onClick={() => setSubcategoryFilter(sub)}
                  >
                    {SUBCATEGORY_LABELS[sub]}
                  </Button>
                ))}
              </div>
            )}
          </details>
        )}
        <QueryBoundary
          state={controller.snapshot}
          skeletonShape="section"
          onRetry={controller.retry.snapshot}
          emptyTitle="Dodaj oszczędności, które już masz"
          emptyDescription="Wpisz obecną wartość i kwotę, którą wpłaciłeś. Nie musisz odtwarzać całej historii."
          emptyAction={
            <Button variant="primary" onClick={() => openForm('INITIAL')}>
              Dodaj posiadane oszczędności
            </Button>
          }
        >
          {() => (
            <PortfolioOverview
              entries={overview}
              performance={dataFrom(controller.performance, null)}
              assets={controller.assets}
              loading={controller.performance.status === 'loading'}
              onUpdate={(asset) => openForm('VALUATION', asset)}
              onCompleteBasis={completeBasis}
            />
          )}
        </QueryBoundary>
        {controller.performance.status === 'failure' && (
          <InlineMessage variant="warning">
            Nie udało się wczytać wyników. <Button onClick={controller.retry.performance}>Odśwież wyniki</Button>
          </InlineMessage>
        )}
        {snapshot.length > 0 && (
          <details className="valueHistory">
            <summary>Zobacz historię wartości</summary>
            <SummaryChart
              key={`${scope.kind}:${owner}:${typeFilter}:${subcategoryFilter}`}
              scopeLabel={label}
              entries={allEntries.filter(
                (e) =>
                  household ||
                  ((!typeFilter || e.type === typeFilter) &&
                    (!subcategoryFilter || e.subcategory === subcategoryFilter))
              )}
              types={types}
            />
          </details>
        )}
      </section>
      <section
        id="portfolio-panel-allocation"
        aria-busy={phase === 'refreshing'}
        role="tabpanel"
        aria-labelledby="portfolio-tab-allocation"
        hidden={settingsOpen || activeTab !== 'allocation'}
      >
        <QueryBoundary
          state={controller.snapshot}
          skeletonShape="section"
          onRetry={controller.retry.snapshot}
          emptyTitle="Najpierw wpisz posiadane oszczędności"
          emptyDescription="Na ich podstawie podpowiemy, co dokupić według Twoich proporcji."
          emptyAction={
            <Button variant="primary" onClick={() => openForm('INITIAL')}>
              Dodaj posiadane oszczędności
            </Button>
          }
        >
          {() => <PurchasePlanPanel entries={allEntries} scope={household ? 'household' : owner} useCases={useCases} />}
        </QueryBoundary>
      </section>
      <section
        id="portfolio-panel-history"
        role="tabpanel"
        aria-labelledby="portfolio-tab-history"
        hidden={settingsOpen || activeTab !== 'history'}
        className="ledgerSection"
      >
        <h2>Historia zmian</h2>
        <QueryBoundary
          state={historyState}
          skeletonShape="list"
          onRetry={() => {
            controller.retry.entries();
            controller.retry.operations();
          }}
          emptyTitle="Tu pojawią się Twoje zmiany"
          emptyDescription="Wpłaty, zakupy i aktualizacje wartości znajdziesz w jednej historii."
          emptyAction={<Button onClick={() => openForm('INITIAL')}>Dodaj posiadane oszczędności</Button>}
        >
          {() => (
            <div className="entryList">
              {historyRows.map((row) => {
                const pending = pendingDeletes.includes(`${row.record}:${row.id}`);
                return (
                  <article className="entryRow" key={`${row.record}:${row.id}`} aria-busy={pending}>
                    <div>
                      <strong>{OPERATION_LABELS[row.kind] || 'Aktualizacja wartości'}</strong>
                      <span>
                        {TYPE_LABELS[row.type]}
                        {row.subcategory ? ` · ${SUBCATEGORY_LABELS[row.subcategory]}` : ''}
                      </span>
                      <small>
                        {row.date} · {displayName(row.owner)}
                      </small>
                      {row.kind === 'INITIAL' && (
                        <small>
                          Wpłaciłem: {formatMoney(row.amountPln)} · Mam: {formatMoney(row.valuePln)}
                        </small>
                      )}
                      {row.note && <small>{row.note}</small>}
                    </div>
                    <strong className="entryValue">
                      {formatMoney(row.kind === 'INITIAL' || row.kind === 'VALUATION' ? row.valuePln : row.amountPln)}
                    </strong>
                    <div className="entryActions">
                      <Button type="button" disabled={pending} onClick={() => editRow(row)}>
                        Popraw
                      </Button>
                      <Button
                        variant="quiet"
                        type="button"
                        disabled={pending}
                        onClick={(event) => undo(row, event.currentTarget)}
                      >
                        {pending ? 'Cofanie…' : 'Cofnij zmianę'}
                      </Button>
                    </div>
                  </article>
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
        <h2 id="settings-heading">Ustawienia i kopia danych</h2>
        <p>
          Pobierz kopię swoich oszczędności. Przywrócenie kopii zastępuje wszystkie obecne dane, także zapisane plany.
        </p>
        <div className="databaseActions">
          <Button onClick={exportBackup} busy={exporting} busyLabel="Pobieranie…">
            Pobierz kopię danych
          </Button>
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
        <Link to="/about">Informacje o aplikacji</Link>
      </section>
      {formOpen && (
        <PortfolioChangeDialog
          form={form}
          setForm={setForm}
          owner={formOwner}
          owners={household ? users : [formOwner]}
          onOwnerChange={(next) => {
            setFormOwner(next);
            setForm(blankForm(form.action));
            retryCommand.current = null;
            setErrors({});
            setFormError('');
          }}
          types={types}
          entries={allEntries}
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

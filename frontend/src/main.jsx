import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import './styles.css';

const USER_STORAGE_KEY = 'oszczednosci.selectedUser';
const FALLBACK_USERS = ['JAKUB', 'ZOSIA'];
const SUBCATEGORIES_BY_TYPE = {
  OBLIGACJE: ['TRZYLETNIE', 'DZIESIECIOLETNIE', 'DWUNASTOLETNIE'],
  GIELDA: ['ZLOTO', 'RYNKI_ROZWINIETE', 'RYNKI_ROZWIJAJACE_SIE'],
  IKE: ['ZLOTO', 'RYNKI_ROZWINIETE', 'RYNKI_ROZWIJAJACE_SIE'],
  IKZE: ['ZLOTO', 'RYNKI_ROZWINIETE', 'RYNKI_ROZWIJAJACE_SIE']
};
const TYPE_LABELS = {
  OBLIGACJE: 'Obligacje',
  GIELDA: 'Giełda',
  IKE: 'IKE',
  IKZE: 'IKZE',
  KONTO_OSZCZEDNOSCIOWE: 'Konto oszczędnościowe',
  KONTO_BANKOWE: 'Konto bankowe',
  PPK: 'PPK',
  PPO: 'PPO'
};
const DEFAULT_STOCK_TARGET_ALLOCATIONS = {
  ZLOTO: 40,
  RYNKI_ROZWINIETE: 30,
  RYNKI_ROZWIJAJACE_SIE: 30
};
const STOCK_SUBCATEGORIES = Object.keys(DEFAULT_STOCK_TARGET_ALLOCATIONS);
const STOCK_ALLOCATION_STORAGE_KEY = 'oszczednosci.stockTargetAllocations';
const GLOBAL_ALLOCATION_STORAGE_KEY = 'oszczednosci.globalTargetAllocations';
const GLOBAL_ASSET_CLASSES = ['BONDS', 'STOCKS', 'GOLD'];
const DEFAULT_GLOBAL_TARGET_ALLOCATIONS = { BONDS: 50, STOCKS: 30, GOLD: 20 };
const GLOBAL_ASSET_LABELS = { BONDS: 'Obligacje', STOCKS: 'Akcje', GOLD: 'Złoto' };
const CASH_TYPES = ['KONTO_OSZCZEDNOSCIOWE', 'KONTO_BANKOWE', 'PPO', 'PPK'];
const OPERATION_LABELS = { DEPOSIT: 'Wpłata', WITHDRAWAL: 'Wypłata', BUY: 'Zakup', SELL: 'Sprzedaż' };

const SUBCATEGORY_LABELS = {
  ZLOTO: 'Złoto',
  RYNKI_ROZWINIETE: 'Rynki rozwinięte',
  RYNKI_ROZWIJAJACE_SIE: 'Rynki rozwijające się',
  TRZYLETNIE: '3-letnie',
  DZIESIECIOLETNIE: '10-letnie',
  DWUNASTOLETNIE: '12-letnie'
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function displayName(user) {
  return user.charAt(0) + user.slice(1).toLowerCase();
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatUnsignedPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatPercentagePoints(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value)} pp`;
}

function formatSignedMoney(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatMoney(value)}`;
}

function monthKey(dateValue) {
  return dateValue.slice(0, 7);
}

function yearKey(dateValue) {
  return dateValue.slice(0, 4);
}

function monthLabel(key) {
  const [year, month] = key.split('-');
  return new Intl.DateTimeFormat('pl-PL', { month: 'short', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
}

function snapshotKey(entry) {
  return `${entry.type}:${entry.subcategory || 'NONE'}`;
}

function isNewerEntry(candidate, current) {
  return !current || candidate.date > current.date || (candidate.date === current.date && candidate.createdAt > current.createdAt);
}

function buildCurrentSnapshot(entries) {
  const latestByInvestment = entries.reduce((result, entry) => {
    const key = snapshotKey(entry);
    if (isNewerEntry(entry, result[key])) {
      result[key] = entry;
    }
    return result;
  }, {});

  return Object.values(latestByInvestment);
}

function buildSummary(entries, period) {
  const keyFor = period === 'yearly' ? yearKey : monthKey;
  const labelFor = period === 'yearly' ? (key) => key : monthLabel;
  const sortedEntries = [...entries].sort((first, second) => {
    const dateOrder = first.date.localeCompare(second.date);
    if (dateOrder !== 0) return dateOrder;
    return first.createdAt.localeCompare(second.createdAt);
  });
  const periodKeys = [...new Set(sortedEntries.map((entry) => keyFor(entry.date)))].sort((first, second) => first.localeCompare(second));
  const latestByInvestment = {};
  const totalsByPeriod = [];
  let entryIndex = 0;

  return periodKeys.map((key, index) => {
    while (entryIndex < sortedEntries.length && keyFor(sortedEntries[entryIndex].date) <= key) {
      const entry = sortedEntries[entryIndex];
      latestByInvestment[snapshotKey(entry)] = entry;
      entryIndex += 1;
    }

    const total = Object.values(latestByInvestment).reduce((sum, entry) => sum + Number(entry.valuePln), 0);
    const previousTotal = index > 0 ? totalsByPeriod[index - 1] : null;
    const changeAmount = previousTotal === null ? 0 : total - previousTotal;
    const changePercent = previousTotal > 0 ? (changeAmount / previousTotal) * 100 : null;

    totalsByPeriod[index] = total;
    return { key, label: labelFor(key), total, changeAmount, changePercent };
  });
}


function normalizeStockAllocations(weights) {
  return STOCK_SUBCATEGORIES.reduce((result, subcategory) => {
    const parsedWeight = Number(weights?.[subcategory]);
    result[subcategory] = Number.isFinite(parsedWeight) && parsedWeight >= 0 ? parsedWeight : DEFAULT_STOCK_TARGET_ALLOCATIONS[subcategory];
    return result;
  }, {});
}

function loadStoredStockAllocations() {
  try {
    return normalizeStockAllocations(JSON.parse(localStorage.getItem(STOCK_ALLOCATION_STORAGE_KEY) || 'null'));
  } catch {
    return normalizeStockAllocations(DEFAULT_STOCK_TARGET_ALLOCATIONS);
  }
}

function allocationTotal(weights) {
  return STOCK_SUBCATEGORIES.reduce((sum, subcategory) => sum + Number(weights[subcategory] || 0), 0);
}

function formatAllocationHeadline(weights) {
  return STOCK_SUBCATEGORIES.map((subcategory) => `${SUBCATEGORY_LABELS[subcategory].toLowerCase()} ${formatUnsignedPercent(Number(weights[subcategory] || 0))}`).join(', ');
}

function loadStoredGlobalAllocations() {
  try {
    const stored = JSON.parse(localStorage.getItem(GLOBAL_ALLOCATION_STORAGE_KEY) || 'null');
    return GLOBAL_ASSET_CLASSES.reduce((result, assetClass) => {
      const value = Number(stored?.[assetClass]);
      result[assetClass] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_GLOBAL_TARGET_ALLOCATIONS[assetClass];
      return result;
    }, {});
  } catch {
    return { ...DEFAULT_GLOBAL_TARGET_ALLOCATIONS };
  }
}

function globalAssetClass(entry) {
  if (CASH_TYPES.includes(entry.type)) return 'CASH';
  if (entry.type === 'OBLIGACJE') return 'BONDS';
  if (entry.subcategory === 'ZLOTO') return 'GOLD';
  if (['GIELDA', 'IKE', 'IKZE'].includes(entry.type)) return 'STOCKS';
  return 'CASH';
}

function GlobalAllocationPanel({ entries }) {
  const [targets, setTargets] = React.useState(loadStoredGlobalAllocations);
  const snapshot = React.useMemo(() => buildCurrentSnapshot(entries), [entries]);
  const values = snapshot.reduce((result, entry) => {
    const assetClass = globalAssetClass(entry);
    result[assetClass] = (result[assetClass] || 0) + Number(entry.valuePln);
    return result;
  }, {});
  const investedTotal = GLOBAL_ASSET_CLASSES.reduce((sum, assetClass) => sum + (values[assetClass] || 0), 0);
  const cashTotal = values.CASH || 0;
  const targetTotal = GLOBAL_ASSET_CLASSES.reduce((sum, assetClass) => sum + Number(targets[assetClass] || 0), 0);
  const isValid = Math.abs(targetTotal - 100) < 0.001;
  const requiredFinalTotal = GLOBAL_ASSET_CLASSES.reduce((minimum, assetClass) => {
    const weight = Number(targets[assetClass] || 0);
    const value = values[assetClass] || 0;
    if (weight === 0) return value > 0 ? Infinity : minimum;
    return Math.max(minimum, value / (weight / 100));
  }, investedTotal);
  const contributionOnlyTotal = requiredFinalTotal - investedTotal;

  React.useEffect(() => {
    localStorage.setItem(GLOBAL_ALLOCATION_STORAGE_KEY, JSON.stringify(targets));
  }, [targets]);

  const rows = GLOBAL_ASSET_CLASSES.map((assetClass) => {
    const currentValue = values[assetClass] || 0;
    const currentWeight = investedTotal > 0 ? currentValue / investedTotal * 100 : 0;
    const targetWeight = Number(targets[assetClass] || 0);
    const targetValue = investedTotal * targetWeight / 100;
    return {
      assetClass, currentValue, currentWeight, targetWeight,
      deviation: currentWeight - targetWeight,
      rebalanceAmount: targetValue - currentValue,
      contributionAmount: Number.isFinite(requiredFinalTotal) ? Math.max(0, requiredFinalTotal * targetWeight / 100 - currentValue) : null
    };
  });

  return (
    <section className="panel globalAllocationPanel">
      <div className="stockHeader">
        <div>
          <p className="eyebrow">Alokacja całego majątku</p>
          <h2>Globalny plan portfela inwestycyjnego</h2>
          <p>Obligacje, akcje i złoto są liczone na podstawie najnowszych wycen. Gotówka pozostaje poza wagami docelowymi i jest pokazana osobno.</p>
        </div>
        <div className="globalTotals">
          <div><span>Aktywa w planie</span><strong>{formatMoney(investedTotal)}</strong></div>
          <div><span>Gotówka poza planem</span><strong>{formatMoney(cashTotal)}</strong><small>Konta, PPO i PPK</small></div>
        </div>
      </div>

      <div className="allocationEditor">
        <div><p className="eyebrow">Wagi globalne</p><h3>Ustaw docelową strukturę</h3></div>
        <div className="allocationInputs globalInputs">
          {GLOBAL_ASSET_CLASSES.map((assetClass) => <label key={assetClass}>{GLOBAL_ASSET_LABELS[assetClass]}
            <input type="number" min="0" max="100" step="0.01" value={targets[assetClass]} onChange={(event) => setTargets((current) => ({ ...current, [assetClass]: event.target.value === '' ? 0 : Number(event.target.value) }))} />
          </label>)}
        </div>
        <div className={isValid ? 'allocationStatus valid' : 'allocationStatus invalid'}>
          <span>Suma wag: {formatUnsignedPercent(targetTotal)}</span>
          {!isValid && <strong>Ustaw łącznie 100%, aby obliczenia tworzyły poprawny plan.</strong>}
          <button className="subtypeTab" type="button" onClick={() => setTargets({ ...DEFAULT_GLOBAL_TARGET_ALLOCATIONS })}>Przywróć 50/30/20</button>
        </div>
      </div>

      {investedTotal === 0 ? <p>Dodaj wyceny aktywów, aby zobaczyć aktualną alokację i plan równoważenia.</p> : <>
        <div className="globalAllocationTable" role="table" aria-label="Globalna alokacja majątku">
          <div className="globalAllocationHeader" role="row"><span>Klasa aktywów</span><span>Aktualnie</span><span>Cel</span><span>Odchylenie</span><span>Kup / sprzedaj</span><span>Tylko nowe wpłaty</span></div>
          {rows.map((row) => <div className="globalAllocationRow" role="row" key={row.assetClass}>
            <strong>{GLOBAL_ASSET_LABELS[row.assetClass]}</strong>
            <span>{formatMoney(row.currentValue)}<small>{formatUnsignedPercent(row.currentWeight)}</small></span>
            <span>{formatUnsignedPercent(row.targetWeight)}</span>
            <strong className={Math.abs(row.deviation) < 0.01 ? '' : row.deviation > 0 ? 'negativeText' : 'positiveText'}>{formatPercentagePoints(row.deviation)}</strong>
            <span className={row.rebalanceAmount >= 0 ? 'positiveText' : 'negativeText'}>{formatSignedMoney(row.rebalanceAmount)}</span>
            <span>{row.contributionAmount == null ? 'Niemożliwe' : formatMoney(row.contributionAmount)}</span>
          </div>)}
        </div>
        <div className="rebalanceHint">
          <strong>Wariant bez sprzedaży:</strong>
          <span>{Number.isFinite(contributionOnlyTotal) ? `dopłać łącznie ${formatMoney(contributionOnlyTotal)}, dzieląc kwotę zgodnie z ostatnią kolumną.` : 'nie można osiągnąć celu samymi wpłatami, dopóki klasa z wagą 0% ma dodatnią wartość.'}</span>
        </div>
      </>}
    </section>
  );
}

function buildStockAllocation(entries, targetAllocations) {
  const latestBySubcategory = STOCK_SUBCATEGORIES.reduce((result, subcategory) => ({
    ...result,
    [subcategory]: null
  }), {});

  entries
    .filter((entry) => entry.type === 'GIELDA' && STOCK_SUBCATEGORIES.includes(entry.subcategory))
    .forEach((entry) => {
      const current = latestBySubcategory[entry.subcategory];
      if (isNewerEntry(entry, current)) {
        latestBySubcategory[entry.subcategory] = entry;
      }
    });

  const total = Object.values(latestBySubcategory).reduce((sum, entry) => sum + Number(entry?.valuePln || 0), 0);
  const rows = STOCK_SUBCATEGORIES.map((subcategory) => {
    const currentValue = Number(latestBySubcategory[subcategory]?.valuePln || 0);
    const targetWeight = targetAllocations[subcategory];
    const targetValue = total * (targetWeight / 100);
    const difference = targetValue - currentValue;
    const divergencePercent = targetValue > 0 ? (difference / targetValue) * 100 : null;
    const currentWeight = total > 0 ? (currentValue / total) * 100 : 0;

    return {
      subcategory,
      currentValue,
      targetWeight,
      targetValue,
      difference,
      divergencePercent,
      currentWeight,
      latestDate: latestBySubcategory[subcategory]?.date || null
    };
  });

  return { total, rows };
}

function StockAllocationPanel({ entries, onAddStockValue }) {
  const [virtualContribution, setVirtualContribution] = React.useState('');
  const [targetAllocations, setTargetAllocations] = React.useState(loadStoredStockAllocations);
  const allocation = React.useMemo(() => buildStockAllocation(entries, targetAllocations), [entries, targetAllocations]);
  const targetAllocationTotal = allocationTotal(targetAllocations);
  const isAllocationValid = Math.abs(targetAllocationTotal - 100) < 0.001;

  React.useEffect(() => {
    localStorage.setItem(STOCK_ALLOCATION_STORAGE_KEY, JSON.stringify(targetAllocations));
  }, [targetAllocations]);

  function changeTargetAllocation(subcategory, value) {
    setTargetAllocations((current) => ({
      ...current,
      [subcategory]: value === '' ? 0 : Number(value)
    }));
  }

  function resetTargetAllocations() {
    setTargetAllocations(normalizeStockAllocations(DEFAULT_STOCK_TARGET_ALLOCATIONS));
  }
  const contributionAmount = Number(virtualContribution || 0);
  const projectedTotal = allocation.total + contributionAmount;
  const contributionRows = allocation.rows.map((row) => {
    const targetValueAfterContribution = projectedTotal * (row.targetWeight / 100);
    const amountToAdd = targetValueAfterContribution - row.currentValue;

    return {
      ...row,
      targetValueAfterContribution,
      amountToAdd
    };
  });
  const contributionHasOverweight = contributionRows.some((row) => row.amountToAdd < -0.005);
  const totalPositiveContribution = contributionRows.reduce((sum, row) => sum + Math.max(row.amountToAdd, 0), 0);
  const underweightRows = allocation.rows.filter((row) => row.difference > 0.005).sort((first, second) => second.difference - first.difference);

  return (
    <section className="panel stockPanel">
      <div className="stockHeader">
        <div>
          <p className="eyebrow">Giełda — rebalancing ETF</p>
          <h2>Docelowy podział: {formatAllocationHeadline(targetAllocations)}</h2>
          <p>Panel używa najnowszej wartości każdej podkategorii Giełdy, więc możesz regularnie dopisywać aktualne wyceny ETF bez nadpisywania historii.</p>
        </div>
        <div className="stockTotal"><span>Aktualna wartość ETF</span><strong>{formatMoney(allocation.total)}</strong></div>
      </div>

      <div className="allocationEditor">
        <div>
          <p className="eyebrow">Wagi ETF</p>
          <h3>Zmień docelowy udział każdej pozycji</h3>
          <p>Wpisz dowolne wartości procentowe, np. 50% złota i po 25% dla pozostałych ETF. Suma wag powinna wynosić 100%.</p>
        </div>
        <div className="allocationInputs">
          {STOCK_SUBCATEGORIES.map((subcategory) => (
            <label key={subcategory}>{SUBCATEGORY_LABELS[subcategory]}
              <input min="0" max="100" step="0.01" type="number" value={targetAllocations[subcategory]} onChange={(event) => changeTargetAllocation(subcategory, event.target.value)} />
            </label>
          ))}
        </div>
        <div className={isAllocationValid ? 'allocationStatus valid' : 'allocationStatus invalid'}>
          <span>Suma wag: {formatUnsignedPercent(targetAllocationTotal)}</span>
          {!isAllocationValid && <strong>Ustaw łącznie 100%, aby plan był poprawny.</strong>}
          <button className="subtypeTab" type="button" onClick={resetTargetAllocations}>Przywróć 40/30/30</button>
        </div>
      </div>

      {allocation.total === 0 ? <p>Dodaj pierwsze wartości dla trzech ETF w typie „Giełda”, aby zobaczyć odchylenia od planu.</p> : (
        <>
          <div className="stockTable" role="table" aria-label="Docelowa alokacja giełdowa">
            <div className="stockTableHeader" role="row">
              <span>ETF</span><span>Obecnie</span><span>Powinno być</span><span>Różnica</span><span>Udział</span><span>Odchylenie</span>
            </div>
            {allocation.rows.map((row) => (
              <div className={row.difference >= 0 ? 'stockRow buy' : 'stockRow trim'} role="row" key={row.subcategory}>
                <div><strong>{SUBCATEGORY_LABELS[row.subcategory]}</strong><small>{row.latestDate ? `Aktualizacja: ${row.latestDate}` : 'Brak wpisu'}</small></div>
                <span>{formatMoney(row.currentValue)}</span>
                <span>{formatMoney(row.targetValue)}</span>
                <strong>{formatSignedMoney(row.difference)}</strong>
                <span>{formatUnsignedPercent(row.currentWeight)} / {row.targetWeight}%</span>
                <span>{formatPercent(row.divergencePercent)}</span>
              </div>
            ))}
          </div>
          <div className="rebalanceHint">
            <strong>Co kupić teraz?</strong>
            {underweightRows.length === 0 ? <span>Portfel jest powyżej lub bardzo blisko celu dla każdej pozycji.</span> : (
              <span>Największe niedoważenie: {underweightRows.map((row) => `${SUBCATEGORY_LABELS[row.subcategory]} (${formatMoney(row.difference)})`).join(', ')}.</span>
            )}
          </div>

          <div className="virtualContribution">
            <div>
              <p className="eyebrow">Wirtualna dopłata</p>
              <h3>Jak podzielić nową kwotę między ETF?</h3>
              <p>Wpisana kwota służy tylko do symulacji zakupów i nie powiększa aktualnej wartości portfela, dopóki nie zapiszesz nowych stanów ETF.</p>
            </div>
            <label>Kwota do dodania w PLN
              <input min="0" step="0.01" type="number" value={virtualContribution} onChange={(event) => setVirtualContribution(event.target.value)} placeholder="np. 20000" />
            </label>
            {contributionAmount > 0 && (
              <div className="contributionTable" role="table" aria-label="Plan podziału wirtualnej dopłaty">
                <div className="contributionHeader" role="row">
                  <span>ETF</span><span>Dodać</span><span>Stan po dopłacie</span><span>Docelowy udział</span>
                </div>
                {contributionRows.map((row) => (
                  <div className={row.amountToAdd >= 0 ? 'contributionRow buy' : 'contributionRow trim'} role="row" key={row.subcategory}>
                    <strong>{SUBCATEGORY_LABELS[row.subcategory]}</strong>
                    <span>{formatSignedMoney(row.amountToAdd)}</span>
                    <span>{formatMoney(row.currentValue + Math.max(row.amountToAdd, 0))}</span>
                    <span>{row.targetWeight}%</span>
                  </div>
                ))}
              </div>
            )}
            {contributionAmount > 0 && contributionHasOverweight && (
              <p className="warningText">Aby idealnie zachować wagi po dopłacie {formatMoney(contributionAmount)}, jedna z pozycji musiałaby zostać zmniejszona. Jeśli kupujesz tylko za nową kwotę, dodatnie rekomendacje sumują się do {formatMoney(totalPositiveContribution)}.</p>
            )}
          </div>
        </>
      )}

      <div className="quickStockActions" aria-label="Szybkie dodawanie ETF">
        {STOCK_SUBCATEGORIES.map((subcategory) => (
          <button className="subtypeTab" type="button" key={subcategory} onClick={() => onAddStockValue(subcategory)}>
            Dodaj wycenę: {SUBCATEGORY_LABELS[subcategory]}
          </button>
        ))}
      </div>
    </section>
  );
}

function SummaryChart({ entries, types }) {
  const [selectedType, setSelectedType] = React.useState('ALL');
  const [period, setPeriod] = React.useState('monthly');
  const filteredEntries = selectedType === 'ALL' ? entries : entries.filter((entry) => entry.type === selectedType);
  const points = buildSummary(filteredEntries, period);
  const latestPoint = points[points.length - 1];
  const maxTotal = Math.max(...points.map((point) => point.total), 0);
  const chartWidth = 760;
  const chartHeight = 300;
  const padding = { top: 22, right: 24, bottom: 58, left: 62 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const barGap = 14;
  const barWidth = points.length ? Math.max(18, (innerWidth - barGap * (points.length - 1)) / points.length) : 0;

  return (
    <section className="panel graphPanel">
      <div className="graphHeader">
        <div>
          <p className="eyebrow">Analiza wzrostu</p>
          <h2>Miesięczne i roczne podsumowanie inwestycji</h2>
        </div>
        <div className="graphControls">
          <label>Zakres inwestycji
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              <option value="ALL">Wszystkie inwestycje</option>
              {types.map((type) => <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>)}
            </select>
          </label>
          <label>Okres
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="monthly">Miesięcznie</option>
              <option value="yearly">Rocznie</option>
            </select>
          </label>
        </div>
      </div>

      <div className="metricGrid">
        <div className="metricCard"><span>Aktualna suma</span><strong>{formatMoney(latestPoint?.total || 0)}</strong></div>
        <div className={latestPoint?.changeAmount >= 0 ? 'metricCard positive' : 'metricCard negative'}><span>Zmiana kwotowa</span><strong>{formatMoney(latestPoint?.changeAmount || 0)}</strong></div>
        <div className={latestPoint?.changePercent >= 0 ? 'metricCard positive' : 'metricCard negative'}><span>Zmiana procentowa</span><strong>{formatPercent(latestPoint?.changePercent)}</strong></div>
      </div>

      {points.length === 0 ? <p>Brak danych do narysowania wykresu dla wybranego zakresu.</p> : (
        <div className="chartScroller" role="img" aria-label="Wykres słupkowy podsumowania inwestycji">
          <svg className="summaryChart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3f9d63" />
                <stop offset="100%" stopColor="#173d27" />
              </linearGradient>
            </defs>
            <line x1={padding.left} x2={chartWidth - padding.right} y1={chartHeight - padding.bottom} y2={chartHeight - padding.bottom} />
            {points.map((point, index) => {
              const height = maxTotal ? (point.total / maxTotal) * innerHeight : 0;
              const x = padding.left + index * (barWidth + barGap);
              const y = padding.top + innerHeight - height;
              return (
                <g key={point.key}>
                  <rect className="chartBar" x={x} y={y} width={barWidth} height={height} rx="8" />
                  <text className="chartValue" x={x + barWidth / 2} y={Math.max(18, y - 8)} textAnchor="middle">{formatMoney(point.total)}</text>
                  <text className={point.changeAmount >= 0 ? 'chartChange positiveText' : 'chartChange negativeText'} x={x + barWidth / 2} y={chartHeight - 34} textAnchor="middle">{formatPercent(point.changePercent)}</text>
                  <text className="chartLabel" x={x + barWidth / 2} y={chartHeight - 12} textAnchor="middle">{point.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

function subcategoriesFor(type) {
  return SUBCATEGORIES_BY_TYPE[type] || [];
}

function Home() {
  const [users, setUsers] = React.useState(FALLBACK_USERS);
  const [selectedUser, setSelectedUser] = React.useState(() => localStorage.getItem(USER_STORAGE_KEY) || FALLBACK_USERS[0]);
  const [types, setTypes] = React.useState([]);
  const [entries, setEntries] = React.useState([]);
  const [graphEntries, setGraphEntries] = React.useState([]);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [subcategoryFilter, setSubcategoryFilter] = React.useState('');
  const [form, setForm] = React.useState({ type: '', subcategory: '', valuePln: '', date: today() });
  const [editingId, setEditingId] = React.useState(null);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [operations, setOperations] = React.useState([]);
  const [performance, setPerformance] = React.useState(null);
  const [operationForm, setOperationForm] = React.useState({ operationType: 'DEPOSIT', type: '', subcategory: '', amountPln: '', feePln: '', taxPln: '', date: today(), note: '' });
  const importInputRef = React.useRef(null);

  const loadGraphEntries = React.useCallback(() => {
    const params = new URLSearchParams({ owner: selectedUser });
    return fetch(`/api/investments?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(setGraphEntries);
  }, [selectedUser]);

  const loadEntries = React.useCallback(() => {
    const params = new URLSearchParams({ owner: selectedUser });
    if (typeFilter) params.set('type', typeFilter);
    if (typeFilter && subcategoryFilter) params.set('subcategory', subcategoryFilter);

    return fetch(`/api/investments?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(setEntries);
  }, [selectedUser, typeFilter, subcategoryFilter]);

  const loadOperations = React.useCallback(() => {
    const params = new URLSearchParams({ owner: selectedUser });
    if (typeFilter) params.set('type', typeFilter);
    if (typeFilter && subcategoryFilter) params.set('subcategory', subcategoryFilter);
    return Promise.all([
      fetch(`/api/investment-operations?${params}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))),
      fetch(`/api/portfolio-performance?${params}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
    ]).then(([loadedOperations, loadedPerformance]) => {
      setOperations(loadedOperations);
      setPerformance(loadedPerformance);
    });
  }, [selectedUser, typeFilter, subcategoryFilter]);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/users').then((response) => response.json()),
      fetch('/api/investment-types').then((response) => response.json())
    ])
      .then(([loadedUsers, loadedTypes]) => {
        const firstType = loadedTypes[0] || '';
        setUsers(loadedUsers);
        setTypes(loadedTypes);
        setTypeFilter(firstType);
        setForm((current) => ({
          ...current,
          type: current.type || firstType,
          subcategory: subcategoriesFor(current.type || firstType)[0] || ''
        }));
        setOperationForm((current) => ({ ...current, type: current.type || firstType, subcategory: subcategoriesFor(current.type || firstType)[0] || '' }));
        if (!loadedUsers.includes(selectedUser)) setSelectedUser(loadedUsers[0]);
      })
      .catch((fetchError) => setError(fetchError.message));
  }, []);

  React.useEffect(() => {
    localStorage.setItem(USER_STORAGE_KEY, selectedUser);
    setStatus('');
    Promise.all([loadEntries(), loadGraphEntries(), loadOperations()]).catch((fetchError) => setError(fetchError.message));
  }, [selectedUser, typeFilter, subcategoryFilter, loadEntries, loadGraphEntries, loadOperations]);

  const currentEntries = buildCurrentSnapshot(graphEntries);
  const currentEntriesForView = typeFilter ? currentEntries.filter((entry) => entry.type === typeFilter) : currentEntries;
  const totalsByType = currentEntries.reduce((totals, entry) => {
    totals[entry.type] = (totals[entry.type] || 0) + Number(entry.valuePln);
    return totals;
  }, {});
  const totalValue = currentEntriesForView.reduce((sum, entry) => sum + Number(entry.valuePln), 0);
  const currentSubcategories = subcategoriesFor(form.type);
  const filterSubcategories = subcategoriesFor(typeFilter);

  function changeType(nextType) {
    const nextSubcategories = subcategoriesFor(nextType);
    setTypeFilter(nextType);
    setSubcategoryFilter('');
    setForm((current) => ({ ...current, type: nextType, subcategory: nextSubcategories[0] || '' }));
    setEditingId(null);
  }


  function exportDatabase() {
    setError('');
    setStatus('Przygotowywanie eksportu...');

    fetch('/api/database/export')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
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
        setStatus('');
        setError(fetchError.message);
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

    const payload = new FormData();
    payload.append('file', file);
    setError('');
    setStatus('Importowanie bazy danych...');

    fetch('/api/database/import', {
      method: 'POST',
      body: payload
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStatus('Zaimportowano bazę danych i odświeżono widok.');
        return Promise.all([loadEntries(), loadGraphEntries()]);
      })
      .catch((fetchError) => {
        setStatus('');
        setError(fetchError.message);
      });
  }

  function submitEntry(event) {
    event.preventDefault();
    setError('');
    setStatus('Zapisywanie...');
    const payload = {
      ...form,
      owner: selectedUser,
      subcategory: currentSubcategories.length ? form.subcategory : null,
      valuePln: Number(form.valuePln)
    };

    fetch(editingId ? `/api/investments/${editingId}` : '/api/investments', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(() => {
        setForm((current) => ({ ...current, valuePln: '', date: current.date || today() }));
        setStatus(editingId ? 'Zapisano zmiany we wpisie.' : `Zapisano stan dla: ${displayName(selectedUser)}.`);
        setEditingId(null);
        return Promise.all([loadEntries(), loadGraphEntries()]);
      })
      .catch((fetchError) => {
        setStatus('');
        setError(fetchError.message);
      });
  }

  function editEntry(entry) {
    setEditingId(entry.id);
    setForm({
      type: entry.type,
      subcategory: entry.subcategory || '',
      valuePln: String(entry.valuePln),
      date: entry.date
    });
    setStatus('Edytujesz istniejący wpis. Zapisz zmiany lub anuluj.');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm((current) => ({ ...current, valuePln: '', date: today() }));
    setStatus('Anulowano edycję wpisu.');
  }

  function prepareStockEntry(subcategory) {
    setForm((current) => ({ ...current, type: 'GIELDA', subcategory, valuePln: '', date: today() }));
    setTypeFilter('GIELDA');
    setSubcategoryFilter(subcategory);
    setStatus(`Wpisz aktualną wartość ETF: ${SUBCATEGORY_LABELS[subcategory]}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteEntry(id) {
    fetch(`/api/investments/${id}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStatus('Usunięto wpis.');
        return Promise.all([loadEntries(), loadGraphEntries()]);
      })
      .catch((fetchError) => setError(fetchError.message));
  }

  function submitOperation(event) {
    event.preventDefault();
    const operationSubcategories = subcategoriesFor(operationForm.type);
    const payload = { ...operationForm, owner: selectedUser,
      subcategory: operationSubcategories.length ? operationForm.subcategory : null,
      amountPln: Number(operationForm.amountPln), feePln: Number(operationForm.feePln || 0), taxPln: Number(operationForm.taxPln || 0) };
    setError('');
    fetch('/api/investment-operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(() => { setOperationForm((current) => ({ ...current, amountPln: '', feePln: '', taxPln: '', note: '' })); setStatus('Zapisano operację.'); return loadOperations(); })
      .catch((fetchError) => setError(fetchError.message));
  }

  function deleteOperation(id) {
    fetch(`/api/investment-operations/${id}`, { method: 'DELETE' })
      .then((response) => response.ok ? loadOperations() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .catch((fetchError) => setError(fetchError.message));
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Twój finansowy pulpit</p>
        <h1>Oszczędności pod kontrolą.</h1>
        <p>Sprawdzaj wartość portfela, aktualizuj wyceny i pilnuj przyjętego planu — wszystko w jednym, czytelnym miejscu.</p>
      </section>

      <section className="controlSurface" aria-label="Ustawienia widoku portfela">
        <div className="filterGroup">
          <p className="filterLabel">Czyj portfel wyświetlić?</p>
          <div className="userSwitcher" aria-label="Wybór użytkownika">
            {users.map((user) => (
              <button className={user === selectedUser ? 'userPill active' : 'userPill'} key={user} type="button" onClick={() => setSelectedUser(user)}>
                <span className="userAvatar" aria-hidden="true">{displayName(user).charAt(0)}</span>{displayName(user)}
              </button>
            ))}
          </div>
        </div>
        <div className="filterGroup">
          <p className="filterLabel">Rodzaj inwestycji</p>
          <div className="typeNav" aria-label="Rodzaje inwestycji">
            {types.map((type) => (
              <button className={type === typeFilter ? 'typeTab active' : 'typeTab'} key={type} type="button" onClick={() => changeType(type)}>
                {TYPE_LABELS[type] || type}
              </button>
            ))}
          </div>
          {filterSubcategories.length > 0 && (
            <div className="subtypeNav" aria-label="Podkategorie inwestycji">
              <button className={!subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'} type="button" onClick={() => setSubcategoryFilter('')}>Wszystkie</button>
              {filterSubcategories.map((subcategory) => (
                <button className={subcategory === subcategoryFilter ? 'subtypeTab active' : 'subtypeTab'} key={subcategory} type="button" onClick={() => setSubcategoryFilter(subcategory)}>
                  {SUBCATEGORY_LABELS[subcategory] || subcategory}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dashboardGrid">
        <article className="panel summaryPanel">
          <p className="eyebrow">Aktualny widok</p>
          <h2>{displayName(selectedUser)} — {typeFilter ? TYPE_LABELS[typeFilter] : 'wszystkie inwestycje'}</h2>
          <p className="totalValue">{formatMoney(totalValue)}</p>
          <div className="summaryGrid">
            {types.map((type) => <div className="summaryCard" key={type}><span>{TYPE_LABELS[type] || type}</span><strong>{formatMoney(totalsByType[type] || 0)}</strong></div>)}
          </div>
        </article>

        <form className={`panel formPanel${editingId ? ' editing' : ''}`} onSubmit={submitEntry}>
          <h2>{editingId ? 'Edytuj wpis' : 'Dodaj aktualny stan'} dla: {displayName(selectedUser)}</h2>
          <label>Typ inwestycji
            <select value={form.type} onChange={(event) => {
              const nextType = event.target.value;
              setForm({ ...form, type: nextType, subcategory: subcategoriesFor(nextType)[0] || '' });
            }} required>
              {types.map((type) => <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>)}
            </select>
          </label>
          {currentSubcategories.length > 0 && <label>Podkategoria
            <select value={form.subcategory} onChange={(event) => setForm({ ...form, subcategory: event.target.value })} required>
              {currentSubcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{SUBCATEGORY_LABELS[subcategory] || subcategory}</option>)}
            </select>
          </label>}
          <label>Aktualny stan w PLN
            <input min="0.01" step="0.01" type="number" value={form.valuePln} onChange={(event) => setForm({ ...form, valuePln: event.target.value })} required />
          </label>
          <label>Data wpisu
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
          </label>
          <div className="formActions">
            <button className="button primaryButton" type="submit">{editingId ? 'Zapisz zmiany' : 'Zapisz stan portfela'}</button>
            {editingId && <button className="button secondaryButton" type="button" onClick={cancelEditing}>Anuluj</button>}
          </div>
          {status && <p className="success">{status}</p>}
          {error && <p className="error">Nie udało się wykonać operacji: {error}</p>}
        </form>
      </section>

      <section className="panel performancePanel">
        <div><p className="eyebrow">Wynik inwestycyjny</p><h2>Wartość oddzielona od przepływów pieniężnych</h2></div>
        {!performance ? <p>Ładowanie wyniku…</p> : <div className="performanceGrid">
          <div><span>Kapitał wpłacony netto</span><strong>{formatMoney(performance.contributedCapitalPln)}</strong></div>
          <div><span>Wynik nominalny</span><strong className={Number(performance.nominalResultPln) >= 0 ? 'positiveText' : 'negativeText'}>{formatSignedMoney(performance.nominalResultPln)}</strong></div>
          <div><span>Stopa zwrotu</span><strong>{formatPercent(performance.returnRatePercent == null ? NaN : Number(performance.returnRatePercent))}</strong></div>
          <div><span>Po opłatach i podatkach</span><strong>{formatSignedMoney(performance.resultAfterFeesAndTaxesPln)}</strong></div>
          <div><span>Opłaty / podatki</span><strong>{formatMoney(performance.feesPln)} / {formatMoney(performance.taxesPln)}</strong></div>
          <div><span>XIRR</span><strong>{formatPercent(performance.xirrPercent == null ? NaN : Number(performance.xirrPercent))}</strong></div>
        </div>}
      </section>

      <section className="operationsGrid">
        <form className="panel formPanel" onSubmit={submitOperation}>
          <p className="eyebrow">Przepływy i transakcje</p><h2>Dodaj operację dla: {displayName(selectedUser)}</h2>
          <label>Operacja<select value={operationForm.operationType} onChange={(event) => setOperationForm({ ...operationForm, operationType: event.target.value })}>{Object.entries(OPERATION_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Aktywo<select value={operationForm.type} onChange={(event) => { const type = event.target.value; setOperationForm({ ...operationForm, type, subcategory: subcategoriesFor(type)[0] || '' }); }}>{types.map((type) => <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>)}</select></label>
          {subcategoriesFor(operationForm.type).length > 0 && <label>Podkategoria<select value={operationForm.subcategory} onChange={(event) => setOperationForm({ ...operationForm, subcategory: event.target.value })}>{subcategoriesFor(operationForm.type).map((value) => <option key={value} value={value}>{SUBCATEGORY_LABELS[value]}</option>)}</select></label>}
          <label>Kwota PLN<input type="number" min="0.01" step="0.01" required value={operationForm.amountPln} onChange={(event) => setOperationForm({ ...operationForm, amountPln: event.target.value })} /></label>
          <div className="inlineFields"><label>Opłata<input type="number" min="0" step="0.01" value={operationForm.feePln} onChange={(event) => setOperationForm({ ...operationForm, feePln: event.target.value })} /></label><label>Podatek<input type="number" min="0" step="0.01" value={operationForm.taxPln} onChange={(event) => setOperationForm({ ...operationForm, taxPln: event.target.value })} /></label></div>
          <label>Data<input type="date" required value={operationForm.date} onChange={(event) => setOperationForm({ ...operationForm, date: event.target.value })} /></label>
          <label>Notatka<input maxLength="250" value={operationForm.note} onChange={(event) => setOperationForm({ ...operationForm, note: event.target.value })} /></label>
          <button className="button primaryButton" type="submit">Zapisz operację</button>
        </form>
        <section className="panel entriesPanel operationList"><h2>Historia operacji</h2>{operations.length === 0 ? <p>Brak operacji w tym widoku.</p> : operations.map((operation) => <div className="entryRow" key={operation.id}><div><strong>{OPERATION_LABELS[operation.operationType]}</strong><span>{TYPE_LABELS[operation.type]}{operation.subcategory ? ` · ${SUBCATEGORY_LABELS[operation.subcategory]}` : ''} · {operation.date}</span><small>{operation.note}</small></div><strong>{formatMoney(operation.amountPln)}</strong><button type="button" onClick={() => deleteOperation(operation.id)}>Usuń</button></div>)}</section>
      </section>

      <GlobalAllocationPanel entries={graphEntries} />

      {types.includes('GIELDA') && <StockAllocationPanel entries={graphEntries} onAddStockValue={prepareStockEntry} />}

      <SummaryChart entries={graphEntries} types={types} />

      <section className="panel entriesPanel">
        <div className="entriesHeader"><h2>Wpisy: {displayName(selectedUser)}</h2></div>
        {graphEntries.length === 0 ? <p>Brak wpisów dla wybranej osoby.</p> : (
          <div className="entryList">
            {graphEntries.map((entry) => <div className="entryRow" key={entry.id}>
              <div><strong>{TYPE_LABELS[entry.type] || entry.type}</strong><span>{entry.subcategory ? SUBCATEGORY_LABELS[entry.subcategory] : 'Bez podkategorii'} · {entry.date}</span>{entry.updatedAt && <small>Ostatnia modyfikacja: {formatDateTime(entry.updatedAt)}</small>}</div>
              <strong>{formatMoney(entry.valuePln)}</strong>
              <div className="entryActions">
                <button className="editButton" type="button" onClick={() => editEntry(entry)}>Edytuj</button>
                <button type="button" onClick={() => deleteEntry(entry.id)}>Usuń</button>
              </div>
            </div>)}
          </div>
        )}
      </section>

      <section className="panel databasePanel">
        <div>
          <p className="eyebrow">Kopia bezpieczeństwa</p>
          <h2>Eksport i import danych</h2>
          <p>Pobierz aktualny plik bazy danych lub wgraj wcześniej wyeksportowany plik. Import nadpisuje całą obecną bazę.</p>
        </div>
        <div className="databaseActions">
          <button className="button secondaryButton" type="button" onClick={exportDatabase}>Eksportuj bazę</button>
          <button className="button dangerButton" type="button" onClick={chooseImportFile}>Importuj i nadpisz</button>
          <input ref={importInputRef} className="visuallyHidden" type="file" accept="application/json,.json" onChange={importDatabase} />
        </div>
      </section>
    </main>
  );
}

function About() {
  return <main className="page"><section className="hero heroCompact"><p className="eyebrow">Informacje</p><h1>Portfele bez logowania.</h1><p>Wybór użytkownika filtruje i dodaje wpisy dla konkretnej osoby.</p></section></main>;
}

function NotFound() {
  return <main className="page"><section className="panel"><h1>Nie znaleziono strony</h1><p>Wróć na stronę główną i spróbuj ponownie.</p><Link className="button" to="/">Strona główna</Link></section></main>;
}

function App() {
  return (
    <BrowserRouter>
      <header className="siteHeader"><div className="topbar"><Link className="brand" to="/"><span className="brandMark" aria-hidden="true">O</span><span>Oszczędności<small>Twój portfel</small></span></Link><nav aria-label="Główne"><NavLink to="/" end>Portfele</NavLink><NavLink to="/about">Informacje</NavLink></nav></div></header>
      <Routes><Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="*" element={<NotFound />} /></Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

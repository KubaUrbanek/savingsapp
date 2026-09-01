import React from 'react';
import { DEFAULT_GLOBAL_TARGET_ALLOCATIONS, GLOBAL_ASSET_CLASSES } from '../../domain/portfolio/constants.js';
import { buildGlobalAllocation } from '../../domain/portfolio/allocation.js';
import { formatMoney, formatPercent, formatSignedMoney, formatUnsignedPercent, formatPercentagePoints, SUBCATEGORY_LABELS, GLOBAL_ASSET_LABELS } from '../viewModels/formatters.js';

export function GlobalAllocationPanel({ entries, preferences, onPreferenceError }) {
  const [targets, setTargets] = React.useState(() => preferences.globalAllocation());
  const { investedTotal, cashTotal, contributionOnlyTotal, rows } = React.useMemo(() => buildGlobalAllocation(entries, targets), [entries, targets]);
  const targetTotal = GLOBAL_ASSET_CLASSES.reduce((sum, assetClass) => sum + Number(targets[assetClass] || 0), 0);
  const isValid = Math.abs(targetTotal - 100) < 0.001;

  React.useEffect(() => {
    try { preferences.changeGlobalAllocation(targets); } catch (error) { onPreferenceError(error); }
  }, [targets, preferences, onPreferenceError]);




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

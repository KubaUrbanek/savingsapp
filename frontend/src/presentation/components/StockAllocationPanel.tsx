// @ts-nocheck
import React from 'react';
import { DEFAULT_STOCK_TARGET_ALLOCATIONS, STOCK_SUBCATEGORIES } from '../../domain/portfolio/constants.js';
import { allocationTotal, buildStockAllocation } from '../../domain/portfolio/allocation.js';
import {
  formatMoney,
  formatPercent,
  formatSignedMoney,
  formatUnsignedPercent,
  formatPercentagePoints,
  SUBCATEGORY_LABELS,
  GLOBAL_ASSET_LABELS
} from '../viewModels/formatters.js';

export function StockAllocationPanel({ entries, onAddStockValue, preferences, onPreferenceError }) {
  const [virtualContribution, setVirtualContribution] = React.useState('');
  const [targetAllocations, setTargetAllocations] = React.useState(() => preferences.stockAllocation());
  const allocation = React.useMemo(
    () => buildStockAllocation(entries, targetAllocations),
    [entries, targetAllocations]
  );
  const targetAllocationTotal = allocationTotal(targetAllocations);
  const isAllocationValid = Math.abs(targetAllocationTotal - 100) < 0.001;

  React.useEffect(() => {
    try {
      preferences.changeStockAllocation(targetAllocations);
    } catch (error) {
      onPreferenceError(error);
    }
  }, [targetAllocations, preferences, onPreferenceError]);

  function changeTargetAllocation(subcategory, value) {
    setTargetAllocations((current) => ({
      ...current,
      [subcategory]: value === '' ? 0 : Number(value)
    }));
  }

  function resetTargetAllocations() {
    setTargetAllocations({ ...DEFAULT_STOCK_TARGET_ALLOCATIONS });
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
  const underweightRows = allocation.rows
    .filter((row) => row.difference > 0.005)
    .sort((first, second) => second.difference - first.difference);

  return (
    <section className="panel stockPanel">
      <div className="stockHeader">
        <div>
          <p className="eyebrow">Giełda — rebalancing ETF</p>
          <h2>Docelowy podział: {formatAllocationHeadline(targetAllocations)}</h2>
          <p>
            Panel używa najnowszej wartości każdej podkategorii Giełdy, więc możesz regularnie dopisywać aktualne wyceny
            ETF bez nadpisywania historii.
          </p>
        </div>
        <div className="stockTotal">
          <span>Aktualna wartość ETF</span>
          <strong>{formatMoney(allocation.total)}</strong>
        </div>
      </div>

      <div className="allocationEditor">
        <div>
          <p className="eyebrow">Wagi ETF</p>
          <h3>Zmień docelowy udział każdej pozycji</h3>
          <p>
            Wpisz dowolne wartości procentowe, np. 50% złota i po 25% dla pozostałych ETF. Suma wag powinna wynosić
            100%.
          </p>
        </div>
        <div className="allocationInputs">
          {STOCK_SUBCATEGORIES.map((subcategory) => (
            <label key={subcategory}>
              {SUBCATEGORY_LABELS[subcategory]}
              <input
                min="0"
                max="100"
                step="0.01"
                type="number"
                value={targetAllocations[subcategory]}
                onChange={(event) => changeTargetAllocation(subcategory, event.target.value)}
              />
            </label>
          ))}
        </div>
        <div className={isAllocationValid ? 'allocationStatus valid' : 'allocationStatus invalid'}>
          <span>Suma wag: {formatUnsignedPercent(targetAllocationTotal)}</span>
          {!isAllocationValid && <strong>Ustaw łącznie 100%, aby plan był poprawny.</strong>}
          <button className="subtypeTab" type="button" onClick={resetTargetAllocations}>
            Przywróć 40/30/30
          </button>
        </div>
      </div>

      {allocation.total === 0 ? (
        <p>Dodaj pierwsze wartości dla trzech ETF w typie „Giełda”, aby zobaczyć odchylenia od planu.</p>
      ) : (
        <>
          <div className="stockTable" role="table" aria-label="Docelowa alokacja giełdowa">
            <div className="stockTableHeader" role="row">
              <span>ETF</span>
              <span>Obecnie</span>
              <span>Powinno być</span>
              <span>Różnica</span>
              <span>Udział</span>
              <span>Odchylenie</span>
            </div>
            {allocation.rows.map((row) => (
              <div className={row.difference >= 0 ? 'stockRow buy' : 'stockRow trim'} role="row" key={row.subcategory}>
                <div>
                  <strong>{SUBCATEGORY_LABELS[row.subcategory]}</strong>
                  <small>{row.latestDate ? `Aktualizacja: ${row.latestDate}` : 'Brak wpisu'}</small>
                </div>
                <span>{formatMoney(row.currentValue)}</span>
                <span>{formatMoney(row.targetValue)}</span>
                <strong>{formatSignedMoney(row.difference)}</strong>
                <span>
                  {formatUnsignedPercent(row.currentWeight)} / {row.targetWeight}%
                </span>
                <span>{formatPercent(row.divergencePercent)}</span>
              </div>
            ))}
          </div>
          <div className="rebalanceHint">
            <strong>Co kupić teraz?</strong>
            {underweightRows.length === 0 ? (
              <span>Portfel jest powyżej lub bardzo blisko celu dla każdej pozycji.</span>
            ) : (
              <span>
                Największe niedoważenie:{' '}
                {underweightRows
                  .map((row) => `${SUBCATEGORY_LABELS[row.subcategory]} (${formatMoney(row.difference)})`)
                  .join(', ')}
                .
              </span>
            )}
          </div>

          <div className="virtualContribution">
            <div>
              <p className="eyebrow">Wirtualna dopłata</p>
              <h3>Jak podzielić nową kwotę między ETF?</h3>
              <p>
                Wpisana kwota służy tylko do symulacji zakupów i nie powiększa aktualnej wartości portfela, dopóki nie
                zapiszesz nowych stanów ETF.
              </p>
            </div>
            <label>
              Kwota do dodania w PLN
              <input
                min="0"
                step="0.01"
                type="number"
                value={virtualContribution}
                onChange={(event) => setVirtualContribution(event.target.value)}
                placeholder="np. 20000"
              />
            </label>
            {contributionAmount > 0 && (
              <div className="contributionTable" role="table" aria-label="Plan podziału wirtualnej dopłaty">
                <div className="contributionHeader" role="row">
                  <span>ETF</span>
                  <span>Dodać</span>
                  <span>Stan po dopłacie</span>
                  <span>Docelowy udział</span>
                </div>
                {contributionRows.map((row) => (
                  <div
                    className={row.amountToAdd >= 0 ? 'contributionRow buy' : 'contributionRow trim'}
                    role="row"
                    key={row.subcategory}
                  >
                    <strong>{SUBCATEGORY_LABELS[row.subcategory]}</strong>
                    <span>{formatSignedMoney(row.amountToAdd)}</span>
                    <span>{formatMoney(row.currentValue + Math.max(row.amountToAdd, 0))}</span>
                    <span>{row.targetWeight}%</span>
                  </div>
                ))}
              </div>
            )}
            {contributionAmount > 0 && contributionHasOverweight && (
              <p className="warningText">
                Aby idealnie zachować wagi po dopłacie {formatMoney(contributionAmount)}, jedna z pozycji musiałaby
                zostać zmniejszona. Jeśli kupujesz tylko za nową kwotę, dodatnie rekomendacje sumują się do{' '}
                {formatMoney(totalPositiveContribution)}.
              </p>
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

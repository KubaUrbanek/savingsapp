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
import { Button } from './Button.jsx';
import { Field } from './Field.jsx';
import { InlineMessage } from './InlineMessage.jsx';
import { SectionHeader } from './SectionHeader.jsx';

function formatAllocationHeadline(targetAllocations) {
  return STOCK_SUBCATEGORIES.map(
    (subcategory) => `${SUBCATEGORY_LABELS[subcategory]} ${formatUnsignedPercent(targetAllocations[subcategory])}`
  ).join(' / ');
}

export function StockAllocationPanel({ entries, onAddStockValue, preferences, onPreferenceError }) {
  const allocationScrollHintId = React.useId();
  const contributionScrollHintId = React.useId();
  const [virtualContribution, setVirtualContribution] = React.useState('');
  const [targetAllocations, setTargetAllocations] = React.useState(() => preferences.stockAllocation());
  const contributionAmount = Number(virtualContribution || 0);
  const allocation = React.useMemo(
    () => buildStockAllocation(entries, targetAllocations, contributionAmount),
    [entries, targetAllocations, contributionAmount]
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
  const contributionRows = allocation.rows;
  const contributionHasOverweight = contributionRows.some((row) => row.amountToAdd < -0.005);
  const totalPositiveContribution = contributionRows.reduce((sum, row) => sum + Math.max(row.amountToAdd, 0), 0);
  const underweightRows = allocation.rows
    .filter((row) => row.difference > 0.005)
    .sort((first, second) => second.difference - first.difference);

  return (
    <section className="panel stockPanel">
      <SectionHeader
        className="stockHeader"
        eyebrow="Giełda — rebalancing ETF"
        title={<>Docelowy podział: {formatAllocationHeadline(targetAllocations)}</>}
        description={
          <>
            Panel używa najnowszej wartości każdej podkategorii Giełdy, więc możesz regularnie dopisywać aktualne wyceny
            ETF bez nadpisywania historii.
          </>
        }
        action={
          <div className="stockTotal">
            <span>Aktualna wartość ETF</span>
            <strong>{formatMoney(allocation.total)}</strong>
          </div>
        }
      />

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
            <Field
              key={subcategory}
              label={SUBCATEGORY_LABELS[subcategory]}
              control={
                <input
                  min="0"
                  max="100"
                  step="0.01"
                  type="number"
                  value={targetAllocations[subcategory]}
                  onChange={(event) => changeTargetAllocation(subcategory, event.target.value)}
                />
              }
            />
          ))}
        </div>
        <div className={isAllocationValid ? 'allocationStatus valid' : 'allocationStatus invalid'}>
          <span>Suma wag: {formatUnsignedPercent(targetAllocationTotal)}</span>
          {!isAllocationValid && (
            <InlineMessage variant="warning">Ustaw łącznie 100%, aby plan był poprawny.</InlineMessage>
          )}
          <Button variant="quiet" type="button" onClick={resetTargetAllocations}>
            Przywróć 40/30/30
          </Button>
        </div>
      </div>

      {allocation.total === 0 ? (
        <p>Dodaj pierwsze wartości dla trzech ETF w typie „Giełda”, aby zobaczyć odchylenia od planu.</p>
      ) : (
        <>
          <p className="visuallyHidden" id={allocationScrollHintId}>
            Tabela przewija się poziomo. Użyj klawiszy strzałek, aby zobaczyć pozostałe kolumny.
          </p>
          <div
            className="stockTable tableScroller"
            role="region"
            aria-label="Przewijana docelowa alokacja giełdowa"
            aria-describedby={allocationScrollHintId}
            tabIndex={0}
          >
            <table aria-label="Docelowa alokacja giełdowa">
              <thead>
                <tr>
                  <th scope="col">ETF</th>
                  <th scope="col">Obecnie</th>
                  <th scope="col">Powinno być</th>
                  <th scope="col">Różnica</th>
                  <th scope="col">Udział</th>
                  <th scope="col">Odchylenie</th>
                </tr>
              </thead>
              <tbody>
                {allocation.rows.map((row) => (
                  <tr className={row.difference >= 0 ? 'buy' : 'trim'} key={row.subcategory}>
                    <th scope="row">
                      <span className="stockRowLabel">
                        <strong>{SUBCATEGORY_LABELS[row.subcategory]}</strong>
                        <small>
                          <span aria-hidden="true">{row.difference >= 0 ? '↑ ' : '↓ '}</span>
                          {row.difference >= 0 ? 'Kup' : 'Ogranicz'}
                        </small>
                        <small>{row.latestDate ? `Aktualizacja: ${row.latestDate}` : 'Brak wpisu'}</small>
                      </span>
                    </th>
                    <td>{formatMoney(row.currentValue)}</td>
                    <td>{formatMoney(row.targetValue)}</td>
                    <td className="differenceCell">{formatSignedMoney(row.difference)}</td>
                    <td>
                      {formatUnsignedPercent(row.currentWeight)} / {row.targetWeight}%
                    </td>
                    <td>{formatPercent(row.divergencePercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobileAllocationList" aria-label="Docelowa alokacja giełdowa — widok mobilny">
            {allocation.rows.map((row) => (
              <article className={`mobileAllocationCard ${row.difference >= 0 ? 'buy' : 'trim'}`} key={row.subcategory}>
                <h3>{SUBCATEGORY_LABELS[row.subcategory]}</h3>
                <p className="mobileRecordMeta">
                  <span aria-hidden="true">{row.difference >= 0 ? '↑ ' : '↓ '}</span>
                  {row.difference >= 0 ? 'Kup' : 'Ogranicz'}
                </p>
                <p className="mobileRecordMeta">{row.latestDate ? `Aktualizacja: ${row.latestDate}` : 'Brak wpisu'}</p>
                <dl>
                  <div>
                    <dt>Obecnie</dt>
                    <dd>{formatMoney(row.currentValue)}</dd>
                  </div>
                  <div>
                    <dt>Powinno być</dt>
                    <dd>{formatMoney(row.targetValue)}</dd>
                  </div>
                  <div>
                    <dt>Różnica</dt>
                    <dd className={row.difference >= 0 ? 'positiveText' : 'negativeText'}>
                      {formatSignedMoney(row.difference)}
                    </dd>
                  </div>
                  <div>
                    <dt>Udział</dt>
                    <dd>
                      {formatUnsignedPercent(row.currentWeight)} / {row.targetWeight}%
                    </dd>
                  </div>
                  <div>
                    <dt>Odchylenie</dt>
                    <dd>{formatPercent(row.divergencePercent)}</dd>
                  </div>
                </dl>
              </article>
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
            <Field
              label="Kwota do dodania w PLN"
              control={
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={virtualContribution}
                  onChange={(event) => setVirtualContribution(event.target.value)}
                  placeholder="np. 20000"
                />
              }
            />
            {contributionAmount > 0 && (
              <>
                <p className="visuallyHidden" id={contributionScrollHintId}>
                  Tabela przewija się poziomo. Użyj klawiszy strzałek, aby zobaczyć pozostałe kolumny.
                </p>
                <div
                  className="contributionTable tableScroller"
                  role="region"
                  aria-label="Przewijany plan podziału wirtualnej dopłaty"
                  aria-describedby={contributionScrollHintId}
                  tabIndex={0}
                >
                  <table aria-label="Plan podziału wirtualnej dopłaty">
                    <thead>
                      <tr>
                        <th scope="col">ETF</th>
                        <th scope="col">Dodać</th>
                        <th scope="col">Stan po dopłacie</th>
                        <th scope="col">Docelowy udział</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributionRows.map((row) => (
                        <tr className={row.amountToAdd >= 0 ? 'buy' : 'trim'} key={row.subcategory}>
                          <th scope="row">{SUBCATEGORY_LABELS[row.subcategory]}</th>
                          <td className="amountToAddCell">
                            <span aria-hidden="true">{row.amountToAdd >= 0 ? '↑ ' : '↓ '}</span>
                            {row.amountToAdd >= 0 ? 'Kup' : 'Ogranicz'}: {formatSignedMoney(row.amountToAdd)}
                          </td>
                          <td>{formatMoney(row.currentValue + Math.max(row.amountToAdd, 0))}</td>
                          <td>{row.targetWeight}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {contributionAmount > 0 && contributionHasOverweight && (
              <InlineMessage variant="warning">
                Aby idealnie zachować wagi po dopłacie {formatMoney(contributionAmount)}, jedna z pozycji musiałaby
                zostać zmniejszona. Jeśli kupujesz tylko za nową kwotę, dodatnie rekomendacje sumują się do{' '}
                {formatMoney(totalPositiveContribution)}.
              </InlineMessage>
            )}
          </div>
        </>
      )}

      <div className="quickStockActions" aria-label="Szybkie dodawanie ETF">
        {STOCK_SUBCATEGORIES.map((subcategory) => (
          <Button variant="secondary" type="button" key={subcategory} onClick={() => onAddStockValue(subcategory)}>
            Dodaj wycenę: {SUBCATEGORY_LABELS[subcategory]}
          </Button>
        ))}
      </div>
    </section>
  );
}

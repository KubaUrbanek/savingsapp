// @ts-nocheck
import React from 'react';
import { DEFAULT_GLOBAL_TARGET_ALLOCATIONS, GLOBAL_ASSET_CLASSES } from '../../domain/portfolio/constants.js';
import { buildGlobalAllocation } from '../../domain/portfolio/allocation.js';
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

export function GlobalAllocationPanel({ id = undefined, entries, preferences, onPreferenceError }) {
  const scrollHintId = React.useId();
  const [targets, setTargets] = React.useState(() => preferences.globalAllocation());
  const { investedTotal, cashTotal, contributionOnlyTotal, rows } = React.useMemo(
    () => buildGlobalAllocation(entries, targets),
    [entries, targets]
  );
  const targetTotal = GLOBAL_ASSET_CLASSES.reduce((sum, assetClass) => sum + Number(targets[assetClass] || 0), 0);
  const isValid = Math.abs(targetTotal - 100) < 0.001;

  React.useEffect(() => {
    try {
      preferences.changeGlobalAllocation(targets);
    } catch (error) {
      onPreferenceError(error);
    }
  }, [targets, preferences, onPreferenceError]);

  return (
    <section className="panel globalAllocationPanel sectionAnchor" id={id}>
      <SectionHeader
        className="stockHeader"
        eyebrow="Alokacja całego majątku"
        title="Globalny plan portfela inwestycyjnego"
        description={
          <>
            Obligacje, akcje i złoto są liczone na podstawie najnowszych wycen. Gotówka pozostaje poza wagami docelowymi
            i jest pokazana osobno.
          </>
        }
        action={
          <div className="globalTotals">
            <div>
              <span>Aktywa w planie</span>
              <strong>{formatMoney(investedTotal)}</strong>
            </div>
            <div>
              <span>Gotówka poza planem</span>
              <strong>{formatMoney(cashTotal)}</strong>
              <small>Konta, PPO i PPK</small>
            </div>
          </div>
        }
      />

      <div className="allocationEditor">
        <div>
          <p className="eyebrow">Wagi globalne</p>
          <h3>Ustaw docelową strukturę</h3>
        </div>
        <div className="allocationInputs globalInputs">
          {GLOBAL_ASSET_CLASSES.map((assetClass) => (
            <Field
              key={assetClass}
              label={GLOBAL_ASSET_LABELS[assetClass]}
              control={
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={targets[assetClass]}
                  onChange={(event) =>
                    setTargets((current) => ({
                      ...current,
                      [assetClass]: event.target.value === '' ? 0 : Number(event.target.value)
                    }))
                  }
                />
              }
            />
          ))}
        </div>
        <div className={isValid ? 'allocationStatus valid' : 'allocationStatus invalid'}>
          <span>Suma wag: {formatUnsignedPercent(targetTotal)}</span>
          {!isValid && (
            <InlineMessage variant="warning">Ustaw łącznie 100%, aby obliczenia tworzyły poprawny plan.</InlineMessage>
          )}
          <Button variant="quiet" type="button" onClick={() => setTargets({ ...DEFAULT_GLOBAL_TARGET_ALLOCATIONS })}>
            Przywróć 50/30/20
          </Button>
        </div>
      </div>

      {investedTotal === 0 ? (
        <p>Dodaj wyceny aktywów, aby zobaczyć aktualną alokację i plan równoważenia.</p>
      ) : (
        <>
          <p className="visuallyHidden" id={scrollHintId}>
            Tabela przewija się poziomo. Użyj klawiszy strzałek, aby zobaczyć pozostałe kolumny.
          </p>
          <div
            className="globalAllocationTable tableScroller"
            role="region"
            aria-label="Przewijana globalna alokacja majątku"
            aria-describedby={scrollHintId}
            tabIndex={0}
          >
            <table aria-label="Globalna alokacja majątku">
              <thead>
                <tr>
                  <th scope="col">Klasa aktywów</th>
                  <th scope="col">Aktualnie</th>
                  <th scope="col">Cel</th>
                  <th scope="col">Odchylenie</th>
                  <th scope="col">Kup / sprzedaj</th>
                  <th scope="col">Tylko nowe wpłaty</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.assetClass}>
                    <th scope="row">{GLOBAL_ASSET_LABELS[row.assetClass]}</th>
                    <td>
                      {formatMoney(row.currentValue)}
                      <small>{formatUnsignedPercent(row.currentWeight)}</small>
                    </td>
                    <td>{formatUnsignedPercent(row.targetWeight)}</td>
                    <td
                      className={
                        Math.abs(row.deviation) < 0.01 ? '' : row.deviation > 0 ? 'negativeText' : 'positiveText'
                      }
                    >
                      {formatPercentagePoints(row.deviation)}
                    </td>
                    <td className={row.rebalanceAmount >= 0 ? 'positiveText' : 'negativeText'}>
                      <span aria-hidden="true">{row.rebalanceAmount >= 0 ? '↑ ' : '↓ '}</span>
                      {row.rebalanceAmount >= 0 ? 'Kup' : 'Sprzedaj'}: {formatSignedMoney(row.rebalanceAmount)}
                    </td>
                    <td>{row.contributionAmount == null ? 'Niemożliwe' : formatMoney(row.contributionAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobileAllocationList" aria-label="Globalna alokacja majątku — widok mobilny">
            {rows.map((row) => (
              <article className="mobileAllocationCard" key={row.assetClass}>
                <h3>{GLOBAL_ASSET_LABELS[row.assetClass]}</h3>
                <dl>
                  <div>
                    <dt>Aktualnie</dt>
                    <dd>
                      {formatMoney(row.currentValue)}
                      <small>{formatUnsignedPercent(row.currentWeight)}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Cel</dt>
                    <dd>{formatUnsignedPercent(row.targetWeight)}</dd>
                  </div>
                  <div>
                    <dt>Odchylenie</dt>
                    <dd
                      className={
                        Math.abs(row.deviation) < 0.01 ? '' : row.deviation > 0 ? 'negativeText' : 'positiveText'
                      }
                    >
                      {formatPercentagePoints(row.deviation)}
                    </dd>
                  </div>
                  <div>
                    <dt>Kup / sprzedaj</dt>
                    <dd className={row.rebalanceAmount >= 0 ? 'positiveText' : 'negativeText'}>
                      <span aria-hidden="true">{row.rebalanceAmount >= 0 ? '↑ ' : '↓ '}</span>
                      {row.rebalanceAmount >= 0 ? 'Kup' : 'Sprzedaj'}: {formatSignedMoney(row.rebalanceAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt>Tylko nowe wpłaty</dt>
                    <dd>{row.contributionAmount == null ? 'Niemożliwe' : formatMoney(row.contributionAmount)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="rebalanceHint">
            <strong>Wariant bez sprzedaży:</strong>
            <span>
              {Number.isFinite(contributionOnlyTotal)
                ? `dopłać łącznie ${formatMoney(contributionOnlyTotal)}, dzieląc kwotę zgodnie z ostatnią kolumną.`
                : 'nie można osiągnąć celu samymi wpłatami, dopóki klasa z wagą 0% ma dodatnią wartość.'}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

// @ts-nocheck
import React from 'react';
import { buildHouseholdOverview } from '../../domain/portfolio/household.js';
import {
  displayName,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  formatUnsignedPercent,
  TYPE_LABELS
} from '../viewModels/formatters.js';
import { Field } from './Field.jsx';
import { SectionHeader } from './SectionHeader.jsx';

export function HouseholdDashboard({ entries, users, types, preferences, onPreferenceError }) {
  const goalDescriptionId = React.useId();
  const [goal, setGoal] = React.useState(() => preferences.householdGoal());
  const { total, totalsByOwner, totalsByType, liquid, retirement, longTerm, latestMonth, goalProgress } =
    buildHouseholdOverview(entries, users, types, goal);

  function updateGoal(value) {
    const nextGoal = Number(value);
    setGoal(nextGoal);
    if (nextGoal > 0) {
      try {
        preferences.changeHouseholdGoal(nextGoal);
      } catch (error) {
        onPreferenceError(error);
      }
    }
  }

  return (
    <section className="householdDashboard" aria-label="Podsumowanie całego gospodarstwa domowego">
      <article className="householdHero">
        <div>
          <p className="eyebrow">Wspólny majątek</p>
          <h2>Wasze finanse w jednym miejscu</h2>
          <p className="householdTotal">{formatMoney(total)}</p>
          <p
            className={latestMonth?.changeAmount >= 0 ? 'householdChange positiveText' : 'householdChange negativeText'}
          >
            {(latestMonth?.changeAmount || 0) >= 0 ? '↑ Zysk' : '↓ Strata'}:{' '}
            {formatSignedMoney(latestMonth?.changeAmount || 0)} ({formatPercent(latestMonth?.changePercent)}) miesiąc do
            miesiąca
          </p>
        </div>
        <div className="ownershipList">
          {users.map((user) => {
            const value = totalsByOwner[user] || 0;
            const share = total > 0 ? (value / total) * 100 : 0;
            return (
              <div className="ownershipRow" key={user}>
                <span aria-hidden="true" className={`ownerDot owner${user}`} />
                <div>
                  <strong>{displayName(user)}</strong>
                  <small>{formatUnsignedPercent(share)} majątku</small>
                </div>
                <b>{formatMoney(value)}</b>
              </div>
            );
          })}
        </div>
      </article>

      <div className="householdMetricGrid">
        <article className="householdMetric">
          <span>Aktywa płynne</span>
          <strong>{formatMoney(liquid)}</strong>
          <small>{formatUnsignedPercent(total ? (liquid / total) * 100 : 0)} całości</small>
        </article>
        <article className="householdMetric">
          <span>Długoterminowe</span>
          <strong>{formatMoney(longTerm)}</strong>
          <small>{formatUnsignedPercent(total ? (longTerm / total) * 100 : 0)} całości</small>
        </article>
        <article className="householdMetric retirement">
          <span>Emerytura</span>
          <strong>{formatMoney(retirement)}</strong>
          <small>IKE, IKZE, PPK i PPO</small>
        </article>
      </div>

      <div className="householdDetailsGrid">
        <article className="panel assetPanel">
          <SectionHeader eyebrow="Klasy aktywów" title="Struktura wspólnego portfela" />
          <div className="assetList">
            {types.map((type) => {
              const value = totalsByType[type] || 0;
              const share = total > 0 ? (value / total) * 100 : 0;
              return (
                <div className="assetRow" key={type}>
                  <div>
                    <span>{TYPE_LABELS[type] || type}</span>
                    <strong>{formatMoney(value)}</strong>
                  </div>
                  <div
                    aria-label={`Udział: ${TYPE_LABELS[type] || type}`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.min(100, Math.max(0, share))}
                    aria-valuetext={formatUnsignedPercent(share)}
                    className="progressTrack"
                    role="progressbar"
                  >
                    <span aria-hidden="true" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                  </div>
                  <small>{formatUnsignedPercent(share)}</small>
                </div>
              );
            })}
          </div>
        </article>
        <article className="panel goalPanel">
          <SectionHeader eyebrow="Wspólny cel" title="Łączna realizacja celów" />
          <div
            aria-label="Realizacja wspólnego celu"
            aria-describedby={goalDescriptionId}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.min(100, Math.max(0, goalProgress))}
            aria-valuetext={formatUnsignedPercent(goalProgress)}
            className="goalRing"
            role="progressbar"
            style={{ '--progress': `${Math.min(100, Math.max(0, goalProgress)) * 3.6}deg` }}
          >
            <strong>{formatUnsignedPercent(goalProgress)}</strong>
            <span>zrealizowano</span>
          </div>
          <Field
            label="Docelowa wartość majątku"
            control={
              <input
                min="1"
                step="1000"
                type="number"
                value={goal}
                onChange={(event) => updateGoal(event.target.value)}
              />
            }
          />
          <p id={goalDescriptionId}>
            {formatMoney(total)} z {formatMoney(goal)}
          </p>
        </article>
      </div>
    </section>
  );
}

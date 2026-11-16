// @ts-nocheck
import React from 'react';
import { InlineMessage } from './InlineMessage.js';
import { formatMoney, formatUnsignedPercent } from '../viewModels/formatters.js';
import { AllocationDeviationChart, rebalanceLabels as labels } from './AllocationDeviationChart.js';
export function RebalancePlan({ plan, showTrades, selectedKeys, onSelectionChange }) {
  return (
    <>
      <AllocationDeviationChart rows={plan.rows} total={plan.total} />
      {showTrades && (
        <section aria-label="Rebalans obecnego portfela">
          <h3>Rebalans bez dopłaty</h3>
          <fieldset className="rebalanceSelection">
            <legend>Aktywa do rebalansu</legend>
            <p>Odznacz aktywa, których wartości nie chcesz zmieniać.</p>
            <div className="rebalanceSelectionOptions">
              {plan.rows.map((row) => (
                <label key={row.key}>
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(row.key)}
                    onChange={(event) =>
                      onSelectionChange(
                        event.target.checked
                          ? [...selectedKeys, row.key]
                          : selectedKeys.filter((key) => key !== row.key)
                      )
                    }
                  />
                  <span>
                    <strong>{labels[row.key]}</strong>
                    <small>{row.selected ? 'W rebalansie' : 'Bez zmian — poza rebalansem'}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="rebalanceScope" role="status">
            <span>
              Wybrane aktywa: <strong>{formatMoney(plan.selectedTotal)}</strong>
            </span>
            <span>
              Bez zmian: <strong>{formatMoney(plan.excludedTotal)}</strong>
            </span>
          </div>
          {plan.partial && (
            <p className="rebalancePartialNotice">
              Rebalans częściowy: zapisane wagi wybranych aktywów przeliczamy proporcjonalnie do ich łącznej wartości.
              Pozostałe aktywa pozostają bez zmian. Cały portfel może nadal odbiegać od zapisanego planu.
            </p>
          )}
          {plan.total === 0 ? (
            <p>Brak inwestycji do rebalansu.</p>
          ) : plan.selectionStatus === 'empty' ? (
            <p>Wybierz aktywa do rebalansu.</p>
          ) : plan.selectionStatus === 'zero-target' ? (
            <p>Wybierz co najmniej jedną kategorię z dodatnim celem w planie.</p>
          ) : plan.selectionStatus === 'single' ? (
            <p>Wybrano jedno aktywo. Zaznacz co najmniej dwa, aby przesuwać środki między nimi.</p>
          ) : plan.selectionStatus === 'no-funds' ? (
            <p>Wybrane aktywa nie mają środków do rebalansu.</p>
          ) : plan.tradeTotal === 0 ? (
            <p>
              {plan.partial
                ? 'Wybrana część portfela jest zgodna z proporcjami planu w dokładności do grosza.'
                : 'Portfel jest zgodny z planem w dokładności do grosza.'}
            </p>
          ) : (
            <>
              <p>Najpierw sprzedaj nadwyżki, następnie kup za uzyskane środki.</p>
              {[
                ['Co sprzedać', -1, 'Sprzedaj'],
                ['Co kupić', 1, 'Kup']
              ].map(([title, sign, action]) => (
                <section key={title} aria-label={title}>
                  <h4>{title}</h4>
                  <ul className="purchaseRecommendations" aria-label={title}>
                    {plan.rows
                      .filter((row) => row.tradeAmount * sign > 0)
                      .map((row) => (
                        <li className="purchaseCard" key={row.key}>
                          <h5>{labels[row.key]}</h5>
                          <p>
                            {action} za <strong>{formatMoney(Math.abs(row.tradeAmount))}</strong>
                          </p>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
              <p>
                Łączna sprzedaż: <strong>{formatMoney(plan.tradeTotal)}</strong> · Łączne zakupy:{' '}
                <strong>{formatMoney(plan.tradeTotal)}</strong>.
              </p>
            </>
          )}
          {plan.total > 0 && plan.selectionStatus !== 'empty' && plan.selectionStatus !== 'zero-target' && (
            <>
              <h4>Po rebalansie</h4>
              <ul className="allocationComparison" aria-label="Po rebalansie">
                {plan.rows.map((row) => (
                  <li key={row.key}>
                    <strong>{labels[row.key]}</strong>
                    {!row.selected && <small>Bez zmian — poza rebalansem</small>}
                    <span>{formatMoney(row.afterValue)}</span>
                    <span>
                      Udział: {formatUnsignedPercent(row.afterWeight)} · Zapisany cel:{' '}
                      {formatUnsignedPercent(row.targetWeight)}
                    </span>
                  </li>
                ))}
              </ul>
              <p>Wartość po rebalansie: {formatMoney(plan.total)}. Udziały uwzględniają zaokrąglenie do groszy.</p>
            </>
          )}
          <p>Kwoty według zapisanych wycen, przed opłatami i podatkami. Plan nie zapisuje transakcji.</p>
          <p>
            Podział dotyczy kategorii inwestycji, bez wyboru rachunków i właścicieli. Nie uwzględnia liczby jednostek,
            ograniczeń rachunków ani kosztów wcześniejszego wykupu obligacji.
          </p>
        </section>
      )}
      <p className="planCash">
        Gotówka {formatMoney(plan.cash)} pozostaje poza proporcjami inwestycji i nie finansuje automatycznie rebalansu.
        Wpisanie kwoty nie zapisuje wpłaty ani zakupu.
      </p>
      {plan.unclassified > 0 && (
        <InlineMessage variant="warning">
          PPK / PPO: {formatMoney(plan.unclassified)}. Nie znamy ich składu, więc nie uwzględniamy ich w tym planie.
        </InlineMessage>
      )}
    </>
  );
}

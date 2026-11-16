// @ts-nocheck
import React from 'react';
import { formatMoney, formatUnsignedPercent } from '../viewModels/formatters.js';
import { rebalanceLabels as labels } from './AllocationDeviationChart.js';
export function RebalancePlan({ plan, showTrades, selectedKeys, onSelectionChange }) {
  return (
    <>
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
                    <small>
                      {row.selected
                        ? `Cel wybranej części: ${formatUnsignedPercent(row.selectedTargetWeight)}`
                        : 'Bez zmian — poza rebalansem'}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="rebalanceScope" role="status">
            <span>
              Wybrane aktywa: <strong>{formatMoney(plan.selectedTotal)}</strong>
            </span>
            {plan.partial && (
              <span>
                Bez zmian: <strong>{formatMoney(plan.excludedTotal)}</strong>
              </span>
            )}
          </div>
          {plan.partial && (
            <p className="rebalancePartialNotice">
              Rebalans obejmuje wybrane aktywa. Pozostałe pozostają bez zmian, więc cały portfel może nadal odbiegać od
              planu.
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
              <div className="rebalanceTrades">
                {[
                  ['Co sprzedać', -1, 'Sprzedaj'],
                  ['Co kupić', 1, 'Kup']
                ].map(([title, sign, action]) => (
                  <section className={sign < 0 ? 'rebalanceSell' : 'rebalanceBuy'} key={title} aria-label={title}>
                    <h4>{sign < 0 ? '1. Sprzedaj' : '2. Kup'}</h4>
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
              </div>
              <p>
                Łączna sprzedaż: <strong>{formatMoney(plan.tradeTotal)}</strong> · Łączne zakupy:{' '}
                <strong>{formatMoney(plan.tradeTotal)}</strong>.
              </p>
            </>
          )}
          {plan.selectionStatus === 'ready' && (
            <details className="purchaseDetails">
              <summary>Szczegóły wyliczeń</summary>
              <h4>Po rebalansie — wybrane aktywa</h4>
              <ul className="allocationComparison" aria-label="Po rebalansie">
                {plan.rows
                  .filter((row) => row.selected)
                  .map((row) => (
                    <li key={row.key}>
                      <strong>{labels[row.key]}</strong>
                      <span>
                        Teraz: {formatMoney(row.currentValue)} · {formatUnsignedPercent(row.selectedCurrentWeight)}
                      </span>
                      <span>Po rebalansie: {formatMoney(row.afterValue)}</span>
                      <span>
                        Udział w wybranej części: {formatUnsignedPercent(row.selectedAfterWeight)} · Cel wybranej
                        części: {formatUnsignedPercent(row.selectedTargetWeight)}
                      </span>
                    </li>
                  ))}
              </ul>
              {plan.partial && (
                <section aria-label="Poza rebalansem — bez zmian">
                  <h4>Poza rebalansem — bez zmian</h4>
                  <ul className="allocationComparison">
                    {plan.rows
                      .filter((row) => !row.selected)
                      .map((row) => (
                        <li key={row.key}>
                          <strong>{labels[row.key]}</strong>
                          <span>{formatMoney(row.afterValue)}</span>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
              <p>Udziały uwzględniają zaokrąglenie kwot do groszy.</p>
            </details>
          )}
          <p>Kwoty według zapisanych wycen, przed opłatami i podatkami. Plan nie zapisuje transakcji.</p>
          <details>
            <summary>Jak to liczymy</summary>
            <p>
              Podział dotyczy kategorii inwestycji, bez wyboru rachunków i właścicieli. Nie uwzględnia liczby jednostek,
              ograniczeń rachunków ani kosztów wcześniejszego wykupu obligacji. Cele wybranej części to zapisane wagi
              podzielone przez ich sumę.
            </p>
          </details>
        </section>
      )}
      {plan.cash > 0 && (
        <p className="planCash">
          Gotówka {formatMoney(plan.cash)} pozostaje poza proporcjami inwestycji.
          {showTrades ? ' Nie finansuje automatycznie rebalansu.' : ' Wpisanie kwoty nie zapisuje wpłaty ani zakupu.'}
        </p>
      )}
      {plan.unclassified > 0 && (
        <p className="planCash">
          PPK / PPO: {formatMoney(plan.unclassified)}. Nie znamy ich składu, więc nie uwzględniamy ich w tym planie.
        </p>
      )}
    </>
  );
}

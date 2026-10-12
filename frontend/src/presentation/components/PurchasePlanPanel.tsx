// @ts-nocheck
import React from 'react';
import { Field } from './Field.js';
import { Button } from './Button.js';
import { InlineMessage } from './InlineMessage.js';
import { planPurchases, validWeights } from '../../domain/portfolio/services/PurchasePlanningService.js';
import { displayName, formatMoney, formatUnsignedPercent } from '../viewModels/formatters.js';
const defaults = { bonds: 50, stocks: 50, gold: 50, developed: 35, emerging: 15 };
const labels = {
  BONDS: 'Obligacje',
  GOLD: 'Złoto (ETF)',
  RYNKI_ROZWINIETE: 'Rynki rozwinięte',
  RYNKI_ROZWIJAJACE_SIE: 'Rynki wschodzące'
};
export function PurchasePlanPanel({ entries, scope, useCases }) {
  const [saved, setSaved] = React.useState(defaults),
    [draft, setDraft] = React.useState(defaults),
    [budget, setBudget] = React.useState(''),
    [state, setState] = React.useState('loading'),
    [message, setMessage] = React.useState('');
  const editor = React.useRef(null);
  React.useEffect(() => {
    const abort = new AbortController();
    setState('loading');
    setMessage('');
    setBudget('');
    if (editor.current) editor.current.open = false;
    Promise.resolve(useCases.loadPortfolioPlan?.execute({ scope, signal: abort.signal }) || defaults).then(
      (p) => {
        if (!abort.signal.aborted) {
          setSaved(p);
          setDraft(p);
          setState('ready');
        }
      },
      () => {
        if (!abort.signal.aborted) {
          setState('error');
          setMessage('Nie udało się wczytać planu. Odśwież stronę.');
        }
      }
    );
    return () => abort.abort();
  }, [scope, useCases]);
  const global = { BONDS: draft.bonds, STOCKS: draft.stocks },
    equity = { GOLD: draft.gold, RYNKI_ROZWINIETE: draft.developed, RYNKI_ROZWIJAJACE_SIE: draft.emerging };
  const valid = validWeights(global) && validWeights(equity),
    amount = Number(budget || 0),
    budgetValid = Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(Math.round(amount * 100));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const plan =
    valid && budgetValid && !dirty && state === 'ready' ? planPurchases(entries, global, equity, amount) : null;
  async function save() {
    if (!valid || state !== 'ready') return;
    setState('saving');
    setMessage('');
    try {
      const p = await (useCases.savePortfolioPlan?.execute({ scope, plan: draft }) || Promise.resolve(draft));
      setSaved(p);
      setDraft(p);
      setMessage('Zapisano Twój plan.');
      setState('ready');
      if (editor.current) editor.current.open = false;
    } catch {
      setState('ready');
      setMessage('Nie udało się zapisać planu. Spróbuj ponownie.');
    }
  }
  return (
    <section className="ledgerSection purchasePlanPanel" aria-busy={state === 'loading' || state === 'saving'}>
      <h2>Co dokupić?</h2>
      <p>{scope === 'household' ? 'Plan wspólnych oszczędności' : `Plan dla: ${displayName(scope)}`}</p>
      <Field
        label="Mam do zainwestowania — zł"
        control={
          <input
            className="purchaseBudget"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            disabled={state !== 'ready'}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="np. 1000"
          />
        }
      />
      {!budgetValid && <InlineMessage variant="warning">Podaj poprawną, nieujemną kwotę.</InlineMessage>}
      {plan && (
        <>
          {amount > 0 ? (
            <>
              <p className="purchaseTotal">
                Dokup za łącznie <strong>{formatMoney(amount)}</strong>. Bez sprzedawania inwestycji.
              </p>
              <ul className="purchaseRecommendations" aria-label="Proponowane zakupy">
                {plan.rows
                  .filter((r) => r.purchaseAmount > 0)
                  .map((r) => (
                    <li className="purchaseCard" key={r.key}>
                      <h3>{labels[r.key]}</h3>
                      <p>
                        Dokup za <strong className="purchaseAmount">{formatMoney(r.purchaseAmount)}</strong>
                      </p>
                      <small>
                        Po zakupie: {formatUnsignedPercent(r.afterWeight)} · Twój cel:{' '}
                        {formatUnsignedPercent(r.targetWeight)}
                      </small>
                    </li>
                  ))}
              </ul>
              <p>Pozostałych składników teraz nie dokupujesz. Zakupy przybliżają do Twoich proporcji.</p>
            </>
          ) : (
            <p>Wpisz kwotę, a podpowiemy, na co ją przeznaczyć według Twojego planu.</p>
          )}
          <details className="purchaseDetails">
            <summary>Sprawdź proporcje i brakujące kwoty</summary>
            <ul className="allocationComparison">
              {plan.rows
                .filter((r) => r.targetWeight > 0 || r.currentValue > 0)
                .map((r) => (
                  <li key={r.key}>
                    <strong>{labels[r.key]}</strong>
                    <span>Mam: {formatMoney(r.currentValue)}</span>
                    <span>
                      Udział: {formatUnsignedPercent(r.currentWeight)} · Cel: {formatUnsignedPercent(r.targetWeight)}
                    </span>
                    <span>Do celu przy dzisiejszej wartości brakuje: {formatMoney(r.missingAmount)}</span>
                  </li>
                ))}
            </ul>
            <p>
              Brak do celu dotyczy obecnych oszczędności. Zakupy uwzględniają również wpisaną kwotę i nie wymagają
              sprzedaży. Mała dopłata może nie wystarczyć, aby osiągnąć wszystkie proporcje.
            </p>
          </details>
          <p className="planCash">
            Gotówka {formatMoney(plan.cash)} pozostaje poza proporcjami inwestycji. Wpisanie kwoty nie zapisuje wpłaty
            ani zakupu.
          </p>
          {plan.unclassified > 0 && (
            <InlineMessage variant="warning">
              PPK / PPO: {formatMoney(plan.unclassified)}. Nie znamy ich składu, więc nie uwzględniamy ich w tym planie.
            </InlineMessage>
          )}
        </>
      )}
      {dirty && (
        <InlineMessage variant="warning">
          {valid
            ? 'Zapisz zmiany planu, aby zobaczyć zakupy.'
            : 'Na każdym poziomie ustaw łącznie 100%. Do tego czasu nie podajemy zakupów.'}
        </InlineMessage>
      )}
      <div className="savedPlan">
        <strong>Twój zapisany plan</strong>
        <span>
          Obligacje {formatUnsignedPercent(saved.bonds)} · Akcje i ETF-y {formatUnsignedPercent(saved.stocks)}
        </span>
        <ul className="equityBreakdown" aria-label="Podział akcji w zapisanym planie">
          <li>
            <strong>Złoto (ETF)</strong>
            <span>{formatUnsignedPercent(saved.gold)} części akcyjnej</span>
            <small>{formatUnsignedPercent((saved.stocks * saved.gold) / 100)} całego planu</small>
          </li>
          <li>
            <strong>Rynki rozwinięte</strong>
            <span>{formatUnsignedPercent(saved.developed)} części akcyjnej</span>
            <small>{formatUnsignedPercent((saved.stocks * saved.developed) / 100)} całego planu</small>
          </li>
          <li>
            <strong>Rynki wschodzące</strong>
            <span>{formatUnsignedPercent(saved.emerging)} części akcyjnej</span>
            <small>{formatUnsignedPercent((saved.stocks * saved.emerging) / 100)} całego planu</small>
          </li>
        </ul>
      </div>
      <details ref={editor} className="planEditor">
        <summary>Zmień mój plan</summary>
        <h3>Podział inwestycji</h3>
        <div className="allocationInputs">
          {[
            ['bonds', 'Obligacje'],
            ['stocks', 'Akcje i ETF-y']
          ].map(([key, label]) => (
            <Field
              key={key}
              label={`${label} — % całego planu`}
              control={
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={draft[key]}
                  disabled={state !== 'ready'}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              }
            />
          ))}
        </div>
        <h3>Podział części akcyjnej</h3>
        <p>
          W tym planie część akcyjna obejmuje również złoty ETF. Podziel ją między złoto, rynki rozwinięte i wschodzące.
          Ich udziały muszą sumować się do 100% części akcyjnej.
        </p>
        <div className="allocationInputs">
          {[
            ['gold', 'Złoto (ETF)'],
            ['developed', 'Rynki rozwinięte'],
            ['emerging', 'Rynki wschodzące']
          ].map(([key, label]) => (
            <Field
              key={key}
              label={`${label} — % akcji`}
              control={
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={draft[key]}
                  disabled={state !== 'ready'}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              }
            />
          ))}
        </div>
        {valid && (
          <p className="equityPreview" role="status">
            W całym planie: złoto {formatUnsignedPercent((draft.stocks * draft.gold) / 100)}
            {' · '}rynki rozwinięte {formatUnsignedPercent((draft.stocks * draft.developed) / 100)}
            {' · '}rynki wschodzące {formatUnsignedPercent((draft.stocks * draft.emerging) / 100)}.
          </p>
        )}
        <div className="dialogActions">
          <Button
            onClick={() => {
              setDraft(saved);
              if (editor.current) editor.current.open = false;
            }}
            disabled={state !== 'ready'}
          >
            Anuluj zmiany planu
          </Button>
          <Button
            variant="primary"
            onClick={save}
            disabled={!valid || !dirty || state !== 'ready'}
            busy={state === 'saving'}
            busyLabel="Zapisywanie…"
          >
            Zapisz mój plan
          </Button>
        </div>
      </details>
      {message && <p role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
    </section>
  );
}

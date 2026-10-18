import React from 'react';
import { Button } from './Button.js';
import { Field } from './Field.js';
import { InlineMessage } from './InlineMessage.js';
import { subcategoriesFor } from '../../domain/portfolio/constants.js';
import { TYPE_LABELS, SUBCATEGORY_LABELS, displayName, formatMoney, today } from '../viewModels/formatters.js';

export interface ChangeForm {
  action: string;
  operationType: string;
  type: string;
  subcategory: string;
  amountPln: string;
  currentValuePln: string;
  costKnown: boolean;
  cashType: string;
  date: string;
}
interface Holding {
  owner: string;
  type: string;
  subcategory?: string | null;
  date: string;
  valuePln: number;
  createdAt?: string;
}
interface Props {
  form: ChangeForm;
  setForm: React.Dispatch<React.SetStateAction<ChangeForm>>;
  owner: string;
  owners: string[];
  onOwnerChange: (owner: string) => void;
  types: string[];
  entries: Holding[];
  editing: boolean;
  legacy: boolean;
  saving: boolean;
  errors: Record<string, string>;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}
const actions = {
  INITIAL: 'Wpisuję stan początkowy',
  DEPOSIT: 'Wpłaciłem',
  BUY: 'Kupiłem',
  WITHDRAWAL: 'Wypłaciłem',
  SELL: 'Sprzedałem',
  VALUATION: 'Wpisuję obecną wartość'
};
const help = {
  INITIAL:
    'Wpisz saldo konta lub wartość inwestycji na dzień, od którego zaczynasz ją śledzić w aplikacji. Jeśli znasz sumę dotychczasowych wpłat, podaj ją poniżej.',
  DEPOSIT: 'Dodajesz nowe pieniądze do oszczędności. Wpłata zwiększa Twój wkład, a nie zysk.',
  BUY: 'Kupujesz inwestycję za pieniądze z wybranego konta. Sam zakup nie tworzy zysku.',
  WITHDRAWAL: 'Wycofujesz pieniądze z oszczędności, na przykład na wydatek.',
  SELL: 'Pieniądze ze sprzedaży wrócą na wybrane konto i pozostaną w oszczędnościach.',
  VALUATION:
    'Podaj saldo konta lub wartość inwestycji na wybrany dzień, już z zyskiem lub stratą. Suma Twoich wpłat pozostaje bez zmian.'
};
export function PortfolioChangeDialog(props: Props) {
  const {
    form,
    setForm,
    owner,
    owners,
    onOwnerChange,
    types,
    entries,
    editing,
    legacy,
    saving,
    errors,
    error,
    onSubmit,
    onClose
  } = props;
  const dialog = React.useRef<HTMLDialogElement>(null);
  const errorRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const fields = React.useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  React.useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    if (element?.showModal) element.showModal();
    else element?.setAttribute('open', '');
    return () => {
      element?.close?.();
      previous?.focus();
    };
  }, []);
  React.useEffect(() => {
    const first = Object.keys(errors)[0];
    if (first) fields.current[first]?.focus();
  }, [errors]);
  const hasHolding = entries.some(
    (entry) => entry.owner === owner && entry.type === form.type && (entry.subcategory || '') === form.subcategory
  );
  const availableActions = Object.entries(actions).filter(([kind]) =>
    editing ? kind === form.action : hasHolding ? kind !== 'INITIAL' : kind === 'INITIAL'
  );
  React.useEffect(() => {
    if (editing || !form.type) return;
    const action = hasHolding ? (form.action === 'INITIAL' ? 'DEPOSIT' : form.action) : 'INITIAL';
    if (action !== form.action) {
      setForm((previous) => ({ ...previous, action, operationType: action, amountPln: '', currentValuePln: '' }));
    }
  }, [editing, form.type, form.action, hasHolding, setForm]);
  const explicit = form.action === 'INITIAL' || form.action === 'VALUATION';
  const trade = form.action === 'BUY' || form.action === 'SELL';
  const subcategories = form.type ? subcategoriesFor(form.type) : [];
  const owned = entries
    .filter((e) => e.owner === owner && e.date <= form.date)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  const current = Number(
    owned.find((e) => e.type === form.type && (e.subcategory || '') === form.subcategory)?.valuePln || 0
  );
  const cash = Number(owned.find((e) => e.type === form.cashType)?.valuePln || 0);
  const amount = Number(form.amountPln);
  const set = (key: keyof ChangeForm, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <dialog
      ref={dialog}
      className="changeDialog"
      aria-labelledby="change-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div className="dialogHeading">
        <h2 id="change-dialog-title">{editing ? 'Popraw zmianę' : 'Dodaj zmianę'}</h2>
        <Button type="button" variant="quiet" onClick={onClose} disabled={saving} aria-label="Zamknij formularz">
          ×
        </Button>
      </div>
      <form className="formPanel unifiedForm" onSubmit={onSubmit} aria-busy={saving}>
        {owners.length > 1 && !editing ? (
          <Field
            label="Zapisujesz dla"
            control={
              <select value={owner} onChange={(e) => onOwnerChange(e.target.value)} disabled={saving}>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {displayName(o)}
                  </option>
                ))}
              </select>
            }
          />
        ) : (
          <p className="formOwner">
            Zapisujesz dla: <strong>{displayName(owner)}</strong>
          </p>
        )}
        <Field
          label="Inwestycja / rachunek"
          error={errors.type}
          control={
            <select
              id="portfolio-change-type"
              ref={(e) => {
                fields.current.type = e;
              }}
              required
              value={form.type}
              disabled={saving || editing}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value,
                  subcategory: e.target.value ? subcategoriesFor(e.target.value)[0] || '' : ''
                }))
              }
            >
              <option value="">Wybierz inwestycję</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t as keyof typeof TYPE_LABELS] || t}
                </option>
              ))}
            </select>
          }
        />
        {subcategories.length > 0 && (
          <Field
            label="Rodzaj inwestycji"
            error={errors.subcategory}
            control={
              <select
                id="portfolio-change-subcategory"
                ref={(e) => {
                  fields.current.subcategory = e;
                }}
                required
                value={form.subcategory}
                disabled={saving || editing}
                onChange={(e) => set('subcategory', e.target.value)}
              >
                {subcategories.map((s: string) => (
                  <option key={s} value={s}>
                    {SUBCATEGORY_LABELS[s as keyof typeof SUBCATEGORY_LABELS]}
                  </option>
                ))}
              </select>
            }
          />
        )}
        <Field
          label="Co chcesz zrobić?"
          control={
            <select
              id="portfolio-change-operation-type"
              value={form.type ? form.action : ''}
              disabled={saving || editing || !form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  action: e.target.value,
                  operationType: e.target.value,
                  amountPln: '',
                  currentValuePln: ''
                }))
              }
            >
              {!form.type && <option value="">Najpierw wybierz inwestycję</option>}
              {form.type &&
                availableActions.map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
            </select>
          }
        />
        <p className="formHint">
          {form.type ? help[form.action as keyof typeof help] : 'Najpierw wybierz typ inwestycji lub rachunku.'}
        </p>
        <Field
          label={explicit ? 'Ile masz teraz — zł' : 'Kwota — zł'}
          hint={explicit ? 'Wartość widoczna na rachunku, np. 11 000 zł po wzroście inwestycji.' : undefined}
          error={explicit ? errors.currentValuePln : errors.amountPln}
          control={
            <input
              id={explicit ? 'portfolio-change-current-value' : 'portfolio-change-amount'}
              ref={(e) => {
                fields.current[explicit ? 'currentValuePln' : 'amountPln'] = e;
              }}
              type="number"
              min={explicit ? '0' : '0.01'}
              step="0.01"
              required
              value={explicit ? form.currentValuePln : form.amountPln}
              disabled={saving}
              onChange={(e) => set(explicit ? 'currentValuePln' : 'amountPln', e.target.value)}
            />
          }
        />
        {form.action === 'INITIAL' && (
          <>
            <Field
              label="Znam kwotę, którą wpłaciłem"
              control={
                <input
                  type="checkbox"
                  checked={form.costKnown}
                  disabled={saving}
                  onChange={(e) => set('costKnown', e.target.checked)}
                />
              }
            />
            {form.costKnown ? (
              <Field
                label="Ile łącznie wpłaciłem — zł"
                hint="Suma Twoich wpłat do wybranego dnia, bez zysków i strat, np. 10 000 zł. Służy do obliczenia wyniku inwestycji."
                error={errors.amountPln}
                control={
                  <input
                    ref={(e) => {
                      fields.current.amountPln = e;
                    }}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.amountPln}
                    disabled={saving}
                    onChange={(e) => set('amountPln', e.target.value)}
                  />
                }
              />
            ) : (
              <p>Nie pamiętasz wpłat? Zapisz samą wartość. Wynik pokażemy po uzupełnieniu tej informacji.</p>
            )}
          </>
        )}
        {trade && !legacy && (
          <Field
            label={form.action === 'BUY' ? 'Płacę z konta' : 'Pieniądze wrócą na konto'}
            control={
              <select value={form.cashType} disabled={saving} onChange={(e) => set('cashType', e.target.value)}>
                <option value="KONTO_BANKOWE">Konto bankowe</option>
                <option value="KONTO_OSZCZEDNOSCIOWE">Konto oszczędnościowe</option>
              </select>
            }
          />
        )}
        <Field
          label="Data zmiany"
          error={errors.date}
          control={
            <input
              id="portfolio-change-date"
              ref={(e) => {
                fields.current.date = e;
              }}
              type="date"
              required
              max={today()}
              value={form.date}
              disabled={saving}
              onChange={(e) => set('date', e.target.value)}
            />
          }
        />
        {trade && !editing && (
          <div className="changePreview">
            <p>
              Na wybranym koncie: <strong>{formatMoney(cash)}</strong>
            </p>
            {amount > 0 && Number.isFinite(amount) && (
              <p>
                {form.action === 'BUY'
                  ? `Konto −${formatMoney(amount)} → inwestycja +${formatMoney(amount)}`
                  : `Inwestycja −${formatMoney(amount)} → konto +${formatMoney(amount)}`}
              </p>
            )}
          </div>
        )}
        {!trade && !explicit && !editing && <p>Wartość inwestycji przed zmianą: {formatMoney(current)}.</p>}
        {editing && (
          <p>Korekta przeliczy powiązane salda i późniejsze zmiany. Samodzielnie wpisane wyceny zostaną zachowane.</p>
        )}
        {legacy && (
          <p>Ten starszy wpis ma osobną wycenę. Jeśli zmieniła się też wartość inwestycji, zaktualizuj ją osobno.</p>
        )}
        {error && (
          <InlineMessage ref={errorRef} variant="error">
            {error}
          </InlineMessage>
        )}
        <div className="dialogActions">
          <Button type="button" onClick={onClose} disabled={saving}>
            Anuluj
          </Button>
          <Button variant="primary" type="submit" disabled={!form.type} busy={saving} busyLabel="Zapisywanie…">
            {editing ? 'Zapisz poprawkę' : 'Zapisz zmianę'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

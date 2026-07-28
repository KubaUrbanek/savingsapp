import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import './styles.css';

const USER_STORAGE_KEY = 'oszczednosci.selectedUser';
const FALLBACK_USERS = ['JAKUB', 'ZOSIA'];
const TYPE_LABELS = {
  BOND: 'Obligacje',
  STOCK: 'Akcje',
  SAVINGS: 'Oszczednosci'
};

function formatMoney(value) {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(value));
}

function displayName(user) {
  return user.charAt(0) + user.slice(1).toLowerCase();
}

function Home() {
  const [users, setUsers] = React.useState(FALLBACK_USERS);
  const [selectedUser, setSelectedUser] = React.useState(
    () => localStorage.getItem(USER_STORAGE_KEY) || FALLBACK_USERS[0]
  );
  const [types, setTypes] = React.useState([]);
  const [entries, setEntries] = React.useState([]);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [form, setForm] = React.useState({ type: '', valuePln: '', date: new Date().toISOString().slice(0, 10) });
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

  const loadEntries = React.useCallback(() => {
    const params = new URLSearchParams({ owner: selectedUser });
    if (typeFilter) {
      params.set('type', typeFilter);
    }

    return fetch(`/api/investments?${params}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(setEntries);
  }, [selectedUser, typeFilter]);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/users').then((response) => response.json()),
      fetch('/api/investment-types').then((response) => response.json())
    ])
      .then(([loadedUsers, loadedTypes]) => {
        setUsers(loadedUsers);
        setTypes(loadedTypes);
        setForm((current) => ({ ...current, type: current.type || loadedTypes[0] || '' }));
        if (!loadedUsers.includes(selectedUser)) {
          setSelectedUser(loadedUsers[0]);
        }
      })
      .catch((fetchError) => setError(fetchError.message));
  }, []);

  React.useEffect(() => {
    localStorage.setItem(USER_STORAGE_KEY, selectedUser);
    setStatus('');
    loadEntries().catch((fetchError) => setError(fetchError.message));
  }, [selectedUser, typeFilter, loadEntries]);

  const totalsByType = entries.reduce((totals, entry) => {
    totals[entry.type] = (totals[entry.type] || 0) + Number(entry.valuePln);
    return totals;
  }, {});
  const totalValue = entries.reduce((sum, entry) => sum + Number(entry.valuePln), 0);

  function submitEntry(event) {
    event.preventDefault();
    setError('');
    setStatus('Zapisywanie...');

    fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, owner: selectedUser, valuePln: Number(form.valuePln) })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        setForm((current) => ({ ...current, valuePln: '' }));
        setStatus(`Dodano wpis dla ${displayName(selectedUser)}.`);
        return loadEntries();
      })
      .catch((fetchError) => {
        setStatus('');
        setError(fetchError.message);
      });
  }

  function deleteEntry(id) {
    fetch(`/api/investments/${id}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        setStatus('Usunieto wpis.');
        return loadEntries();
      })
      .catch((fetchError) => setError(fetchError.message));
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Portfele uzytkownikow</p>
        <h1>Wybierz osobe i zarzadzaj jej oszczednosciami.</h1>
        <p>
          Przelaczaj sie miedzy Jakubem i Zosia bez logowania. Kazdy wpis akcji,
          obligacji lub oszczednosci jest przypisany do aktualnie wybranego uzytkownika.
        </p>
      </section>

      <section className="userSwitcher" aria-label="Wybor uzytkownika">
        {users.map((user) => (
          <button
            className={user === selectedUser ? 'userPill active' : 'userPill'}
            key={user}
            type="button"
            onClick={() => setSelectedUser(user)}
          >
            {displayName(user)}
          </button>
        ))}
      </section>

      <section className="dashboardGrid">
        <article className="panel summaryPanel">
          <p className="eyebrow">Aktualny portfel</p>
          <h2>{displayName(selectedUser)}</h2>
          <p className="totalValue">{formatMoney(totalValue)}</p>
          <div className="summaryGrid">
            {types.map((type) => (
              <div className="summaryCard" key={type}>
                <span>{TYPE_LABELS[type] || type}</span>
                <strong>{formatMoney(totalsByType[type] || 0)}</strong>
              </div>
            ))}
          </div>
        </article>

        <form className="panel formPanel" onSubmit={submitEntry}>
          <h2>Dodaj wpis dla {displayName(selectedUser)}</h2>
          <label>
            Typ
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} required>
              {types.map((type) => <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>)}
            </select>
          </label>
          <label>
            Wartosc PLN
            <input
              min="0.01"
              step="0.01"
              type="number"
              value={form.valuePln}
              onChange={(event) => setForm({ ...form, valuePln: event.target.value })}
              required
            />
          </label>
          <label>
            Data
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              required
            />
          </label>
          <button className="button primaryButton" type="submit">Dodaj do portfela</button>
          {status && <p className="success">{status}</p>}
          {error && <p className="error">Nie udalo sie wykonac operacji: {error}</p>}
        </form>
      </section>

      <section className="panel entriesPanel">
        <div className="entriesHeader">
          <h2>Wpisy uzytkownika {displayName(selectedUser)}</h2>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtr typu inwestycji">
            <option value="">Wszystkie typy</option>
            {types.map((type) => <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>)}
          </select>
        </div>
        {entries.length === 0 ? (
          <p>Brak wpisow dla wybranego uzytkownika.</p>
        ) : (
          <div className="entryList">
            {entries.map((entry) => (
              <div className="entryRow" key={entry.id}>
                <div>
                  <strong>{TYPE_LABELS[entry.type] || entry.type}</strong>
                  <span>{entry.date}</span>
                </div>
                <strong>{formatMoney(entry.valuePln)}</strong>
                <button type="button" onClick={() => deleteEntry(entry.id)}>Usun</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function About() {
  return (
    <main className="page">
      <section className="hero heroCompact">
        <p className="eyebrow">/about</p>
        <h1>Portfele bez logowania.</h1>
        <p>Wybor uzytkownika sluzy do filtrowania i dodawania wpisow dla konkretnej osoby.</p>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="page">
      <section className="panel">
        <h1>Nie znaleziono strony</h1>
        <p>Wroc na strone glowna i sprobuj ponownie.</p>
        <Link className="button" to="/">Home</Link>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <Link className="brand" to="/">Oszczednosci</Link>
        <nav aria-label="Glowne">
          <NavLink to="/" end>Portfele</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

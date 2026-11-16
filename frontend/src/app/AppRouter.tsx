// @ts-nocheck
import React from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Home } from '../presentation/pages/Home.jsx';
import { About } from '../presentation/pages/About.jsx';
import { NotFound } from '../presentation/pages/NotFound.jsx';

const ROUTE_TITLES = {
  '/': 'Portfele | Oszczędności',
  '/about': 'Jak korzystać | Oszczędności'
};

function RouteAnnouncement() {
  const location = useLocation();
  const previousPath = React.useRef(location.pathname);

  React.useEffect(() => {
    document.title = ROUTE_TITLES[location.pathname] || 'Nie znaleziono strony | Oszczędności';

    if (previousPath.current !== location.pathname) {
      [...document.querySelectorAll('#main-content h1')].find((element) => !element.closest('[hidden]'))?.focus();
    }

    previousPath.current = location.pathname;
  }, [location.pathname]);

  return null;
}

function PersistentHome({ dependencies }) {
  const location = useLocation();
  const [visited, setVisited] = React.useState(location.pathname === '/');
  React.useEffect(() => {
    if (location.pathname === '/') setVisited(true);
  }, [location.pathname]);
  return visited || location.pathname === '/' ? (
    <div hidden={location.pathname !== '/'}>
      <Home dependencies={dependencies} />
    </div>
  ) : null;
}
export function AppRouter({ dependencies }) {
  return (
    <BrowserRouter>
      <a className="skipLink" href="#main-content">
        Przejdź do treści
      </a>
      <header className="siteHeader">
        <div className="topbar">
          <Link className="brand" to="/" state={{ overview: true }}>
            <span className="brandMark" aria-hidden="true">
              O
            </span>
            <span>
              Oszczędności<small>Twój portfel</small>
            </span>
          </Link>
        </div>
      </header>
      <RouteAnnouncement />
      <PersistentHome dependencies={dependencies} />
      <Routes>
        <Route path="/" element={null} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

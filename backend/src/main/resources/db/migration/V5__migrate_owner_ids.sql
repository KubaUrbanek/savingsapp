-- PortfolioUser enum names were persisted before OwnerId was introduced.
-- Convert them once to the stable identifiers emitted by the JSON and web adapters.
update investment_entries set owner = 'jakub' where owner = 'JAKUB';
update investment_entries set owner = 'zosia' where owner = 'ZOSIA';

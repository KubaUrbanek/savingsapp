CREATE TABLE archived_personal_plans AS SELECT * FROM portfolio_plans WHERE scope <> 'household';
ALTER TABLE portfolio_plans ALTER COLUMN bonds NUMERIC(100,50);
ALTER TABLE portfolio_plans ALTER COLUMN gold NUMERIC(100,50);
ALTER TABLE portfolio_plans ALTER COLUMN developed NUMERIC(100,50);
ALTER TABLE portfolio_plans ALTER COLUMN emerging NUMERIC(100,50);
-- Allocation v2 -> v3. Only the household plan remains active. No portfolio events change.
UPDATE portfolio_plans SET
 gold = CAST(stocks AS NUMERIC(100,50)) * CAST(gold AS NUMERIC(100,50)) / 100,
 developed = CAST(stocks AS NUMERIC(100,50)) * CAST(developed AS NUMERIC(100,50)) / 100,
 emerging = CAST(stocks AS NUMERIC(100,50)) * CAST(emerging AS NUMERIC(100,50)) / 100,
 stocks = 0
WHERE scope = 'household';
-- Original personal plans remain in the archive table; none is chosen implicitly.
DELETE FROM portfolio_plans WHERE scope <> 'household';

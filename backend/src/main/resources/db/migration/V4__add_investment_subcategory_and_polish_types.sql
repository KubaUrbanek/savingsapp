alter table investment_entries
    add column subcategory varchar(64);

update investment_entries
set type = 'OBLIGACJE', subcategory = 'TRZYLETNIE'
where type = 'BOND';

update investment_entries
set type = 'GIELDA', subcategory = 'RYNKI_ROZWINIETE'
where type = 'STOCK';

update investment_entries
set type = 'KONTO_OSZCZEDNOSCIOWE'
where type = 'SAVINGS';

create index idx_investment_entries_owner_type_subcategory_date
    on investment_entries (owner, type, subcategory, date desc);

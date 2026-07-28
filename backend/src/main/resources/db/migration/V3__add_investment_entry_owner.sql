alter table investment_entries
    add column owner varchar(64) not null default 'JAKUB';

alter table investment_entries
    alter column owner drop default;

create index idx_investment_entries_owner_type_date on investment_entries (owner, type, date desc);

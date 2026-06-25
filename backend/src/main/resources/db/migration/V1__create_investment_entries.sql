create table investment_entries (
    id uuid primary key,
    type varchar(32) not null,
    value_pln numeric(19, 2) not null,
    date date not null,
    created_at timestamp with time zone not null
);

create index idx_investment_entries_type_date on investment_entries (type, date desc);

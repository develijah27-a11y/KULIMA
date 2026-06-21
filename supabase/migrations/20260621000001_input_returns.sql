-- Input returns: farmer can request to return purchased inputs to supplier

create table if not exists input_returns (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references supplier_orders(id) on delete cascade,
  farmer_id         uuid not null references profiles(id),
  supplier_id       uuid not null references profiles(id),
  reason            text not null,
  quantity_returned numeric(12,2) not null,
  status            text not null default 'pending' check (status in ('pending','approved','rejected')),
  supplier_note     text,
  notes             text,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists input_returns_farmer_id_idx   on input_returns(farmer_id);
create index if not exists input_returns_supplier_id_idx on input_returns(supplier_id);
create index if not exists input_returns_order_id_idx    on input_returns(order_id);
create index if not exists input_returns_status_idx      on input_returns(status);

-- RLS
alter table input_returns enable row level security;

-- Farmer: see their own return requests
create policy "farmer view own returns" on input_returns
  for select using (farmer_id = (select id from profiles where user_id = auth.uid() limit 1));

-- Supplier: see return requests for their orders
create policy "supplier view returns" on input_returns
  for select using (supplier_id = (select id from profiles where user_id = auth.uid() limit 1));

-- Farmer: create return requests
create policy "farmer create return" on input_returns
  for insert with check (farmer_id = (select id from profiles where user_id = auth.uid() limit 1));

-- Supplier: update status
create policy "supplier resolve return" on input_returns
  for update using (supplier_id = (select id from profiles where user_id = auth.uid() limit 1));

-- Admin: full access
create policy "admin full access" on input_returns
  for all using (
    exists (select 1 from profiles where user_id = auth.uid() and (role = 'admin' or roles @> array['admin']))
  );

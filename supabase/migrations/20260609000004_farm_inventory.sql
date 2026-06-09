-- Farm Inventory table
create table if not exists farm_inventory (
  id                  uuid primary key default gen_random_uuid(),
  farmer_id           uuid not null references profiles(id) on delete cascade,
  name                text not null,
  category            text not null default 'other'
                        check (category in ('seeds','fertilizers','pesticides','tools','harvest','other')),
  quantity            numeric not null default 0,
  unit                text not null default 'kg',
  low_stock_threshold numeric,
  cost_per_unit       numeric,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table farm_inventory enable row level security;

create policy "Farmer manages own inventory" on farm_inventory
  for all using (
    farmer_id in (select id from profiles where user_id = auth.uid())
  )
  with check (
    farmer_id in (select id from profiles where user_id = auth.uid())
  );

create index if not exists farm_inventory_farmer_id_idx on farm_inventory (farmer_id);
create index if not exists farm_inventory_category_idx  on farm_inventory (category);

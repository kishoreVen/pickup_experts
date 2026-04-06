-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  generations_used int default 0,
  generations_reset_at timestamptz default date_trunc('month', now()),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Strategies table
create table public.strategies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  strategy_json jsonb not null,
  is_public boolean default false,
  remix_of uuid references public.strategies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.strategies enable row level security;

create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users manage own strategies" on public.strategies for all using (auth.uid() = user_id);
create policy "Public strategies readable" on public.strategies for select using (is_public = true);

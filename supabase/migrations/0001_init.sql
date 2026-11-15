-- Süper Lig Fantazi: ilk şema
-- Dış kaynak (API-Football) ID'leri api_id kolonlarında tutulur; uygulama bunlara bağımlı değildir.

create type player_position as enum ('GK', 'DEF', 'MID', 'FWD');
create type fixture_status as enum ('scheduled', 'live', 'finished', 'postponed');

create table teams (
  id           bigint generated always as identity primary key,
  api_id       integer unique,
  name         text not null,
  short_name   text not null,
  primary_color text,
  secondary_color text
);

create table players (
  id          bigint generated always as identity primary key,
  api_id      integer unique,
  team_id     bigint not null references teams(id),
  name        text not null,
  position    player_position not null,
  price       numeric(4,1) not null default 5.0,   -- fantazi fiyatı (milyon), elle/formülle girilir
  is_active   boolean not null default true
);
create index on players (team_id);

create table gameweeks (
  id          bigint generated always as identity primary key,
  season      integer not null,
  number      integer not null,
  deadline    timestamptz not null,                 -- transfer/kadro kilidi
  is_current  boolean not null default false,
  unique (season, number)
);

create table fixtures (
  id            bigint generated always as identity primary key,
  api_id        integer unique,
  gameweek_id   bigint references gameweeks(id),    -- ertelenen maçta null olabilir
  home_team_id  bigint not null references teams(id),
  away_team_id  bigint not null references teams(id),
  kickoff       timestamptz not null,
  status        fixture_status not null default 'scheduled',
  home_goals    integer,
  away_goals    integer
);
create index on fixtures (gameweek_id);

-- Ham maç istatistiği; puan hesabı buradan yapılır, puan burada saklanmaz.
create table player_match_stats (
  fixture_id        bigint not null references fixtures(id) on delete cascade,
  player_id         bigint not null references players(id),
  minutes           integer not null default 0,
  goals             integer not null default 0,
  assists           integer not null default 0,
  goals_conceded    integer not null default 0,
  saves             integer not null default 0,
  penalties_saved   integer not null default 0,
  penalties_missed  integer not null default 0,
  yellow_cards      integer not null default 0,
  red_cards         integer not null default 0,
  own_goals         integer not null default 0,
  rating            numeric(3,1),                   -- sağlayıcı maç reytingi (bonus için)
  source            text not null default 'api',    -- 'api' | 'manual'
  updated_at        timestamptz not null default now(),
  primary key (fixture_id, player_id)
);

-- Puan kuralları: kodda değil tabloda. Her satır bir kural.
-- key örn: 'goal', 'assist', 'clean_sheet', 'minutes_60', 'yellow_card'
create table scoring_rules (
  key       text not null,
  position  player_position,                        -- null = tüm mevkiler
  points    numeric(4,1) not null,
  note      text,
  unique nulls not distinct (key, position)
);

-- Kullanıcılar (auth.users'a bağlı)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  team_name     text,
  created_at    timestamptz not null default now()
);

create table squads (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  gameweek_id bigint not null references gameweeks(id),
  player_id   bigint not null references players(id),
  is_starter  boolean not null default true,
  is_captain  boolean not null default false,
  is_vice     boolean not null default false,
  unique (user_id, gameweek_id, player_id)
);

create table transfers (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references profiles(id) on delete cascade,
  gameweek_id   bigint not null references gameweeks(id),
  player_in_id  bigint not null references players(id),
  player_out_id bigint not null references players(id),
  created_at    timestamptz not null default now()
);

create table leagues (
  id          bigint generated always as identity primary key,
  name        text not null,
  invite_code text not null unique,
  owner_id    uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

create table league_members (
  league_id bigint not null references leagues(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  primary key (league_id, user_id)
);

-- Row Level Security: kullanıcı verisi sadece sahibine açık, oyun verisi herkese okunur.
alter table profiles       enable row level security;
alter table squads         enable row level security;
alter table transfers      enable row level security;
alter table leagues        enable row level security;
alter table league_members enable row level security;

create policy "profil okuma"   on profiles for select using (true);
create policy "profil yazma"   on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "kadro okuma"    on squads for select using (true);
create policy "kadro yazma"    on squads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transfer okuma" on transfers for select using (auth.uid() = user_id);
create policy "transfer yazma" on transfers for insert with check (auth.uid() = user_id);
create policy "lig okuma"      on leagues for select using (true);
create policy "lig yazma"      on leagues for insert with check (auth.uid() = owner_id);
create policy "uye okuma"      on league_members for select using (true);
create policy "uye yazma"      on league_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Oyun verisi (teams, players, fixtures, stats, rules): herkes okur, yalnızca service role yazar.
alter table teams              enable row level security;
alter table players            enable row level security;
alter table gameweeks          enable row level security;
alter table fixtures           enable row level security;
alter table player_match_stats enable row level security;
alter table scoring_rules      enable row level security;

create policy "herkes okur" on teams              for select using (true);
create policy "herkes okur" on players            for select using (true);
create policy "herkes okur" on gameweeks          for select using (true);
create policy "herkes okur" on fixtures           for select using (true);
create policy "herkes okur" on player_match_stats for select using (true);
create policy "herkes okur" on scoring_rules      for select using (true);

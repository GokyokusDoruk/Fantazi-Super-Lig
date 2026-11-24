-- 0002: maç puanlarını saklayan kolonlar ve arayüzün okuduğu görünümler.
--
-- Puanlama kuralları TypeScript'te (src/lib/scoring) tek kaynakta durur.
-- Buradaki görünümler kural hesaplamaz, yalnızca hazır puanları toplar.

alter table player_match_stats
  add column if not exists points       integer not null default 0,
  add column if not exists bonus_points integer not null default 0,
  add column if not exists started      boolean not null default false;

comment on column player_match_stats.points is
  'Maç puanı, bonus hariç. scorePlayer() ile hesaplanıp yükleyicide yazılır.';
comment on column player_match_stats.bonus_points is
  'Reytinge göre maç bonusu (3/2/1). bonusForStats() ile hesaplanır.';

-- Oyuncunun sezon toplamı. Oynamadığı maç satır olarak gelmediği için
-- toplamlar kapsanan maçlar üzerinden çıkar.
create or replace view player_season_totals
with (security_invoker = on) as
select
  p.id                                                as player_id,
  p.name,
  p.position,
  p.price,
  t.name                                              as team_name,
  lower(t.short_name)                                 as team_slug,
  s.season,
  count(s.fixture_id) filter (where s.minutes > 0)::int as matches,
  coalesce(sum(s.goals), 0)::int                      as goals,
  coalesce(sum(s.assists), 0)::int                    as assists,
  coalesce(sum(s.points + s.bonus_points), 0)::int    as points
from players p
join teams t on t.id = p.team_id
left join (
  select st.*, g.season
  from player_match_stats st
  join fixtures f on f.id = st.fixture_id
  join gameweeks g on g.id = f.gameweek_id
) s on s.player_id = p.id
group by p.id, p.name, p.position, p.price, t.name, t.short_name, s.season;

-- Maç sonuçları, takım adlarıyla. has_stats: o maçın oyuncu verisi çekilmiş mi.
create or replace view fixture_results
with (security_invoker = on) as
select
  f.id                                      as fixture_id,
  g.season,
  g.number                                  as gameweek,
  f.kickoff,
  f.status,
  f.home_goals,
  f.away_goals,
  ht.name                                   as home_name,
  lower(ht.short_name)                      as home_slug,
  at.name                                   as away_name,
  lower(at.short_name)                      as away_slug,
  exists (
    select 1 from player_match_stats s where s.fixture_id = f.id
  )                                         as has_stats
from fixtures f
join teams ht on ht.id = f.home_team_id
join teams at on at.id = f.away_team_id
left join gameweeks g on g.id = f.gameweek_id;

-- Haftalık oyuncu performansları. Mevki, oyuncunun sabit fantazi mevkisidir.
create or replace view gameweek_player_points
with (security_invoker = on) as
select
  g.season,
  g.number            as gameweek,
  p.id                as player_id,
  p.name,
  p.position,
  t.name              as team_name,
  lower(t.short_name) as team_slug,
  s.minutes,
  s.started,
  s.goals,
  s.assists,
  s.goals_conceded,
  s.saves,
  s.penalties_saved,
  s.penalties_missed,
  s.yellow_cards,
  s.red_cards,
  s.own_goals,
  s.rating,
  s.points,
  s.bonus_points
from player_match_stats s
join fixtures f on f.id = s.fixture_id
join gameweeks g on g.id = f.gameweek_id
join players p on p.id = s.player_id
join teams t on t.id = p.team_id;

-- Hafta başına kapsama: kaç maçın oyuncu verisi var.
create or replace view gameweek_coverage
with (security_invoker = on) as
select
  g.season,
  g.number,
  g.deadline,
  count(f.id)::int as fixtures,
  count(f.id) filter (
    where exists (select 1 from player_match_stats s where s.fixture_id = f.id)
  )::int           as covered
from gameweeks g
left join fixtures f on f.gameweek_id = g.id
group by g.season, g.number, g.deadline;

grant select on player_season_totals     to anon, authenticated;
grant select on fixture_results          to anon, authenticated;
grant select on gameweek_player_points   to anon, authenticated;
grant select on gameweek_coverage        to anon, authenticated;

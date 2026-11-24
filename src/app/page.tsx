import Link from "next/link";
import { Notice, Row, Table, Td, Th } from "@/components/table";
import { formatDayTime } from "@/lib/format";
import { POSITION_LABEL, POSITION_SHORT } from "@/lib/labels";
import {
  getFixtures,
  getGameweekPlayers,
  getGameweeks,
  getLastCoveredGameweek,
} from "@/lib/queries/gameweeks";
import { getPlayerTotals } from "@/lib/queries/players";

const SEASON_TOP = 10;
const WEEK_TOP = 5;

export default async function Home() {
  const [week, players, weeks] = await Promise.all([
    getLastCoveredGameweek(),
    getPlayerTotals(),
    getGameweeks(),
  ]);
  const covered = weeks.reduce((a, w) => a + w.covered, 0);
  const total = weeks.reduce((a, w) => a + w.fixtures, 0);

  const [fixtures, weekPlayers] =
    week === null
      ? [[], []]
      : await Promise.all([getFixtures(week), getGameweekPlayers(week, WEEK_TOP)]);

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Fantazi <span className="text-accent">Süper Lig</span>
        </h1>
        <p className="max-w-prose text-sm text-muted">
          Süper Lig oyuncularının fantazi puanları. Puanlar maç istatistiklerinden kendi
          kurallarımızla hesaplanıyor: mevkiye göre gol puanı, clean sheet, kurtarış, kart
          cezaları ve maç reytingine göre bonus. Şu an {total} maçlık 2024 sezonunun{" "}
          {covered} maçı işlendi.
        </p>
      </section>

      {week === null ? (
        <Notice>Henüz oyuncu verisi olan bir hafta yok.</Notice>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium">{week}. hafta</h2>
            <Link href={`/haftalar/${week}`} className="text-sm text-accent hover:underline">
              Haftanın tamamı →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <ul className="divide-y divide-line/60 rounded-lg border border-line text-sm">
              {fixtures.map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="flex-1 truncate text-right">{f.homeName}</span>
                  <span className="tabular w-12 shrink-0 text-center font-semibold">
                    {f.homeGoals === null || f.awayGoals === null
                      ? "–"
                      : `${f.homeGoals}-${f.awayGoals}`}
                  </span>
                  <span className="flex-1 truncate">{f.awayName}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                Haftanın en iyileri
              </h3>
              <ul className="divide-y divide-line/60 rounded-lg border border-line text-sm">
                {weekPlayers.map((p) => (
                  <li key={p.playerId} className="flex items-baseline gap-2 px-3 py-1.5">
                    <span className="truncate font-medium">{p.name}</span>
                    <abbr
                      title={POSITION_LABEL[p.position]}
                      className="text-xs text-muted no-underline"
                    >
                      {POSITION_SHORT[p.position]}
                    </abbr>
                    <span className="tabular ml-auto font-semibold">{p.points + p.bonus}</span>
                  </li>
                ))}
              </ul>
              {fixtures[0] && (
                <p className="text-xs text-muted">
                  Hafta {formatDayTime(fixtures[0].kickoff)} itibarıyla başladı.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium">Sezonun en iyileri</h2>
          <Link href="/oyuncular" className="text-sm text-accent hover:underline">
            Bütün oyuncular →
          </Link>
        </div>
        <Table
          head={
            <>
              <Th>Oyuncu</Th>
              <Th>Takım</Th>
              <Th>Mevki</Th>
              <Th numeric>Maç</Th>
              <Th numeric>Puan</Th>
            </>
          }
        >
          {players.slice(0, SEASON_TOP).map((p) => (
            <Row key={p.id}>
              <Td>{p.name}</Td>
              <Td muted>
                <Link href={`/takimlar/${p.teamSlug}`} className="hover:text-foreground">
                  {p.teamName}
                </Link>
              </Td>
              <Td muted>
                <abbr title={POSITION_LABEL[p.position]} className="no-underline">
                  {POSITION_SHORT[p.position]}
                </abbr>
              </Td>
              <Td numeric muted>
                {p.matches}
              </Td>
              <Td numeric>
                <strong className="font-semibold">{p.points}</strong>
              </Td>
            </Row>
          ))}
        </Table>
      </section>
    </div>
  );
}

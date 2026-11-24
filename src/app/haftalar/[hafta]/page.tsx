import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/table";
import { formatDayTime, signed } from "@/lib/format";
import { POSITION_LABEL, POSITION_SHORT } from "@/lib/labels";
import { getFixtures, getGameweekPlayers } from "@/lib/queries/gameweeks";
import { GAMEWEEKS_PER_SEASON } from "@/lib/season";
import { pointsBreakdown } from "@/lib/scoring/breakdown";
import { DEFAULT_RULES } from "@/lib/scoring/default-rules";

const TOP_PLAYERS = 10;

/**
 * Sayfa hafta numarasını render etmeden önce doğrular, böylece geçersiz adres
 * gerçek 404 alır. Bunun için bloklayan route gerekiyor; 38 haftanın hepsi
 * generateStaticParams ile derlemede üretildiği için gerçek kullanıcı
 * hiçbir zaman beklemiyor.
 */
export const instant = false;

export function generateStaticParams() {
  return Array.from({ length: GAMEWEEKS_PER_SEASON }, (_, i) => ({ hafta: String(i + 1) }));
}

/** Yol parametresi 1 ile 38 arasında bir tam sayı olmalı. */
function parseGameweek(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= GAMEWEEKS_PER_SEASON ? n : null;
}

export async function generateMetadata(
  props: PageProps<"/haftalar/[hafta]">,
): Promise<Metadata> {
  const { hafta } = await props.params;
  const week = parseGameweek(hafta);
  return week === null
    ? { title: "Hafta bulunamadı — Fantazi Süper Lig" }
    : {
        title: `${week}. hafta — Fantazi Süper Lig`,
        description: `Süper Lig ${week}. hafta sonuçları ve haftanın en yüksek fantazi puanları.`,
      };
}

export default async function GameweekPage(props: PageProps<"/haftalar/[hafta]">) {
  const { hafta } = await props.params;
  const week = parseGameweek(hafta);
  if (week === null) notFound();

  const [fixtures, players] = await Promise.all([
    getFixtures(week),
    getGameweekPlayers(week, TOP_PLAYERS),
  ]);
  if (fixtures.length === 0) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{week}. hafta</h1>
        <div className="flex gap-3 text-sm text-muted">
          {week > 1 && (
            <Link href={`/haftalar/${week - 1}`} className="hover:text-foreground">
              ← {week - 1}. hafta
            </Link>
          )}
          {week < GAMEWEEKS_PER_SEASON && (
            <Link href={`/haftalar/${week + 1}`} className="hover:text-foreground">
              {week + 1}. hafta →
            </Link>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Sonuçlar</h2>
        <ul className="divide-y divide-line/60 rounded-lg border border-line">
          {fixtures.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-32 shrink-0 text-xs text-muted">{formatDayTime(f.kickoff)}</span>
              <span className="flex-1 text-right">
                <Link href={`/takimlar/${f.homeSlug}`} className="hover:text-accent">
                  {f.homeName}
                </Link>
              </span>
              <span className="tabular w-14 shrink-0 text-center font-semibold">
                {f.homeGoals === null || f.awayGoals === null
                  ? "–"
                  : `${f.homeGoals} - ${f.awayGoals}`}
              </span>
              <span className="flex-1">
                <Link href={`/takimlar/${f.awaySlug}`} className="hover:text-accent">
                  {f.awayName}
                </Link>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Haftanın en iyileri</h2>
        {players.length === 0 ? (
          <Notice>
            Bu haftanın oyuncu verisi henüz çekilmedi. Ücretsiz API planı günde 100 istek
            verdiği için sezon maç maç indiriliyor; bu hafta sıraya girdiğinde puanlar
            kendiliğinden görünecek.
          </Notice>
        ) : (
          <ol className="space-y-2">
            {players.map((p, i) => {
              const items = pointsBreakdown(p.stats, DEFAULT_RULES, p.bonus);
              return (
                <li key={p.playerId} className="rounded-lg border border-line px-3 py-2 text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="tabular w-5 shrink-0 text-xs text-muted">{i + 1}.</span>
                    <span className="font-medium">{p.name}</span>
                    <abbr
                      title={POSITION_LABEL[p.position]}
                      className="text-xs text-muted no-underline"
                    >
                      {POSITION_SHORT[p.position]}
                    </abbr>
                    <Link
                      href={`/takimlar/${p.teamSlug}`}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      {p.teamName}
                    </Link>
                    <span className="tabular ml-auto font-semibold">
                      {p.points + p.bonus} puan
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-7 text-xs text-muted">
                    {items.map((item) => (
                      <span key={item.label}>
                        {item.label} <span className="tabular">{signed(item.points)}</span>
                      </span>
                    ))}
                    {p.rating !== null && <span>reyting {p.rating.toFixed(1)}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

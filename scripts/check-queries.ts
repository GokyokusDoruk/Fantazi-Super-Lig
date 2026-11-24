/**
 * Sorgu katmanını gerçek veritabanına karşı çalıştırıp özet basar.
 * Sayfaları açmadan sorguların doğru şekilde döndüğünü görmek için.
 *
 * Kullanım: npm run check:queries
 */
import { getLastCoveredGameweek, getFixtures, getGameweekPlayers, getGameweeks } from "../src/lib/queries/gameweeks";
import { getPlayerTotals, getTeamSquad } from "../src/lib/queries/players";
import { getTeam, getTeams } from "../src/lib/queries/teams";
import { pointsBreakdown } from "../src/lib/scoring/breakdown";
import { DEFAULT_RULES } from "../src/lib/scoring/default-rules";

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const players = await getPlayerTotals();
  console.log(`oyuncu: ${players.length}`);
  if (players.length === 0) fail("oyuncu listesi boş");

  const top = players[0];
  console.log(`en yüksek: ${top.name} (${top.teamName}) ${top.points} puan, ${top.matches} maç`);

  for (const p of players) {
    for (const [key, value] of Object.entries(p)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        fail(`${p.name}: ${key} sayı değil (${value})`);
      }
    }
    if (p.matches < 0 || p.points === null) fail(`${p.name}: geçersiz toplam`);
  }
  const idle = players.filter((p) => p.matches === 0);
  console.log(`hiç oynamamış oyuncu: ${idle.length} (hepsi 0 puan: ${idle.every((p) => p.points === 0)})`);

  const weeks = await getGameweeks();
  const fullyCovered = weeks.filter((w) => w.fixtures > 0 && w.covered === w.fixtures);
  console.log(`hafta: ${weeks.length}, tam kapsanan: ${fullyCovered.length}`);
  console.log(`son kapsanan hafta: ${await getLastCoveredGameweek()}`);

  for (const week of [1, 12]) {
    const fixtures = await getFixtures(week);
    const gwPlayers = await getGameweekPlayers(week, 10);
    console.log(`${week}. hafta: ${fixtures.length} maç, ${gwPlayers.length} oyuncu`);
    const best = gwPlayers[0];
    if (best) {
      const items = pointsBreakdown(best.stats, DEFAULT_RULES, best.bonus);
      const sum = items.reduce((a, i) => a + i.points, 0);
      console.log(
        `  en iyi: ${best.name} ${best.points}+${best.bonus} = ${best.points + best.bonus}, ` +
          `döküm toplamı ${sum} [${items.map((i) => `${i.label} ${i.points}`).join(", ")}]`,
      );
      if (sum !== best.points + best.bonus) fail("döküm toplamı puanla uyuşmuyor");
    }
  }

  const teams = await getTeams();
  console.log(`takım: ${teams.length}, slug örnekleri: ${teams.slice(0, 4).map((t) => t.slug).join(", ")}`);
  if (await getTeam("xyz")) fail("olmayan slug takım döndürdü");

  const squad = await getTeamSquad(teams[0].slug);
  console.log(`${teams[0].name} kadrosu: ${squad.length} oyuncu`);
  if (squad.length === 0) fail(`${teams[0].slug} kadrosu boş`);

  console.log("Sorgular tamam.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

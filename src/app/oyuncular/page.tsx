import type { Metadata } from "next";
import { getGameweeks } from "@/lib/queries/gameweeks";
import { getPlayerTotals } from "@/lib/queries/players";
import { PlayerTable } from "./player-table";

export const metadata: Metadata = {
  title: "Oyuncular — Fantazi Süper Lig",
  description: "Süper Lig oyuncularının fantazi puanları, mevki ve takıma göre süzülebilir.",
};

export default async function PlayersPage() {
  const [players, weeks] = await Promise.all([getPlayerTotals(), getGameweeks()]);
  const covered = weeks.reduce((a, w) => a + w.covered, 0);
  const total = weeks.reduce((a, w) => a + w.fixtures, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Oyuncular</h1>
        <p className="text-sm text-muted">
          Puanlar verisi çekilmiş {covered} maç üzerinden: {total} maçlık sezonun %
          {Math.round((covered / total) * 100)}&apos;si.
        </p>
      </div>
      <PlayerTable players={players} />
    </div>
  );
}

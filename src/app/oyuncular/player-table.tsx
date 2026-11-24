"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Row, Table, Td, Th } from "@/components/table";
import { POSITION_LABEL, POSITION_ORDER, POSITION_SHORT } from "@/lib/labels";
import type { PlayerTotal } from "@/lib/queries/players";
import type { Position } from "@/lib/scoring/types";

/**
 * Süzgeçler bellekte çalışır: liste zaten sunucudan bütün hâlinde geliyor,
 * böylece sayfa statik kalır ve süzme anında olur.
 */
export function PlayerTable({ players }: { players: PlayerTotal[] }) {
  const [position, setPosition] = useState<Position | "">("");
  const [team, setTeam] = useState("");
  const [search, setSearch] = useState("");

  const teams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of players) seen.set(p.teamSlug, p.teamName);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], "tr"));
  }, [players]);

  const shown = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr");
    return players.filter(
      (p) =>
        (position === "" || p.position === position) &&
        (team === "" || p.teamSlug === team) &&
        (needle === "" || p.name.toLocaleLowerCase("tr").includes(needle)),
    );
  }, [players, position, team, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Oyuncu ara"
          aria-label="Oyuncu ara"
          className="min-w-40 flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        />
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as Position | "")}
          aria-label="Mevki"
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">Tüm mevkiler</option>
          {POSITION_ORDER.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]}
            </option>
          ))}
        </select>
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          aria-label="Takım"
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">Tüm takımlar</option>
          {teams.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted">{shown.length} oyuncu</p>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          Bu süzgeçlere uyan oyuncu yok.
        </p>
      ) : (
        <Table
          head={
            <>
              <Th>Oyuncu</Th>
              <Th>Takım</Th>
              <Th>Mevki</Th>
              <Th numeric>Maç</Th>
              <Th numeric>Gol</Th>
              <Th numeric>As.</Th>
              <Th numeric>Puan</Th>
            </>
          }
        >
          {shown.map((p) => (
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
              <Td numeric>{p.goals}</Td>
              <Td numeric>{p.assists}</Td>
              <Td numeric>
                <strong className="font-semibold">{p.points}</strong>
              </Td>
            </Row>
          ))}
        </Table>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Row, Table, Td, Th } from "@/components/table";
import { formatDay } from "@/lib/format";
import { getGameweeks } from "@/lib/queries/gameweeks";

export const metadata: Metadata = {
  title: "Haftalar — Fantazi Süper Lig",
  description: "Süper Lig 2024 sezonunun haftaları, maç sonuçları ve veri kapsamı.",
};

export default async function GameweeksPage() {
  const weeks = await getGameweeks();
  const covered = weeks.filter((w) => w.covered > 0).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Haftalar</h1>
        <p className="text-sm text-muted">
          {weeks.length} haftanın {covered} tanesinin oyuncu verisi çekildi. Verisi olmayan
          haftalarda maç sonuçları görünür, oyuncu puanları henüz görünmez.
        </p>
      </div>

      <Table
        head={
          <>
            <Th>Hafta</Th>
            <Th>Kadro kilidi</Th>
            <Th numeric>Maç</Th>
            <Th numeric>Oyuncu verisi</Th>
          </>
        }
      >
        {weeks.map((w) => {
          const full = w.fixtures > 0 && w.covered === w.fixtures;
          return (
            <Row key={w.number}>
              <Td>
                <Link href={`/haftalar/${w.number}`} className="text-accent hover:underline">
                  {w.number}. hafta
                </Link>
              </Td>
              <Td muted>{formatDay(w.deadline)}</Td>
              <Td numeric muted>
                {w.fixtures}
              </Td>
              <Td numeric muted={!full}>
                {w.covered === 0 ? "veri yok" : `${w.covered}/${w.fixtures} maç`}
              </Td>
            </Row>
          );
        })}
      </Table>
    </div>
  );
}

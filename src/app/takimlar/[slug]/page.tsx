import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Row, Table, Td, Th } from "@/components/table";
import { POSITION_LABEL, POSITION_ORDER } from "@/lib/labels";
import { getTeamSquad } from "@/lib/queries/players";
import { getTeam, getTeams } from "@/lib/queries/teams";

/** Bilinmeyen slug gerçek 404 alsın diye bloklayan route; bkz. haftalar sayfası. */
export const instant = false;

export async function generateStaticParams() {
  const teams = await getTeams();
  return teams.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(
  props: PageProps<"/takimlar/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const team = await getTeam(slug);
  return team === null
    ? { title: "Takım bulunamadı — Fantazi Süper Lig" }
    : {
        title: `${team.name} — Fantazi Süper Lig`,
        description: `${team.name} kadrosunun fantazi puanları.`,
      };
}

export default async function TeamPage(props: PageProps<"/takimlar/[slug]">) {
  const { slug } = await props.params;
  const team = await getTeam(slug);
  if (team === null) notFound();

  const squad = await getTeamSquad(slug);
  const total = squad.reduce((a, p) => a + p.points, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
        <p className="text-sm text-muted">
          {squad.length} oyuncu, toplam {total} fantazi puanı.
        </p>
      </div>

      {POSITION_ORDER.map((position) => {
        const group = squad.filter((p) => p.position === position);
        if (group.length === 0) return null;
        return (
          <section key={position} className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
              {POSITION_LABEL[position]}
            </h2>
            <Table
              head={
                <>
                  <Th>Oyuncu</Th>
                  <Th numeric>Maç</Th>
                  <Th numeric>Gol</Th>
                  <Th numeric>As.</Th>
                  <Th numeric>Puan</Th>
                </>
              }
            >
              {group.map((p) => (
                <Row key={p.id}>
                  <Td>{p.name}</Td>
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
          </section>
        );
      })}
    </div>
  );
}

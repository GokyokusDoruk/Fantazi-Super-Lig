import type { Metadata } from "next";
import Link from "next/link";
import { getTeams } from "@/lib/queries/teams";

export const metadata: Metadata = {
  title: "Takımlar — Fantazi Süper Lig",
  description: "Süper Lig takımları ve kadrolarının fantazi puanları.",
};

export default async function TeamsPage() {
  const teams = await getTeams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Takımlar</h1>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/takimlar/${t.slug}`}
              className="flex items-baseline gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-accent"
            >
              <span className="font-medium">{t.name}</span>
              <span className="ml-auto text-xs uppercase text-muted">{t.shortName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

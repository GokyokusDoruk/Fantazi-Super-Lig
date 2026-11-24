import { createPublicClient } from "../supabase/public";

export interface TeamRow {
  name: string;
  slug: string;
  shortName: string;
}

interface Row {
  name: string;
  short_name: string;
}

const toTeam = (r: Row): TeamRow => ({
  name: r.name,
  slug: r.short_name.toLowerCase(),
  shortName: r.short_name,
});

/** Ligdeki takımlar, ada göre sıralı. */
export async function getTeams(): Promise<TeamRow[]> {
  "use cache";
  const db = createPublicClient();
  const { data, error } = await db.from("teams").select("name,short_name").order("name");
  if (error) throw new Error(`takımlar okunamadı: ${error.message}`);
  return (data as Row[]).map(toTeam);
}

/** Slug'a karşılık gelen takım; yoksa null. */
export async function getTeam(slug: string): Promise<TeamRow | null> {
  "use cache";
  const teams = await getTeams();
  return teams.find((t) => t.slug === slug) ?? null;
}

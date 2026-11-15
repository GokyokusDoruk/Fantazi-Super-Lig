import type { Position } from "./scoring/types";

export const SQUAD_RULES = {
  size: 15,
  perPosition: { GK: 2, DEF: 5, MID: 5, FWD: 3 } as Record<Position, number>,
  budget: 100, // milyon
  maxPerClub: 3,
  startersCount: 11,
} as const;

export const TRANSFER_RULES = {
  weeklyAllowance: 2,
  maxBank: 5,
  extraTransferPenalty: 3, // hakkı aşan her transfer için puan cezası
} as const;

export interface SquadMember {
  position: Position;
  teamId: number;
  price: number;
}

/** 15 kişilik kadro kurallarını denetler; hata yoksa boş liste döner. */
export function validateSquad(players: SquadMember[]): string[] {
  const errors: string[] = [];
  if (players.length !== SQUAD_RULES.size) {
    errors.push(`Kadro ${SQUAD_RULES.size} oyuncu olmalı (şu an ${players.length}).`);
  }

  for (const pos of Object.keys(SQUAD_RULES.perPosition) as Position[]) {
    const have = players.filter((p) => p.position === pos).length;
    const need = SQUAD_RULES.perPosition[pos];
    if (have !== need) errors.push(`${pos} sayısı ${need} olmalı (şu an ${have}).`);
  }

  const total = players.reduce((sum, p) => sum + p.price, 0);
  if (total > SQUAD_RULES.budget + 1e-9) {
    errors.push(`Bütçe aşıldı: ${total.toFixed(1)}M / ${SQUAD_RULES.budget}M.`);
  }

  const perClub = new Map<number, number>();
  for (const p of players) perClub.set(p.teamId, (perClub.get(p.teamId) ?? 0) + 1);
  for (const [teamId, n] of perClub) {
    if (n > SQUAD_RULES.maxPerClub) {
      errors.push(`Aynı kulüpten en fazla ${SQUAD_RULES.maxPerClub} oyuncu (kulüp ${teamId}: ${n}).`);
    }
  }
  return errors;
}

/** İlk 11 dizilişi: 1 kaleci, en az 3 defans, 2 orta saha, 1 forvet (FPL benzeri). */
export function validateLineup(starters: Pick<SquadMember, "position">[]): string[] {
  const n = (pos: Position) => starters.filter((p) => p.position === pos).length;
  const errors: string[] = [];
  if (starters.length !== SQUAD_RULES.startersCount) {
    errors.push(`İlk 11 ${SQUAD_RULES.startersCount} oyuncu olmalı (şu an ${starters.length}).`);
  }
  if (n("GK") !== 1) errors.push("İlk 11'de tam 1 kaleci olmalı.");
  if (n("DEF") < 3) errors.push("İlk 11'de en az 3 defans olmalı.");
  if (n("MID") < 2) errors.push("İlk 11'de en az 2 orta saha olmalı.");
  if (n("FWD") < 1) errors.push("İlk 11'de en az 1 forvet olmalı.");
  return errors;
}

/** Bu hafta hakkı aşan transferlerin puan cezası (pozitif sayı). */
export function transferPenalty(available: number, made: number): number {
  return Math.max(0, made - available) * TRANSFER_RULES.extraTransferPenalty;
}

/** Hafta sonunda bir sonraki haftanın transfer hakkı: artan hak + haftalık 2, en fazla 5. */
export function nextAvailableTransfers(available: number, made: number): number {
  const leftover = Math.max(0, available - made);
  return Math.min(leftover + TRANSFER_RULES.weeklyAllowance, TRANSFER_RULES.maxBank);
}

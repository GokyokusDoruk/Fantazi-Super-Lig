import type { Position } from "./scoring/types";

/** Mevkilerin ekranda görünen adı. Ham kod (GK, FWD) arayüzde kullanılmaz. */
export const POSITION_LABEL: Record<Position, string> = {
  GK: "Kaleci",
  DEF: "Defans",
  MID: "Orta saha",
  FWD: "Forvet",
};

/** Dar alanlar (tablo kolonu, rozet) için kısaltma. */
export const POSITION_SHORT: Record<Position, string> = {
  GK: "KL",
  DEF: "DF",
  MID: "OS",
  FWD: "FV",
};

/** Mevkilerin sahadaki sırası: kaleciden forvete. */
export const POSITION_ORDER: Position[] = ["GK", "DEF", "MID", "FWD"];

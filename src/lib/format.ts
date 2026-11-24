/** Tarihler Türkiye saatine göre gösterilir; sunucu ve istemci aynı metni üretir. */
const TZ = "Europe/Istanbul";

const dayFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
});

const dayTimeFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

/** "12 Ağustos 2024" */
export const formatDay = (iso: string) => dayFormat.format(new Date(iso));

/** "12 Ağustos 21:45" */
export const formatDayTime = (iso: string) => dayTimeFormat.format(new Date(iso));

/** Negatif puanı eksi işaretiyle, pozitifi artı işaretiyle gösterir. */
export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

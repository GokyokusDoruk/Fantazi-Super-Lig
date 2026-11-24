import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sayfa bulunamadı</h1>
      <p className="text-sm text-muted">
        Aradığın sayfa yok ya da adresi değişmiş.
      </p>
      <Link href="/" className="inline-block text-sm text-accent hover:underline">
        Ana sayfaya dön
      </Link>
    </div>
  );
}

import Link from "next/link";

const LINKS = [
  { href: "/oyuncular", label: "Oyuncular" },
  { href: "/haftalar", label: "Haftalar" },
  { href: "/takimlar", label: "Takımlar" },
];

export function Nav() {
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" className="mr-auto font-semibold tracking-tight">
          Fantazi <span className="text-accent">Süper Lig</span>
        </Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm text-muted hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

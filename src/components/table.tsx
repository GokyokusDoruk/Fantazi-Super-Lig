import type { ReactNode } from "react";

/** Telefonda yatay kaydırmayı tablonun içine hapseden sarmalayıcı. */
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {head}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  numeric = false,
}: {
  children?: ReactNode;
  numeric?: boolean;
}) {
  return (
    <th scope="col" className={`py-2 font-medium ${numeric ? "pl-3 text-right" : "pr-3"}`}>
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric = false,
  muted = false,
}: {
  children?: ReactNode;
  numeric?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`py-2 ${numeric ? "tabular pl-3 text-right" : "pr-3"} ${
        muted ? "text-muted" : ""
      }`}
    >
      {children}
    </td>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-line/60 last:border-0">{children}</tr>;
}

/** Tablo yerine gösterilen açıklama kutusu (boş sonuç, eksik veri). */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
      {children}
    </p>
  );
}

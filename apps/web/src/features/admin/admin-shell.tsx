import Link from 'next/link';
import { AdminBoundary } from './admin-boundary';

const adminLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/users', label: 'Users' },
] as const;

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminBoundary>
      <section className="page-shell grid gap-5 lg:grid-cols-[17rem_1fr]">
        <aside className="surface h-fit overflow-hidden rounded-[2rem]">
          <div className="border-b border-[var(--line)] bg-[var(--ink)] p-5 text-[var(--paper-solid)]">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/55">Operations</p>
            <p className="display-title mt-3 text-4xl">Admin desk</p>
          </div>
          <nav className="grid p-3 text-sm font-semibold uppercase tracking-[0.16em]">
            {adminLinks.map((link) => (
              <Link className="rounded-2xl px-4 py-3 transition hover:bg-white/58" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </section>
    </AdminBoundary>
  );
}

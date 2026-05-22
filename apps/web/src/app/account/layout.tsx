import Link from 'next/link';
import { ProtectedBoundary } from '../../features/auth/protected-boundary';

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedBoundary>
      <section className="page-shell grid gap-5 lg:grid-cols-[15rem_1fr]">
        <nav className="surface h-fit rounded-[1.8rem] p-4 text-sm font-semibold uppercase tracking-[0.16em]">
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account">
            Overview
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/profile">
            Profile
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/addresses">
            Addresses
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/orders">
            Orders
          </Link>
          <Link className="block rounded-2xl px-3 py-3 hover:bg-white/50" href="/account/security">
            Security
          </Link>
        </nav>
        {children}
      </section>
    </ProtectedBoundary>
  );
}

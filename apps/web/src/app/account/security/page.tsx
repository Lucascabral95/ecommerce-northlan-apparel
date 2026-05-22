import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security',
};

export default function SecurityPage() {
  return (
    <div>
      <p className="eyebrow">Security</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">Session boundary</h1>
      <section className="surface mt-7 rounded-[2rem] p-6 text-[var(--muted)]">
        JWT access and refresh tokens are issued through Auth Service. Password change and session
        revocation require dedicated Gateway endpoints before this screen exposes mutations.
      </section>
    </div>
  );
}

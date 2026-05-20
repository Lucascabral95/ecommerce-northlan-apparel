const plannedDomains = [
  'API Gateway',
  'Auth',
  'Users',
  'Catalog',
  'Inventory',
  'Cart',
  'Orders',
  'Payments',
  'Notifications',
] as const;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Northlane Apparel</p>
        <h1>Event-driven commerce foundation for a premium apparel platform.</h1>
        <p className="lede">
          Phase 1 defines the monorepo, tooling and service boundaries. Product, checkout and
          operational workflows will be implemented in later phases.
        </p>
      </section>

      <section className="domains" aria-label="Planned domains">
        {plannedDomains.map((domain) => (
          <article key={domain}>{domain}</article>
        ))}
      </section>
    </main>
  );
}

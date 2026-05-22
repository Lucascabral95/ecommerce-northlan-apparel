export function LoadingCards({ count = 4 }: Readonly<{ count?: number }>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="surface animate-pulse rounded-[1.7rem] p-3"
          key={`skeleton-${index.toString()}`}
        >
          <div className="aspect-[3/4] rounded-[1.2rem] bg-black/8" />
          <div className="mt-4 h-4 w-2/3 rounded-full bg-black/8" />
          <div className="mt-3 h-3 w-1/3 rounded-full bg-black/8" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <section className="surface rounded-[2rem] px-6 py-14 text-center">
      <p className="eyebrow">Northlane edit</p>
      <h2 className="display-title mt-4 text-4xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-xl text-[var(--muted)]">{description}</p>
    </section>
  );
}

export function ErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <section className="rounded-[1.5rem] border border-red-950/18 bg-red-50/55 p-5 text-red-950">
      <p className="text-sm font-semibold uppercase tracking-[0.2em]">Request failed</p>
      <p className="mt-2">{message}</p>
    </section>
  );
}

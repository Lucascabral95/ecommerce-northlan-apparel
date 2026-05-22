import { EmptyState } from '../../shared/ui/states';

export function AdminUsersPage() {
  return (
    <div className="grid gap-5">
      <header className="surface rounded-[2.4rem] p-6">
        <p className="eyebrow">Identity operations</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">Users</h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">
          This route is protected and ready for identity reporting, but it does not fabricate data
          that the Gateway does not expose.
        </p>
      </header>
      <EmptyState
        description="Add a dedicated admin users query in the API Gateway and user-service before exposing personally identifiable profile rows here."
        title="User listing endpoint pending."
      />
    </div>
  );
}

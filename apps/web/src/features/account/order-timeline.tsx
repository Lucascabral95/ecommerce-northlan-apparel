import type { OrderStatusHistoryDto } from '@northlane/contracts';
import { formatDate } from '../../shared/format';

export function OrderTimeline({
  history,
}: Readonly<{ history: readonly OrderStatusHistoryDto[] }>) {
  return (
    <ol className="surface grid gap-0 rounded-[2rem] p-6">
      {history.map((entry, index) => (
        <li className="grid grid-cols-[1.4rem_1fr] gap-4" key={entry.id}>
          <div className="flex flex-col items-center">
            <span className="mt-1 h-3 w-3 rounded-full bg-[var(--accent)]" />
            {index < history.length - 1 ? <span className="h-full w-px bg-[var(--line)]" /> : null}
          </div>
          <div className="pb-6">
            <p className="font-bold uppercase tracking-[0.18em]">{entry.status}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{formatDate(entry.createdAt)}</p>
            {entry.reason ? <p className="mt-2">{entry.reason}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      {body ? <p className="max-w-sm text-[13px] leading-relaxed text-ink-dim">{body}</p> : null}
      {action}
    </div>
  );
}

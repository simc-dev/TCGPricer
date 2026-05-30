"use client";

export function ApprovalGate(props: { required: boolean; reasons: string[] }) {
  if (!props.required) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/20">
        Auto-approved
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger ring-1 ring-danger/20">
        Manual approval required
      </div>
      {props.reasons.length > 0 ? (
        <div className="text-xs text-muted">
          {props.reasons.map((r) => (
            <div key={r} className="truncate">
              {r}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

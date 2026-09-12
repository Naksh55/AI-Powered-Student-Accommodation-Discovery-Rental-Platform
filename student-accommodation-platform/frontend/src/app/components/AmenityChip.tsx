export function AmenityChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center border border-line px-2.5 py-1 text-sm text-ink-soft bg-paper-raised">
      {label}
    </span>
  );
}

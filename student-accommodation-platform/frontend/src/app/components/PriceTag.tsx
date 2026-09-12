export function PriceTag({ amount }: { amount: number }) {
  return (
    <div className="inline-flex items-baseline gap-1 bg-marigold text-ink px-2.5 py-1">
      <span className="font-serif text-lg font-semibold leading-none">
        ₹{amount.toLocaleString("en-IN")}
      </span>
      <span className="text-xs text-ink-soft leading-none">/month</span>
    </div>
  );
}

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
      <span
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
        style={{ animationDelay: '0.2s' }}
      />
      <span
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
        style={{ animationDelay: '0.4s' }}
      />
    </div>
  );
}

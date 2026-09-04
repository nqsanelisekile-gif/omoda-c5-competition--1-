import { useCountdown } from "@/hooks/useCountdown";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CountdownTimer({ closingAt }: { closingAt: number }) {
  const { days, hours, minutes, seconds, isClosed } = useCountdown(closingAt);

  if (isClosed) {
    return (
      <div className="panel inline-flex items-center gap-2 px-5 py-3">
        <span className="h-2 w-2 rounded-full bg-silver" />
        <span className="font-mono text-sm uppercase tracking-widest2 text-silver">
          Entries Closed
        </span>
      </div>
    );
  }

  const units: [number, string][] = [
    [days, "Days"],
    [hours, "Hrs"],
    [minutes, "Min"],
    [seconds, "Sec"],
  ];

  return (
    <div className="inline-flex items-stretch divide-x divide-steel overflow-hidden rounded-sm border border-steel bg-graphite/80">
      {units.map(([value, label]) => (
        <div key={label} className="flex flex-col items-center px-4 py-3 md:px-6">
          <span className="plate-digit text-2xl font-bold text-bone md:text-3xl">
            {pad(value)}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-widest2 text-silver">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

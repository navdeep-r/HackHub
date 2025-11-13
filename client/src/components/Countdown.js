import React, { useEffect, useMemo, useState } from 'react';

function diffParts(targetMs) {
  const total = Math.max(0, targetMs);
  const days = Math.floor(total / (24 * 60 * 60 * 1000));
  const hrs = Math.floor((total % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((total % (60 * 60 * 1000)) / (60 * 1000));
  const secs = Math.floor((total % (60 * 1000)) / 1000);
  return { days, hrs, mins, secs };
}

export default function Countdown({ target, className = '', compact = true, prefix = 'Starts in' }) {
  const targetTime = useMemo(() => (target ? new Date(target).getTime() : null), [target]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetTime) return undefined;
    const tickMs = compact ? 1000 : 1000; // 1s
    const t = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [targetTime, compact]);

  if (!targetTime) return <span className={className}>TBA</span>;

  const remaining = targetTime - now;
  if (remaining <= 0) {
    return <span className={className}>Started</span>;
  }

  const { days, hrs, mins, secs } = diffParts(remaining);
  const two = (n) => String(n).padStart(2, '0');
  const text = compact
    ? (days > 0 ? `${days}d ${two(hrs)}h ${two(mins)}m` : `${two(hrs)}h ${two(mins)}m ${two(secs)}s`)
    : `${days} days ${hrs} hours ${mins} minutes`;

  return (
    <span className={className} title={new Date(targetTime).toLocaleString()}>
      {prefix ? `${prefix} ` : ''}{text}
    </span>
  );
}

'use client';

import React, { useState } from 'react';

/** Single-series bar colour (validated against the light surface). */
const BAR = '#6366f1';

interface ColumnDatum {
  label: string;
  value: number;
  /** Optional detail line shown in the tooltip */
  detail?: string;
}

/**
 * Vertical columns for a single series over time. Each column is focusable and shows a
 * tooltip (value first, label second); a visually hidden table carries the same data.
 */
export function ColumnChart({
  data,
  format = (v: number) => String(v),
  caption,
  height = 180,
}: {
  data: ColumnDatum[];
  format?: (v: number) => string;
  caption: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <figure className="w-full">
      <div className="relative" style={{ height }}>
        {/* Recessive gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-[#e2e8f0]" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1.5">
          {data.map((d, i) => {
            const h = (d.value / max) * 100;
            return (
              <button
                key={d.label}
                type="button"
                className="relative flex-1 h-full flex items-end justify-center outline-none group"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${d.label}: ${format(d.value)}`}
              >
                <span
                  className="w-full max-w-[36px] rounded-t-[4px] transition-all duration-700 ease-out group-hover:brightness-110 group-focus-visible:ring-2 group-focus-visible:ring-indigo-500/40"
                  style={{ height: `${Math.max(h, d.value ? 2 : 0)}%`, background: BAR, opacity: active === null || active === i ? 1 : 0.45 }}
                />
                {active === i && (
                  <span className="absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-lg bg-night-900 px-2.5 py-1.5 text-left shadow-lift pointer-events-none animate-fade-in">
                    <span className="block text-sm font-bold text-white">{format(d.value)}</span>
                    <span className="block text-[11px] text-night-400">{d.detail || d.label}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[2px] sm:gap-1.5" aria-hidden>
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] sm:text-[11px] text-slate-500 truncate">
            {d.label}
          </span>
        ))}
      </div>
      <div className="sr-only">
        <table>
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

/** Horizontal ranked bars for a single series, direct-labelled with the value. */
export function BarList({
  data,
  format = (v: number) => String(v),
  caption,
}: {
  data: { label: string; value: number; sub?: string; href?: string }[];
  format?: (v: number) => string;
  caption: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <ul className="space-y-3.5">
        {data.map((d) => (
          <li key={d.label} className="group" title={`${d.label}: ${format(d.value)}${d.sub ? ` · ${d.sub}` : ''}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-slate-200 truncate">{d.label}</span>
              <span className="shrink-0 font-semibold text-ink tabular-nums">{format(d.value)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-cream-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
                  style={{ width: `${(d.value / max) * 100}%`, background: BAR }}
                />
              </div>
              {d.sub && <span className="w-24 shrink-0 text-right text-xs text-slate-500">{d.sub}</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="sr-only">
        <table>
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
              <td>{d.sub}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

'use client';

import React, { useState } from 'react';

export interface DateRangeValue {
  preset: string;
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function getPresetRange(preset: string): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.setDate(diff));
      return { from: startOfDay(mon), to: endOfDay(new Date()) };
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(first), to: endOfDay(new Date()) };
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function getDefaultDateRange(): DateRangeValue {
  const range = getPresetRange('this_month');
  return { preset: 'this_month', ...range };
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const presets = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'this_week', label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ];

  function toInputDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  function handlePreset(preset: string) {
    if (preset === 'custom') {
      onChange({ ...value, preset: 'custom' });
    } else {
      const range = getPresetRange(preset);
      onChange({ preset, from: range.from, to: range.to });
    }
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, preset: 'custom', from: new Date(e.target.value + 'T00:00:00') });
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, preset: 'custom', to: new Date(e.target.value + 'T23:59:59') });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Period:</span>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              value.preset === p.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toInputDate(value.from)}
            onChange={handleFromChange}
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={toInputDate(value.to)}
            onChange={handleToChange}
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}
    </div>
  );
}

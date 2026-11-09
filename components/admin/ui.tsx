'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-1 text-[12px] text-zinc-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const styles: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50',
    danger: 'bg-white text-red-600 border-red-200 hover:bg-red-50',
    ghost: 'bg-transparent text-zinc-600 border-transparent hover:bg-zinc-100',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {disabled && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
}) {
  const styles: Record<string, string> = {
    neutral: 'bg-zinc-100 text-zinc-600',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = 'neutral',
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'green' | 'amber' | 'red';
  loading?: boolean;
}) {
  const valueColor = {
    neutral: 'text-zinc-900',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }[tone];
  return (
    <Card className="p-4">
      <p className="text-[11px] text-zinc-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-zinc-100" />
      ) : (
        <p className={`mt-1.5 font-mono text-[25px] font-medium leading-none tracking-tight ${valueColor}`}>
          {value}
        </p>
      )}
      {hint && <p className="mt-2 text-[10px] text-zinc-400">{hint}</p>}
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
      <p className="text-[13px] text-zinc-500">{text}</p>
      <p className="text-[11px] text-zinc-400">数据产生后会自动出现在这里，无需手动刷新配置。</p>
    </div>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
      {text}
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{children}</th>;
}

export function Td({ children, className = '', title }: { children: ReactNode; className?: string; title?: string }) {
  return <td title={title} className={`px-3 py-2.5 text-[12px] text-zinc-700 ${className}`}>{children}</td>;
}

export const inputCls =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-50';

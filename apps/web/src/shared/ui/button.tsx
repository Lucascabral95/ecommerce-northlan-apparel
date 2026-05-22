import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: 'ghost' | 'primary' | 'quiet';
};

const styles = {
  ghost: 'border border-[var(--line)] bg-white/35 text-[var(--ink)] hover:bg-white/70',
  primary:
    'bg-[var(--ink)] text-[var(--paper-solid)] shadow-[0_18px_42px_rgba(21,19,15,.25)] hover:bg-[var(--accent)]',
  quiet: 'bg-transparent text-[var(--ink)] hover:bg-black/6',
} as const;

export function Button({ className = '', intent = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold tracking-[0.08em] uppercase transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[intent]} ${className}`}
      {...props}
    />
  );
}

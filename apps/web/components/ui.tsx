"use client";

import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export function Button({
  variant = "secondary",
  small,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; small?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
        small ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
        variants[variant],
        className,
      )}
    />
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500";

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid || undefined} className={cx(inputClass, invalid && "border-red-400", props.className)} />;
}

export function TextArea({ invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea rows={4} {...props} aria-invalid={invalid || undefined} className={cx(inputClass, "resize-y leading-relaxed", invalid && "border-red-400", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, props.className)} />;
}

/** Chip input for short lists (skills, technologies). Enter or comma adds; Backspace on empty removes the last. */
export function TagInput({ id, values, onChange, placeholder, removeLabel }: { id?: string; values: string[]; onChange(values: string[]): void; placeholder?: string; removeLabel: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const lower = new Set(values.map((v) => v.toLowerCase()));
    const fresh = parts.filter((p) => !lower.has(p.toLowerCase()) && lower.add(p.toLowerCase()));
    if (fresh.length) onChange([...values, ...fresh]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 bg-white p-1.5 focus-within:border-brand-500">
      {values.map((value, i) => (
        <span key={`${value}-${i}`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-2 pr-1 text-sm text-slate-800">
          {value}
          <button type="button" aria-label={`${removeLabel}: ${value}`} onClick={() => onChange(values.filter((_, j) => j !== i))} className="rounded px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={values.length === 0 ? placeholder : undefined}
        onChange={(e) => (/[,\n;]/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[,\n;]/.test(text)) {
            e.preventDefault();
            add(text);
          }
        }}
        className="min-w-[8rem] flex-1 border-0 bg-transparent px-1.5 py-1 text-sm outline-none focus:outline-none"
      />
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-slate-200 bg-white", className)}>{children}</div>;
}

export { cx };

"use client";

import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/**
 * Shared primitives for the whole app, in the ThaFlow family look: white
 * surfaces on a warm off-white page, near-black ink, one filled element (the
 * primary action) per screen. See app/globals.css for tokens.
 */

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ControlSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border border-brand bg-brand text-on-brand shadow-soft hover:border-brand-hover hover:bg-brand-hover disabled:border-line disabled:bg-surface disabled:text-faint disabled:shadow-none",
  secondary: "border border-line bg-paper text-ink shadow-soft hover:border-line-strong hover:bg-surface disabled:text-faint disabled:shadow-none disabled:hover:bg-paper",
  ghost: "text-ink-soft hover:bg-surface hover:text-ink disabled:text-faint disabled:hover:bg-transparent",
  danger: "border border-line bg-paper text-danger shadow-soft hover:border-danger disabled:text-faint disabled:shadow-none",
};

const buttonSizes: Record<ControlSize, string> = {
  sm: "h-8 rounded-lg px-2.5 text-[13px]",
  md: "h-9 rounded-lg px-3.5 text-sm",
  lg: "h-12 rounded-xl px-5 text-[15px]",
};

export function Button({
  variant = "secondary",
  size,
  small,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ControlSize;
  /** Shorthand for size="sm". */
  small?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed",
        buttonSizes[size ?? (small ? "sm" : "md")],
        buttonVariants[variant],
        className,
      )}
    />
  );
}

const controlBase =
  "w-full border border-line-strong bg-paper text-ink placeholder:text-faint transition-[border-color,box-shadow] hover:border-faint focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/10";
const controlSizes: Record<ControlSize, string> = {
  sm: "rounded-lg px-2.5 py-1.5 text-sm",
  md: "rounded-lg px-3 py-2 text-sm",
  lg: "rounded-xl px-4 py-3 text-base",
};
/** Fixed heights for single-line controls so an input and a select on one row line up exactly. */
const controlHeights: Record<ControlSize, string> = { sm: "h-8", md: "h-10", lg: "h-12" };
const controlInvalid = "border-danger hover:border-danger focus:border-danger focus:ring-danger/15";

/** Label + control + hint or error. Pass the generated id to the control. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  controlSize = "md",
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; controlSize?: ControlSize }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(controlBase, controlSizes[controlSize], controlHeights[controlSize], invalid && controlInvalid, className)}
    />
  );
}

export function TextArea({
  invalid,
  controlSize = "md",
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; controlSize?: ControlSize }) {
  return (
    <textarea
      rows={4}
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(controlBase, controlSizes[controlSize], "resize-y leading-relaxed", invalid && controlInvalid, className)}
    />
  );
}

export function Select({
  controlSize = "md",
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { controlSize?: ControlSize }) {
  return <select {...props} className={cx(controlBase, controlSizes[controlSize], controlHeights[controlSize], "select-chevron cursor-pointer py-0!", className)} />;
}

/** Chip input for short lists (skills, technologies). Enter or comma adds; Backspace on empty removes the last. */
export function TagInput({
  id,
  values,
  onChange,
  placeholder,
  removeLabel,
  controlSize = "md",
  autoFocus,
}: {
  id?: string;
  values: string[];
  onChange(values: string[]): void;
  placeholder?: string;
  removeLabel: string;
  controlSize?: ControlSize;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const large = controlSize === "lg";
  const add = (raw: string) => {
    const parts = raw
      .split(/[,\n;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const lower = new Set(values.map((v) => v.toLowerCase()));
    const fresh = parts.filter((p) => !lower.has(p.toLowerCase()) && lower.add(p.toLowerCase()));
    if (fresh.length) onChange([...values, ...fresh]);
    setDraft("");
  };
  return (
    <div
      className={cx(
        "flex flex-wrap gap-1.5 border border-line-strong bg-paper transition-[border-color,box-shadow] hover:border-faint focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10",
        large ? "rounded-xl p-2" : "rounded-lg p-1.5",
      )}
    >
      {values.map((value, i) => (
        <span
          key={`${value}-${i}`}
          className={cx("inline-flex items-center gap-1 rounded-md bg-cream text-ink", large ? "py-1 pl-2.5 pr-1 text-[15px]" : "py-0.5 pl-2 pr-1 text-sm")}
        >
          {value}
          <button
            type="button"
            aria-label={`${removeLabel}: ${value}`}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="rounded px-1 text-muted hover:bg-cream-strong hover:text-ink"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        autoFocus={autoFocus}
        placeholder={values.length === 0 ? placeholder : undefined}
        onChange={(e) => (/[,\n;]/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            // Only swallow Enter when it adds a tag, so Enter on an empty box can still submit a surrounding form.
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
        className={cx(
          "min-w-[8rem] flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-faint focus:outline-none focus-visible:outline-none",
          large ? "px-1.5 py-1 text-base" : "px-1.5 py-1 text-sm",
        )}
      />
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-line bg-paper shadow-soft", className)}>{children}</div>;
}

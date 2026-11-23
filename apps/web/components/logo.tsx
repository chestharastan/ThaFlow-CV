import { cx } from "./ui";

/**
 * ThaFlow wordmark.
 *
 * This is a typeset placeholder. To use the official ThaFlow logo, put the file
 * in apps/web/public/brand/ and set LOGO_SRC to its path (for example
 * "/brand/thaflow-logo.svg"); every screen picks it up from here.
 */
const LOGO_SRC: string | null = null;

export function Logo({ className, product = true }: { className?: string; product?: boolean }) {
  return (
    <span className={cx("inline-flex select-none items-baseline gap-1.5 text-[17px] leading-none tracking-tight", className)} lang="en">
      {LOGO_SRC ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LOGO_SRC} alt="ThaFlow" className="h-5 w-auto self-center" />
      ) : (
        <span className="font-bold text-ink">ThaFlow</span>
      )}
      {product && <span className="font-medium text-muted">CV</span>}
    </span>
  );
}

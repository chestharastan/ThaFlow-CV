import { cx } from "./ui";

/**
 * The ThaFlow mark: the dark glyph on the cream "stone". This is the primary
 * brand mark (the black-stone version on the ThaFlow site is only a variant).
 * The same artwork is served as /icon.svg and /brand/thaflow-mark.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 792.53 791.42" className={cx("shrink-0", className)} aria-hidden="true" focusable="false">
      <path
        fill="#f2eee3"
        d="m5.74,347.98c2.95-32.15,5.25-64.36,6.35-96.63C18.74,55.04,169.58,48.29,378.34,7.01c221.05-43.71,381.76,124.54,408.37,292.23,24.98,157.35-28.72,457.08-197.32,488.3-167.89,31.09-510.61-133.44-561.98-187.33C-8.02,563.05-1.58,427.75,5.74,347.98Z"
      />
      <path
        fill="#141414"
        d="m318.8,452.55c0,41.06,31.32,76.2,72.29,78.87,23.42,1.52,44.78-7.4,59.92-22.54,14.02-14.02,22.71-33.37,22.71-54.76v-77.46h0c-15.43,0-27.94-12.51-27.94-27.94h0c0-15.43,12.51-27.94,27.94-27.94h55.87v131.22c0,71.24-55.06,131.56-126.21,135.27-76.86,4-140.47-57.16-140.47-133.15v-245.08h210.8v-55.87s55.87,0,55.87,0v111.75h-210.8v187.64Z"
      />
    </svg>
  );
}

/** Mark plus wordmark, as used in the header of every screen. */
export function Logo({ className, product = true }: { className?: string; product?: boolean }) {
  return (
    <span className={cx("inline-flex select-none items-center gap-2.5 leading-none", className)} lang="en">
      {/* On the off-white page the cream stone needs a hairline to hold its edge. */}
      <LogoMark className="h-8 w-8 drop-shadow-[0_0_0.5px_rgba(20,20,20,0.35)]" />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
        ThaFlow{product ? <span className="font-medium text-muted"> CV</span> : null}
      </span>
    </span>
  );
}

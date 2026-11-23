import type { SVGProps } from "react";

/** Thin line icons in the ThaFlow family style. Decorative by default: pair with text or an aria-label. */
function Icon({ children, className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;
export const ArrowRight = (p: P) => (<Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>);
export const ArrowLeft = (p: P) => (<Icon {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Icon>);
export const Download = (p: P) => (<Icon {...p}><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></Icon>);
export const Check = (p: P) => (<Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>);
export const Undo = (p: P) => (<Icon {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Icon>);
export const Redo = (p: P) => (<Icon {...p}><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Icon>);
export const Close = (p: P) => (<Icon {...p}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Icon>);
export const ChevronDown = (p: P) => (<Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>);
export const ChevronRight = (p: P) => (<Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>);
export const ArrowUp = (p: P) => (<Icon {...p}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></Icon>);
export const ArrowDown = (p: P) => (<Icon {...p}><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></Icon>);
export const Sparkle = (p: P) => (<Icon {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" /></Icon>);

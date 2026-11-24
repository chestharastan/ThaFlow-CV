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
export const Plus = (p: P) => (<Icon {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>);
export const FilePlus = (p: P) => (<Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 11v6" /><path d="M9 14h6" /></Icon>);
export const Files = (p: P) => (<Icon {...p}><path d="M15 3H9a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V6z" /><path d="M15 3v3h3" /><path d="M7 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" /></Icon>);
export const Layout = (p: P) => (<Icon {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16" /><path d="M10 9v12" /></Icon>);
export const Sliders = (p: P) => (<Icon {...p}><path d="M6 4v6M6 14v6M12 4v2M12 10v10M18 4v10M18 18v2" /><path d="M4 12h4M10 8h4M16 16h4" /></Icon>);
export const Help = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6" /><path d="M12 16.8h.01" /></Icon>);
export const Shield = (p: P) => (<Icon {...p}><path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></Icon>);
export const UploadCloud = (p: P) => (<Icon {...p}><path d="M7.5 18.5H7a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1-.5 7.97" /><path d="M12 12v8" /><path d="m8.5 15 3.5-3.5 3.5 3.5" /></Icon>);
export const Folder = (p: P) => (<Icon {...p}><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></Icon>);
export const Camera = (p: P) => (<Icon {...p}><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="12.5" r="3.2" /></Icon>);
export const Cpu = (p: P) => (<Icon {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 10h4v4h-4z" /><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5" /></Icon>);
export const Clock = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>);
export const WifiOff = (p: P) => (<Icon {...p}><path d="M4 4l16 16" /><path d="M8.6 13.3a5 5 0 0 1 4.6-1.2" /><path d="M5.2 10a10 10 0 0 1 3.1-2" /><path d="M12.6 7.1A10 10 0 0 1 18.8 10" /><path d="M12 17.5h.01" /></Icon>);
export const CheckCircle = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.6 12.2 2.3 2.3 4.6-4.8" /></Icon>);
export const MinusCircle = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12h7" /></Icon>);
export const AlertCircle = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.8v4.8" /><path d="M12 16.2h.01" /></Icon>);
export const XCircle = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" /></Icon>);
export const More = (p: P) => (<Icon {...p}><path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.6" /></Icon>);
export const Menu = (p: P) => (<Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>);
export const SidebarToggle = (p: P) => (<Icon {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9 4.5v15" /></Icon>);
export const MessageSquare = (p: P) => (<Icon {...p}><path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5z" /><path d="M8 9.5h8M8 12.5h5" /></Icon>);
export const Image = (p: P) => (<Icon {...p}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 4 3.5 2.5-2 4.5 4" /></Icon>);
export const FileText = (p: P) => (<Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.5 12.5h7M8.5 16h7" /></Icon>);
export const Languages = (p: P) => (<Icon {...p}><path d="M4 6h8M8 4v2M5.5 6c.5 3 2.5 5.5 5.5 7" /><path d="M10.5 6c-.6 3.4-2.7 6.4-6 8" /><path d="m12.5 20 4-9 4 9M14 17h5" /></Icon>);
export const ListCheck = (p: P) => (<Icon {...p}><path d="M11 6h9M11 12h9M11 18h9" /><path d="m4 6 1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" /></Icon>);
export const Lock = (p: P) => (<Icon {...p}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Icon>);
export const Phone = (p: P) => (<Icon {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18.2h2" /></Icon>);
export const HardDrive = (p: P) => (<Icon {...p}><path d="M3.5 13.5 6 6.5A2 2 0 0 1 7.9 5h8.2A2 2 0 0 1 18 6.5l2.5 7" /><rect x="3.5" y="13.5" width="17" height="5.5" rx="1.5" /><path d="M7.5 16.2h.01M10.5 16.2h.01" /></Icon>);
export const Box = (p: P) => (<Icon {...p}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></Icon>);
export const Globe = (p: P) => (<Icon {...p}><circle cx="12" cy="12" r="8.6" /><path d="M3.4 12h17.2M12 3.4c2.6 2.4 3.9 5.3 3.9 8.6s-1.3 6.2-3.9 8.6c-2.6-2.4-3.9-5.3-3.9-8.6s1.3-6.2 3.9-8.6z" /></Icon>);
export const Server = (p: P) => (<Icon {...p}><rect x="4" y="4" width="16" height="7" rx="1.5" /><rect x="4" y="13" width="16" height="7" rx="1.5" /><path d="M8 7.5h.01M8 16.5h.01" /></Icon>);

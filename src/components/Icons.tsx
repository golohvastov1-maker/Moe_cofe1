import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const BrandMark = ({ size = 26, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    <g className="steam" stroke="#8fb3a2" strokeWidth={1.4}>
      <path d="M9 2.9c-.7.8-.7 1.5 0 2.3" />
      <path d="M12 2.3c-.7.8-.7 1.5 0 2.3" />
      <path d="M15 2.9c-.7.8-.7 1.5 0 2.3" />
    </g>
    <g stroke="#f4a83a" strokeWidth={1.8}>
      <path d="M4.5 10.5h15" />
      <path d="M6 10.5V15a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-4.5" />
      <path d="M10 8c0-1.3 4-1.3 4 0" />
    </g>
  </svg>
);

export const IcDash = (p: P) => (
  <Svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><path d="M13.5 17h7M17 13.5v7" /></Svg>
);
export const IcCalendar = (p: P) => (
  <Svg {...p}><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 9.8h16M8.2 3.5V7M15.8 3.5V7" /></Svg>
);
export const IcHat = (p: P) => (
  <Svg {...p}><path d="M17.2 20.5a1 1 0 0 0 1-1v-4.6c0-.5.3-.9.8-1.1a4 4 0 0 0-2.2-7.4 5 5 0 0 0-9.6 0 4 4 0 0 0-2.2 7.4c.5.2.8.6.8 1.1v4.6a1 1 0 0 0 1 1Z" /><path d="M6.8 16.5h10.4" /></Svg>
);
export const IcBasket = (p: P) => (
  <Svg {...p}><path d="M4.6 9.5h14.8l-1.4 8.1a2.6 2.6 0 0 1-2.6 2.2H8.6a2.6 2.6 0 0 1-2.6-2.2L4.6 9.5Z" /><path d="M8.6 9.5 12 4.2l3.4 5.3" /><path d="M9.3 13v3.2M12 13v3.2M14.7 13v3.2" /></Svg>
);
export const IcBriefcase = (p: P) => (
  <Svg {...p}><rect x="3.5" y="7.5" width="17" height="12.5" rx="2.2" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" /><path d="M3.5 12.5c2.8 1.3 5.6 2 8.5 2s5.7-.7 8.5-2" /><path d="M12 13.4v2" /></Svg>
);
export const IcTask = (p: P) => (
  <Svg {...p}><rect x="4.5" y="4.5" width="15" height="16" rx="2.2" /><path d="M9 2.8h6v3.4H9z" /><path d="m8.2 13.2 2.3 2.3 4.8-4.8" /></Svg>
);
export const IcSearch = (p: P) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.3" /><path d="m15.8 15.8 4.2 4.2" /></Svg>
);
export const IcPlus = (p: P) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IcMinus = (p: P) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);
export const IcX = (p: P) => (
  <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
);
export const IcTrash = (p: P) => (
  <Svg {...p}><path d="M4.5 7h15" /><path d="M9.5 7V5.6A1.6 1.6 0 0 1 11.1 4h1.8a1.6 1.6 0 0 1 1.6 1.6V7" /><path d="m6.6 7 .8 11.1a2.5 2.5 0 0 0 2.5 2.4h4.2a2.5 2.5 0 0 0 2.5-2.4L17.4 7" /><path d="M10 11v5.5M14 11v5.5" /></Svg>
);
export const IcPencil = (p: P) => (
  <Svg {...p}><path d="M17 3.3a2.6 2.6 0 0 1 3.7 3.7L7.6 20.1 2.5 21.5l1.4-5.1L17 3.3Z" /><path d="m14.5 5.8 3.7 3.7" /></Svg>
);
export const IcChevronLeft = (p: P) => (
  <Svg {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></Svg>
);
export const IcArrowRight = (p: P) => (
  <Svg {...p}><path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" /></Svg>
);
export const IcCheck = (p: P) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const IcUsers = (p: P) => (
  <Svg {...p}><circle cx="9" cy="8.4" r="3.2" /><path d="M3.6 19.4c.5-3.4 2.7-5.1 5.4-5.1s4.9 1.7 5.4 5.1" /><path d="M15.4 5.5a3.2 3.2 0 0 1 0 5.8M17.2 14.5c2 .6 3 2.2 3.3 4.9" /></Svg>
);
export const IcRuble = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.2" /><path d="M9.6 16.4V7.6h3.3a2.5 2.5 0 0 1 0 5H9.6M8.4 14.6h4.9" /></Svg>
);
export const IcScale = (p: P) => (
  <Svg {...p}><path d="M12 3.5v17M7.5 20.5h9" /><path d="M5 6.5h14l-1.2 3.2a3.4 3.4 0 0 1-3.2 2.3H9.4a3.4 3.4 0 0 1-3.2-2.3L5 6.5Z" /></Svg>
);
export const IcDoc = (p: P) => (
  <Svg {...p}><path d="M6 3.5h8l4 4v13H6v-17Z" /><path d="M14 3.5v4h4" /><path d="M9 12h6M9 15.5h6" /></Svg>
);
export const IcPrinter = (p: P) => (
  <Svg {...p}><path d="M7 8V3.5h10V8" /><rect x="3.5" y="8" width="17" height="8.5" rx="1.8" /><path d="M7 13.5h10v7H7v-7Z" /><path d="M17 10.8h.5" /></Svg>
);
export const IcDownload = (p: P) => (
  <Svg {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></Svg>
);
export const IcUpload = (p: P) => (
  <Svg {...p}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4.5 19.5h15" /></Svg>
);
export const IcReset = (p: P) => (
  <Svg {...p}><path d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3" /><path d="M4.5 12V7.5M4.5 12H9" /></Svg>
);
export const IcClock = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.2" /><path d="M12 7.5V12l3 2" /></Svg>
);
export const IcSpark = (p: P) => (
  <Svg {...p}><path d="M12 3.5 13.8 10 20.5 12l-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2L12 3.5Z" /></Svg>
);
export const IcBook = (p: P) => (
  <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /><path d="M9 8h7" /></Svg>
);
export const IcCart = (p: P) => (
  <Svg {...p}><path d="M4 5h2l2.2 10.4a1.8 1.8 0 0 0 1.8 1.5h6.5a1.8 1.8 0 0 0 1.8-1.4L20 8.2H7" /><circle cx="10.2" cy="20" r="1.3" /><circle cx="16.8" cy="20" r="1.3" /></Svg>
);
export const IcMenuCard = (p: P) => (
  <Svg {...p}><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></Svg>
);
export const IcTable = (p: P) => (
  <Svg {...p}><ellipse cx="12" cy="8.5" rx="8.5" ry="3.2" /><path d="M6 11 4.8 19.5M18 11l1.2 8.5M12 11.7v7.8" /></Svg>
);
export const IcPlate = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="4.4" /></Svg>
);

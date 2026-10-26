import React from 'react';

export type IconName =
  | 'home'
  | 'star'
  | 'paw'
  | 'gear'
  | 'rocket'
  | 'briefcase'
  | 'wind'
  | 'book'
  | 'dumbbell'
  | 'broom'
  | 'moon'
  | 'heart'
  | 'gift'
  | 'flame'
  | 'coin'
  | 'check'
  | 'x'
  | 'bulb'
  | 'cat'
  | 'dog'
  | 'chart';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </>
  ),
  star: <path d="M12 2.5l2.9 6.5 7.1.6-5.4 4.6 1.7 6.9-6.3-3.8-6.3 3.8 1.7-6.9-5.4-4.6 7.1-.6z" />,
  paw: (
    <>
      <ellipse cx={12} cy={15.5} rx={5} ry={4} />
      <circle cx={6.5} cy={8.5} r={1.8} />
      <circle cx={12} cy={6} r={1.8} />
      <circle cx={17.5} cy={8.5} r={1.8} />
    </>
  ),
  gear: (
    <>
      <circle cx={12} cy={12} r={3} />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2.5c3 2 4.5 6 4.5 10 0 2.5-.8 4.3-1.8 5.4l-1-2.6-1.7 1.8-1.7-1.8-1 2.6c-1-1.1-1.8-2.9-1.8-5.4 0-4 1.5-8 4.5-10z" />
      <circle cx={12} cy={10} r={1.4} />
      <path d="M9 18.5c-1 1-1.2 2.5-1.2 3.5 1-.2 2.3-.6 3.2-1.6M15 18.5c1 1 1.2 2.5 1.2 3.5-1-.2-2.3-.6-3.2-1.6" />
    </>
  ),
  briefcase: (
    <>
      <rect x={3} y={7.5} width={18} height={11.5} rx={2} />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
      <path d="M3 12.5h18" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h11.5a2.75 2.75 0 10-2.6-3.7" />
      <path d="M3 16h14a2.75 2.75 0 11-2.6 3.7" />
      <path d="M3 12h7" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5a2 2 0 012-2h5.5v15H6a2 2 0 00-2 2z" />
      <path d="M20 5.5a2 2 0 00-2-2h-5.5v15H18a2 2 0 012 2z" />
    </>
  ),
  dumbbell: (
    <>
      <rect x={2} y={9.5} width={3} height={5} rx={1} />
      <rect x={19} y={9.5} width={3} height={5} rx={1} />
      <rect x={5.5} y={7.5} width={2.3} height={9} rx={1} />
      <rect x={16.2} y={7.5} width={2.3} height={9} rx={1} />
      <path d="M8 12h8" />
    </>
  ),
  broom: (
    <>
      <path d="M20 4L10.5 13.5" />
      <path d="M10.5 13.5l-6 6.3M8 16l-3.3 3.3M12 17.5l-2.8 2.8" />
      <path d="M10.5 13.5l2.3-2.3" />
    </>
  ),
  moon: <path d="M20.5 14.2A8.5 8.5 0 1110 3.7a6.8 6.8 0 0010.5 10.5z" />,
  heart: <path d="M12 20.5s-7.3-4.4-9.7-8.8A5.3 5.3 0 0112 6.4a5.3 5.3 0 019.7 5.3c-2.4 4.4-9.7 8.8-9.7 8.8z" />,
  gift: (
    <>
      <rect x={3.5} y={9} width={17} height={11.5} rx={1} />
      <path d="M3 5.5h18v4H3z" />
      <path d="M12 5.5v15" />
      <path d="M12 5.5C11 2.5 7.5 2 7 4.5c-.3 1.6 1.7 1 5 1zM12 5.5c1-3 4.5-3.5 5-1 .3 1.6-1.7 1-5 1z" />
    </>
  ),
  flame: <path d="M12 2.5c1 3.5-2.3 4.8-2.3 8.2a2.3 2.3 0 004.6 0c0-1.6-.8-2.5-.8-4 1.8 1 3 3.6 3 5.8a4.5 4.5 0 01-9 0c0-4.6 2.8-6.4 4.5-10z" />,
  coin: (
    <>
      <circle cx={12} cy={12} r={9} />
      <circle cx={12} cy={12} r={4.8} />
    </>
  ),
  check: <path d="M5 13l4.5 4.5L19 8" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  bulb: (
    <>
      <circle cx={12} cy={10.5} r={6} />
      <path d="M9.5 17.5h5M10 20h4M12 4.5V2.5" />
    </>
  ),
  cat: (
    <>
      <path d="M4 9l3-5 2 4" />
      <path d="M20 9l-3-5-2 4" />
      <path d="M4 9c0 6 3.5 10 8 10s8-4 8-10c-2 1-5 1.5-8 1.5S6 10 4 9z" />
      <circle cx={9.5} cy={13} r={0.8} fill="currentColor" stroke="none" />
      <circle cx={14.5} cy={13} r={0.8} fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V7M17 16v-8" />
    </>
  ),
  dog: (
    <>
      <path d="M5 6l-2 4 3 1" />
      <path d="M19 6l2 4-3 1" />
      <path d="M5 10c0 6 3 9 7 9s7-3 7-9c-2-3-4.5-4.5-7-4.5S7 7 5 10z" />
      <circle cx={10} cy={13} r={0.8} fill="currentColor" stroke="none" />
      <circle cx={14} cy={13} r={0.8} fill="currentColor" stroke="none" />
    </>
  ),
};

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(paths, value);
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2.75, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none' }}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

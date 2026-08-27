import type { CSSProperties } from 'react';
import { REMIX_ICON_PATHS } from './remix-icon-paths';

interface RemixIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function RemixIcon({ name, size = 14, className, style }: RemixIconProps) {
  const d = REMIX_ICON_PATHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {d ? <path d={d} /> : null}
    </svg>
  );
}

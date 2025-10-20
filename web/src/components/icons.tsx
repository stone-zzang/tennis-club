import type { SVGProps } from 'react';

export function HomeIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} {...props}>
      <path
        d="M3 10.8 12 4l9 6.8v8.2a1 1 0 0 1-1 1h-5.5v-6h-6v6H4a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrophyIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} {...props}>
      <path
        d="M8 4h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21h4" stroke="currentColor" strokeLinecap="round" />
      <path d="M9 17h6v4H9z" fill="currentColor" />
      <path
        d="M4 5h4v2a3 3 0 0 1-3 3H4zM20 5h-4v2a3 3 0 0 0 3 3h1z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserPlusIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} {...props}>
      <path
        d="M15 19a4 4 0 0 0-8 0v1h8zM11 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 11v6M21 14h-6" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} {...props}>
      <path
        d="M12 3 5 5v6c0 5 3.8 9.3 7 10 3.2-.7 7-5 7-10V5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8v4" stroke="currentColor" strokeLinecap="round" />
      <path d="M12 14.5h0.01" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function LogoutIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} {...props}>
      <path
        d="M15 17h3a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 17 5 12l5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 12h11" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

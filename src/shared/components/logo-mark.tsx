/**
 * LogoMark — arc wordmark glyph ported from the CoviCanarias design reference.
 * Gradient terracota → gold → plum. `id` must be unique per page instance
 * (two SVGs sharing a gradient id would collide).
 */
export function LogoMark({
  id = "logo-mark",
  className,
}: {
  id?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 44 30"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={id}
          x1="0"
          y1="0"
          x2="44"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#C75D3F" />
          <stop offset=".5" stopColor="#C9A14A" />
          <stop offset="1" stopColor="#5B3B6B" />
        </linearGradient>
      </defs>
      <path
        d="M14 6 a9 9 0 1 0 0 18 h6"
        stroke={`url(#${id})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 24 a9 9 0 1 0 0 -18 h-6"
        stroke={`url(#${id})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

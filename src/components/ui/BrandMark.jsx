import React from 'react';

const BrandMark = ({ size = 24, className = '' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="32" cy="32" r="26" fill="currentColor" />
    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(3, 105, 161, 0.9)" strokeWidth="3" />
    <path d="M16 20h32" stroke="rgba(248, 250, 252, 0.95)" strokeWidth="3.6" strokeLinecap="round" />
    <path d="M32 20v16" stroke="rgba(248, 250, 252, 0.95)" strokeWidth="4" strokeLinecap="round" />
    <path d="M22 28h10" stroke="rgba(248, 250, 252, 0.95)" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M32 28h10" stroke="rgba(248, 250, 252, 0.95)" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M24 32h16" stroke="rgba(248, 250, 252, 0.95)" strokeWidth="3.2" strokeLinecap="round" />
    <g fill="rgba(248, 250, 252, 0.95)">
      <rect x="19" y="42" width="7" height="2.6" rx="1.2" />
      <rect x="19" y="46" width="7" height="2.6" rx="1.2" />
      <rect x="19" y="50" width="7" height="2.6" rx="1.2" />
      <rect x="24" y="42" width="2.6" height="11" rx="1.2" />

      <rect x="29" y="42" width="7" height="2.6" rx="1.2" />
      <rect x="29" y="46" width="7" height="2.6" rx="1.2" />
      <rect x="29" y="50" width="7" height="2.6" rx="1.2" />
      <rect x="29" y="42" width="2.6" height="11" rx="1.2" />
      <rect x="34" y="46" width="2.6" height="7" rx="1.2" />

      <rect x="39" y="42" width="7" height="2.6" rx="1.2" />
      <rect x="39" y="50" width="7" height="2.6" rx="1.2" />
      <rect x="39" y="42" width="2.6" height="11" rx="1.2" />
      <rect x="44" y="42" width="2.6" height="11" rx="1.2" />
    </g>
  </svg>
);

export default BrandMark;

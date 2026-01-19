import React from 'react';

const BrandMark = ({ size = 24, className = '' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M7.5 9.5h9" />
    <path d="M7.5 14.5h6" />
    <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export default BrandMark;

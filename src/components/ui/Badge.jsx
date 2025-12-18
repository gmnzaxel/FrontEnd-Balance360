import React from 'react';
import clsx from '../../utils/clsx';

const Badge = ({ children, tone = 'neutral', className = '' }) => (
  <span className={clsx('badge', `badge-${tone}`, className)}>{children}</span>
);

export default Badge;

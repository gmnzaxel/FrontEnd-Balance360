import React from 'react';
import clsx from '../../utils/clsx';

const Skeleton = ({ height = 14, width = '100%', className = '' }) => (
  <div
    className={clsx('skeleton', className)}
    style={{ height, width }}
  />
);

export default Skeleton;

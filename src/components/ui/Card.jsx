import React from 'react';
import clsx from '../../utils/clsx';

const Card = ({ title, description, children, className = '', headerSlot }) => (
  <div className={clsx('ui-card', className)}>
    {(title || headerSlot) && (
      <div className="card-head">
        <div>
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </div>
        {headerSlot}
      </div>
    )}
    {children}
  </div>
);

export default Card;

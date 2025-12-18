import React from 'react';
import clsx from '../../utils/clsx';

const Select = ({ label, helper, children, className = '', ...props }) => (
  <label className={clsx('ui-field', className)}>
    {label && <span className="field-label">{label}</span>}
    <div className="field-control">
      <select {...props}>
        {children}
      </select>
    </div>
    {helper && <span className="field-helper">{helper}</span>}
  </label>
);

export default Select;

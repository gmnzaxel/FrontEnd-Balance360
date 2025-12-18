import React from 'react';
import clsx from '../../utils/clsx';

const Input = React.forwardRef(({ label, icon, helper, className = '', ...props }, ref) => (
  <label className={clsx('ui-field', className)}>
    {label && <span className="field-label">{label}</span>}
    <div className={clsx('field-control', icon && 'with-icon')}>
      {icon && <span className="field-icon">{icon}</span>}
      <input ref={ref} {...props} />
    </div>
    {helper && <span className="field-helper">{helper}</span>}
  </label>
));

Input.displayName = 'Input';

export default Input;

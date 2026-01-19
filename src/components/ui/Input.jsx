import React from 'react';
import clsx from '../../utils/clsx';

const Input = React.forwardRef(
  (
    {
      label,
      icon,
      helper,
      error,
      suffix,
      className = '',
      inputClassName = '',
      ...props
    },
    ref,
  ) => (
    <label className={clsx('ui-field', className)}>
      {label && <span className="field-label">{label}</span>}
      <div className={clsx('field-control', icon && 'with-icon', suffix && 'with-suffix')}>
        {icon && <span className="field-icon">{icon}</span>}
        <input ref={ref} className={clsx(inputClassName, error && 'error')} {...props} />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
      {(error || helper) && (
        <span className={clsx('field-helper', error && 'error')}>
          {error || helper}
        </span>
      )}
    </label>
  ),
);

Input.displayName = 'Input';

export default Input;

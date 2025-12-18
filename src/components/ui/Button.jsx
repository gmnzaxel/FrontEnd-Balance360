import React from 'react';
import clsx from '../../utils/clsx';

const Button = ({ children, variant = 'primary', loading = false, fullWidth = false, icon, className = '', ...props }) => (
  <button
    className={clsx('ui-btn', `ui-btn-${variant}`, fullWidth && 'w-full', className)}
    disabled={props.disabled || loading}
    {...props}
  >
    {loading && <span className="spinner" aria-hidden />}
    {icon && <span className="btn-icon-slot">{icon}</span>}
    {children}
  </button>
);

export default Button;

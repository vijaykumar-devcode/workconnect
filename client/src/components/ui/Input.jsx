import React from 'react';

const Input = React.forwardRef(({
  label,
  type = 'text',
  error,
  placeholder = '',
  className = '',
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col space-y-1.5 w-full ${className}`}>
      {label && (
        <label className="text-xs font-bold text-theme-text-secondary uppercase tracking-wider">
          {label} {required && <span className="text-theme-error">*</span>}
        </label>
      )}
      <input
        type={type}
        ref={ref}
        placeholder={placeholder}
        className={`form-input bg-theme-surface border-theme-border text-theme-text-primary ${
          error ? '!border-theme-error/50 focus:ring-theme-error/10' : 'focus:border-brand-blue focus:ring-brand-blue/15'
        }`}
        {...props}
      />
      {error && (
        <span className="text-xs text-theme-error font-semibold animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

import React from 'react';

const Select = React.forwardRef(({
  label,
  options = [],
  error,
  className = '',
  required = false,
  placeholder = 'Select an option',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col space-y-1.5 w-full ${className}`}>
      {label && (
        <label className="text-xs font-bold text-theme-text-secondary uppercase tracking-wider">
          {label} {required && <span className="text-theme-error">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`form-input appearance-none bg-no-repeat cursor-pointer bg-theme-surface border-theme-border text-theme-text-primary ${
          error ? '!border-theme-error/50 focus:ring-theme-error/10' : 'focus:border-brand-blue focus:ring-brand-blue/15'
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%2394a3b8' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
          backgroundPosition: 'calc(100% - 12px) 50%',
        }}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-theme-error font-semibold animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;

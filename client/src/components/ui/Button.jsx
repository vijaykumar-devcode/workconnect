import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95';

  const variants = {
    primary: 'bg-brand-blue hover:bg-brand-secondary text-white shadow-md shadow-brand-blue/15 hover:shadow-brand-blue/25 focus:ring-brand-blue',
    secondary: 'bg-theme-bg border border-theme-border hover:bg-theme-border/50 text-theme-text-primary focus:ring-theme-border',
    outline: 'border border-theme-border bg-theme-surface/50 text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg focus:ring-theme-border',
    danger: 'bg-theme-error hover:bg-theme-error/95 text-white shadow-md shadow-theme-error/10 focus:ring-theme-error',
    success: 'bg-theme-success hover:bg-theme-success/95 text-white focus:ring-theme-success',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4.5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2.5 h-4.5 w-4.5 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;

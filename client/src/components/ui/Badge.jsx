import React from 'react';

const Badge = ({
  children,
  type = 'info', // success, warning, danger, info, neutral
  className = '',
}) => {
  const types = {
    success: 'bg-theme-success/10 text-theme-success border-theme-success/20',
    warning: 'bg-theme-warning/10 text-theme-warning border-theme-warning/20',
    danger: 'bg-theme-error/10 text-theme-error border-theme-error/20',
    info: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    neutral: 'bg-theme-text-secondary/10 text-theme-text-secondary border-theme-text-secondary/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${types[type]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {children}
    </span>
  );
};

export default Badge;

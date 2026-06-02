import React from 'react';

const Card = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div className={`bg-theme-surface border border-theme-border rounded-2xl shadow-sm hover:shadow-md/5 transition-all duration-300 ${className}`}>
      {/* Header */}
      {(title || subtitle || actions) && (
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between flex-wrap gap-4">
          <div>
            {title && (
              <h3 className="text-base font-bold text-theme-text-primary tracking-tight leading-none mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs font-semibold text-theme-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      {/* Body */}
      <div className={`p-5 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;

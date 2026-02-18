import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode; // Action buttons slot
  breadcrumbs?: Array<{ label: string; path?: string }>;
  onBreadcrumbClick?: (path: string) => void;
}

export function PageHeader({
  title,
  description,
  children,
  breadcrumbs,
  onBreadcrumbClick,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-zinc-600">/</span>
                )}
                {crumb.path && index < breadcrumbs.length - 1 ? (
                  <button
                    onClick={() => onBreadcrumbClick?.(crumb.path!)}
                    className="text-zinc-500 hover:text-zinc-700 transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-zinc-500">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title & Description */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons Slot */}
        {children && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {children}
          </div>
        )}
      </div>

      {/* Optional divider */}
      <div className="mt-6 border-b border-zinc-200" />
    </div>
  );
}

// Utility components for common action button styles
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  icon: Icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        inline-flex items-center gap-2 px-4 py-2
        bg-emerald-500 hover:bg-emerald-400
        disabled:bg-emerald-500/50 disabled:cursor-not-allowed
        text-white font-medium text-sm
        rounded-lg transition-all duration-200
        shadow-sm hover:shadow-md
      "
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  icon: Icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        inline-flex items-center gap-2 px-4 py-2
        bg-zinc-100 hover:bg-zinc-200
        disabled:bg-zinc-100/50 disabled:cursor-not-allowed
        text-zinc-700 hover:text-zinc-900 font-medium text-sm
        border border-zinc-200 hover:border-zinc-300
        rounded-lg transition-all duration-200
      "
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled = false,
  icon: Icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        inline-flex items-center gap-2 px-4 py-2
        text-zinc-500 hover:text-zinc-700
        disabled:text-zinc-400 disabled:cursor-not-allowed
        font-medium text-sm
        rounded-lg transition-all duration-200
        hover:bg-zinc-100
      "
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export default PageHeader;

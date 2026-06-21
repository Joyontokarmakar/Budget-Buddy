import React, { forwardRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Loader2, Eye, EyeOff } from 'lucide-react';

// =========================================================================
// BUTTON COMPONENT
// =========================================================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          {
            // Variants
            'bg-primary text-white hover:bg-primary/95 shadow-md shadow-primary/10': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'border border-border bg-transparent text-foreground hover:bg-muted': variant === 'outline',
            'text-foreground hover:bg-muted': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/10': variant === 'destructive',
            // Sizes
            'h-9 px-3 text-xs': size === 'sm',
            'h-11 px-5 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
            'h-11 w-11 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// =========================================================================
// INPUT COMPONENT
// =========================================================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold text-muted-foreground ml-1">{label}</label>}
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3.5 text-muted-foreground pointer-events-none">{icon}</div>}
          <input
            type={isPasswordType && showPassword ? 'text' : type}
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
              icon ? 'pl-10' : '',
              isPasswordType ? 'pr-11' : '',
              error ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' : '',
              className
            )}
            {...props}
          />
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer p-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <span className="text-[11px] font-medium text-destructive ml-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// =========================================================================
// SELECT COMPONENT
// =========================================================================
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold text-muted-foreground ml-1">{label}</label>}
        <select
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' : '',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-[11px] font-medium text-destructive ml-1">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// =========================================================================
// CARD COMPONENTS
// =========================================================================
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md', className)} {...props} />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-bold leading-tight tracking-tight', className)} {...props} />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-xs text-muted-foreground', className)} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex items-center p-5 pt-0 border-t border-border/50 mt-4', className)} {...props} />
);

// =========================================================================
// PROGRESS BAR COMPONENT
// =========================================================================
export interface ProgressProps {
  value: number; // 0 to 100
  className?: string;
  colorType?: 'auto' | 'success' | 'warning' | 'error';
}

export const Progress: React.FC<ProgressProps> = ({ value, className, colorType = 'auto' }) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const getColor = () => {
    if (colorType !== 'auto') {
      if (colorType === 'success') return 'bg-emerald-500';
      if (colorType === 'warning') return 'bg-amber-500';
      return 'bg-rose-500';
    }

    if (clampedValue < 75) return 'bg-emerald-500';
    if (clampedValue < 95) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <div
        className={cn('h-full transition-all duration-500 ease-out', getColor())}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};

// =========================================================================
// BADGE COMPONENT
// =========================================================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'primary', ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200',
        {
          'bg-primary/10 text-primary': variant === 'primary',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': variant === 'success',
          'bg-amber-500/10 text-amber-600 dark:text-amber-400': variant === 'warning',
          'bg-rose-500/10 text-rose-600 dark:text-rose-400': variant === 'destructive',
          'border border-border text-muted-foreground': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
};

// =========================================================================
// DIALOG COMPONENT
// =========================================================================
export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, description, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full sm:max-w-lg bg-card text-card-foreground rounded-t-[24px] sm:rounded-2xl border border-border/80 shadow-2xl p-6 z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 safe-pb max-h-[90vh] overflow-y-auto">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 sm:hidden" onClick={onClose} />

        <div className="flex flex-col space-y-1.5 mb-5 text-left">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="space-y-4">{children}</div>

        {footer && <div className="flex items-center justify-end gap-3 mt-6 border-t border-border/50 pt-4">{footer}</div>}
      </div>
    </div>
  );
};

// =========================================================================
// SPINNER COMPONENT
// =========================================================================
export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className="flex items-center justify-center w-full py-4">
    <Loader2 className={cn('h-8 w-8 animate-spin text-primary', className)} />
  </div>
);

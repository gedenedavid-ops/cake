import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ochre' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-[#F4A236] text-white hover:bg-[#EAA240] active:scale-[0.97]',
  secondary: 'bg-[#F5F3EF] text-[#1A1A1A] hover:bg-[#EDE9E3] active:scale-[0.97] border border-[#E8E4DF]',
  ghost:     'bg-transparent text-[#1A1A1A] hover:bg-[#F5F3EF] active:scale-[0.97]',
  danger:    'bg-red-500 text-white hover:bg-red-600 active:scale-[0.97]',
  ochre:     'bg-[#F4A236] text-white hover:bg-[#EAA240] shadow-sm shadow-[#F4A23640] active:scale-[0.97]',
  dark:      'bg-[#1A1A1A] text-white hover:bg-[#2C2C2C] active:scale-[0.97]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:   'px-3 py-1.5 text-sm rounded-xl h-8',
  md:   'px-4 py-2 text-sm rounded-xl h-10',
  lg:   'px-6 py-3 text-base rounded-2xl h-12',
  icon: 'p-2 rounded-xl h-9 w-9 flex items-center justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

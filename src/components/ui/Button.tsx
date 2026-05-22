'use client';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export function Button({ 
  variant = 'primary', 
  isLoading = false, 
  className = '',
  children,
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 px-6 py-2',
    secondary: 'border border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500 px-6 py-2',
    ghost: 'text-green-600 hover:bg-green-50 focus:ring-green-500 px-4 py-2',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <span className="animate-spin mr-2">⟳</span>
          Loading...
        </span>
      ) : children}
    </button>
  );
}
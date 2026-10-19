import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-sm font-medium text-gray-700 dark:text-dark-text">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors
            bg-white dark:bg-dark-card
            text-gray-900 dark:text-dark-text
            border-gray-300 dark:border-dark-border
            placeholder-gray-400 dark:placeholder-dark-muted
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            ${error ? 'border-red-400' : ''}
            ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input

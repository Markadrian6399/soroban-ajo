import React from 'react'
import { FieldErrors } from 'react-hook-form'
import { FormErrors } from './types'

interface FormFieldProps {
  id: keyof FormErrors
  label: string
  input: React.ReactNode
  touched?: boolean
  error?: string
}

/**
 * Reusable form field component with error display (legacy — used by non-RHF steps)
 */
export const FormField: React.FC<FormFieldProps> = ({ id, label, input, touched, error }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
      {label}
    </label>
    {input}
    {touched && error && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
    )}
  </div>
)

interface ErrorSummaryProps {
  // Accept both RHF FieldErrors and legacy FormErrors
  errors: FieldErrors | FormErrors
  submitted: boolean
}

export const ErrorSummary = React.forwardRef<HTMLDivElement, ErrorSummaryProps>(
  ({ errors, submitted }, ref) => {
    const count = Object.keys(errors).length
    if (!count || !submitted) return null
    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        tabIndex={-1}
      >
        <p className="text-sm font-medium text-red-800">
          Please fix {count} error{count > 1 ? 's' : ''} before continuing
        </p>
      </div>
    )
  }
)

ErrorSummary.displayName = 'ErrorSummary'

'use client'

import React, { useId } from 'react'
import { useFormContext, FieldPath, FieldValues, RegisterOptions } from 'react-hook-form'
import clsx from 'clsx'

interface ValidatedFieldProps<T extends FieldValues> {
  name: FieldPath<T>
  label: string
  required?: boolean
  helperText?: string
  rules?: RegisterOptions<T>
  children: (props: {
    id: string
    errorId: string
    hasError: boolean
    isValid: boolean
    inputProps: ReturnType<ReturnType<typeof useFormContext<T>>['register']>
  }) => React.ReactNode
}

/**
 * Wraps any input with RHF registration, label, error message, success indicator, and ARIA wiring.
 * The `children` render-prop receives bound input props — no extra wrapper needed per field type.
 */
export function ValidatedField<T extends FieldValues>({
  name,
  label,
  required,
  helperText,
  rules,
  children,
}: ValidatedFieldProps<T>) {
  const uid = useId()
  const id = `field-${uid}`
  const errorId = `${id}-error`

  const {
    register,
    formState: { errors, touchedFields, dirtyFields },
  } = useFormContext<T>()

  const error = errors[name]?.message as string | undefined
  const isTouched = !!touchedFields[name]
  const isDirty = !!dirtyFields[name]
  const hasError = isTouched && !!error
  const isValid = isDirty && !error

  const inputProps = register(name, rules)

  return (
    <div className="space-y-1">
      {/* Label */}
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-hidden="true">*</span>
        )}
      </label>

      {/* Input slot + success icon */}
      <div className="relative">
        {children({ id, errorId, hasError, isValid, inputProps })}

        {/* Success checkmark */}
        {isValid && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
            aria-hidden="true"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>

      {/* Error — role="alert" triggers ARIA announcement */}
      {hasError && (
        <p id={errorId} role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Helper text (hidden when error is shown) */}
      {helperText && !hasError && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
}

/** Shared input className builder — keeps field styling consistent */
export function inputCls(hasError: boolean, isValid: boolean, extra?: string) {
  return clsx(
    'glass-input w-full px-4 py-3 rounded-lg transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    hasError
      ? 'border-red-500 focus:ring-red-400 pr-10'
      : isValid
      ? 'border-emerald-500 focus:ring-emerald-400 pr-10'
      : 'focus:ring-blue-500',
    extra
  )
}

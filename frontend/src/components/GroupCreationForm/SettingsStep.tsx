'use client'

import React from 'react'
import { WizardStep } from '../wizard/WizardStep'
import { ValidatedField, inputCls } from './ValidatedField'
import { GroupFormValues } from './validation'
import { useFormContext } from 'react-hook-form'

interface SettingsStepProps {
  onNext: () => void
  onBack: () => void
}

export const SettingsStep: React.FC<SettingsStepProps> = ({ onNext, onBack }) => {
  const { formState: { errors }, register } = useFormContext<GroupFormValues>()
  const canProceed = !errors.cycleLength && !errors.contributionAmount && !errors.maxMembers

  return (
    <WizardStep
      title="Group Settings"
      description="Configure contribution rules and schedule"
      onBack={onBack}
      onNext={onNext}
      canProceed={canProceed}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ValidatedField<GroupFormValues>
          name="cycleLength"
          label="Cycle Length (days)"
          required
          helperText="1–365 days"
        >
          {({ id, errorId, hasError, isValid, inputProps }) => (
            <input
              {...inputProps}
              id={id}
              type="number"
              min="1"
              max="365"
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              className={inputCls(hasError, isValid)}
              onChange={(e) => inputProps.onChange({ target: { ...e.target, value: e.target.valueAsNumber } } as never)}
            />
          )}
        </ValidatedField>

        <ValidatedField<GroupFormValues>
          name="contributionAmount"
          label="Contribution Amount ($)"
          required
          helperText="Greater than 0"
        >
          {({ id, errorId, hasError, isValid, inputProps }) => (
            <input
              {...inputProps}
              id={id}
              type="number"
              step="0.01"
              min="0"
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              className={inputCls(hasError, isValid)}
              onChange={(e) => inputProps.onChange({ target: { ...e.target, value: e.target.valueAsNumber } } as never)}
            />
          )}
        </ValidatedField>
      </div>

      <ValidatedField<GroupFormValues>
        name="maxMembers"
        label="Max Members"
        required
        helperText="2–50 members"
      >
        {({ id, errorId, hasError, isValid, inputProps }) => (
          <input
            {...inputProps}
            id={id}
            type="number"
            min="2"
            max="50"
            aria-required="true"
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            className={inputCls(hasError, isValid)}
            onChange={(e) => inputProps.onChange({ target: { ...e.target, value: e.target.valueAsNumber } } as never)}
          />
        )}
      </ValidatedField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Frequency
          </label>
          <select
            {...register('frequency')}
            id="frequency"
            className="glass-input w-full px-4 py-3 rounded-lg"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Duration (cycles)
          </label>
          <input
            {...register('duration', { valueAsNumber: true })}
            id="duration"
            type="number"
            min="1"
            className="glass-input w-full px-4 py-3 rounded-lg"
          />
        </div>
      </div>
    </WizardStep>
  )
}

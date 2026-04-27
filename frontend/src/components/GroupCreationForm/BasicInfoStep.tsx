'use client'

import React from 'react'
import { WizardStep } from '../wizard/WizardStep'
import { ValidatedField, inputCls } from './ValidatedField'
import { GroupFormValues } from './validation'
import { useFormContext } from 'react-hook-form'

interface BasicInfoStepProps {
  onNext: () => void
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ onNext }) => {
  const { watch } = useFormContext<GroupFormValues>()
  const groupName = watch('groupName') ?? ''

  return (
    <WizardStep
      title="Basic Information"
      description="Give your group a name and describe its purpose"
      onNext={onNext}
      canProceed={groupName.trim().length >= 3}
    >
      <ValidatedField<GroupFormValues>
        name="groupName"
        label="Group Name"
        required
        helperText="3–100 characters"
      >
        {({ id, errorId, hasError, isValid, inputProps }) => (
          <input
            {...inputProps}
            id={id}
            type="text"
            placeholder="e.g., Market Women Ajo"
            aria-required="true"
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            className={inputCls(hasError, isValid)}
          />
        )}
      </ValidatedField>

      <ValidatedField<GroupFormValues>
        name="description"
        label="Description (optional)"
        helperText="Up to 500 characters"
      >
        {({ id, errorId, hasError, isValid, inputProps }) => (
          <textarea
            {...inputProps}
            id={id}
            rows={2}
            placeholder="Describe your group's purpose..."
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            className={inputCls(hasError, isValid)}
          />
        )}
      </ValidatedField>

      <ValidatedField<GroupFormValues> name="category" label="Category">
        {({ id, hasError, isValid, inputProps }) => (
          <select
            {...inputProps}
            id={id}
            className={inputCls(hasError, isValid)}
          >
            <option value="All">Select a category</option>
            <option value="Startup">Startup</option>
            <option value="Education">Education</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Emergency Fund">Emergency Fund</option>
            <option value="Travel">Travel</option>
            <option value="Festivals">Festivals</option>
            <option value="Farming">Farming</option>
          </select>
        )}
      </ValidatedField>
    </WizardStep>
  )
}

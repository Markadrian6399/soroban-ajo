/**
 * @file GroupCreationForm/index.tsx
 * @description Multi-step form for creating new savings groups.
 * Step 0: Template picker (optional quick-start)
 * Step 1: Basic Info  — validated by RHF + Zod (basicInfoSchema)
 * Step 2: Settings    — validated by RHF + Zod (settingsSchema)
 * Step 3: Members
 * Step 4: Review
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFormDraft } from '../../hooks/useFormDraft'
import { useCreateGroup } from '../../hooks/useContractData'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { StepIndicator } from '../wizard/StepIndicator'
import { BasicInfoStep } from './BasicInfoStep'
import { SettingsStep } from './SettingsStep'
import { MembersStep } from './MembersStep'
import { ReviewStep } from './ReviewStep'
import { ErrorSummary } from './FormComponents'
import { groupFormSchema, GroupFormValues } from './validation'
import { GroupCreationFormProps } from './types'
import TemplateSelector from '../TemplateSelector'
import { GroupTemplate } from '@/data/groupTemplates'

const WIZARD_STEPS = ['Template', 'Basic Info', 'Settings', 'Members', 'Review']

// Fields validated per step — used to trigger step-level validation before advancing
const STEP_FIELDS: Record<number, (keyof GroupFormValues)[]> = {
  1: ['groupName', 'description', 'category'],
  2: ['cycleLength', 'contributionAmount', 'maxMembers', 'frequency', 'duration'],
}

export const GroupCreationForm: React.FC<GroupCreationFormProps> = ({ onSuccess }) => {
  const router = useRouter()
  const createGroupMutation = useCreateGroup()
  const [step, setStep] = useState(0)
  const [memberInput, setMemberInput] = useState('')
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const methods = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    mode: 'onTouched',       // validate on blur, then live on change
    reValidateMode: 'onChange',
    defaultValues: {
      groupName: '',
      description: '',
      category: 'All',
      cycleLength: 30,
      contributionAmount: 100,
      maxMembers: 10,
      frequency: 'monthly',
      duration: 12,
      invitedMembers: [],
    },
  })

  const { handleSubmit, trigger, getValues, setValue, watch, formState: { errors, isSubmitting } } = methods
  const formData = watch()

  const isDirty = methods.formState.isDirty
  const { removeDraft } = useFormDraft({
    key: 'draft_group_creation',
    data: formData,
    onRestore: (draft) => {
      Object.entries(draft).forEach(([k, v]) => setValue(k as keyof GroupFormValues, v as never))
    },
    enabled: isDirty,
  })

  const hasErrors = Object.keys(errors).length > 0
  useEffect(() => {
    if (hasErrors) errorSummaryRef.current?.focus()
  }, [hasErrors])

  const handleSelectTemplate = (template: GroupTemplate) => {
    setValue('groupName', template.name)
    setValue('description', template.description)
    setValue('contributionAmount', template.contributionAmount)
    setValue('cycleLength', template.cycleLength)
    setValue('maxMembers', template.maxMembers)
    setValue('frequency', template.frequency)
    setValue('duration', template.cycleDuration)
    setValue('category', template.category ?? 'All')
    setStep(1)
  }

  const handleNext = async () => {
    const fields = STEP_FIELDS[step]
    if (!fields) { setStep((s) => s + 1); return }
    const valid = await trigger(fields)
    if (valid) setStep((s) => s + 1)
    else errorSummaryRef.current?.focus()
  }

  const onSubmit = async (data: GroupFormValues) => {
    try {
      const result = await createGroupMutation.mutateAsync({
        groupName: data.groupName,
        cycleLength: data.cycleLength,
        contributionAmount: data.contributionAmount,
        maxMembers: data.maxMembers,
      })
      removeDraft()
      toast.success(`Group "${data.groupName}" created successfully!`)
      onSuccess ? onSuccess() : router.push(`/groups/${result.groupId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create group')
    }
  }

  const invitedMembers: string[] = watch('invitedMembers') ?? []

  const handleAddMember = () => {
    const trimmed = memberInput.trim()
    if (trimmed && !invitedMembers.includes(trimmed)) {
      setValue('invitedMembers', [...invitedMembers, trimmed])
      setMemberInput('')
    }
  }

  const handleRemoveMember = (member: string) => {
    setValue('invitedMembers', invitedMembers.filter((m) => m !== member))
  }

  return (
    <div className="glass-form p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 mb-1">
          Create a New Group
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          {step === 0
            ? 'Start from a template or build from scratch'
            : 'Set up your savings group and invite members to join'}
        </p>
      </div>

      <StepIndicator steps={WIZARD_STEPS} currentStep={step + 1} />

      {/* Step 0: Template Picker */}
      {step === 0 && (
        <div className="mt-6 space-y-4">
          <TemplateSelector onSelectTemplate={handleSelectTemplate} />
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 transition-colors"
            >
              Skip — build from scratch
            </button>
          </div>
        </div>
      )}

      {/* Steps 1-4: Form wizard */}
      {step > 0 && (
        <FormProvider {...methods}>
          <ErrorSummary ref={errorSummaryRef} errors={errors} submitted={isSubmitting} />

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {step === 1 && <BasicInfoStep onNext={handleNext} />}

            {step === 2 && (
              <SettingsStep onNext={handleNext} onBack={() => setStep(1)} />
            )}

            {step === 3 && (
              <MembersStep
                formData={{ ...formData, invitedMembers }}
                memberInput={memberInput}
                onNext={handleNext}
                onBack={() => setStep(2)}
                onMemberInputChange={setMemberInput}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
              />
            )}

            {step === 4 && (
              <ReviewStep
                formData={{ ...formData, invitedMembers }}
                onBack={() => setStep(3)}
                onSubmit={handleSubmit(onSubmit)}
                isLoading={isSubmitting}
              />
            )}
          </form>
        </FormProvider>
      )}
    </div>
  )
}

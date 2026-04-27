import { z } from 'zod'

export const basicInfoSchema = z.object({
  groupName: z
    .string()
    .min(1, 'Group name is required')
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must not exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
  category: z.string().optional().default('All'),
})

export const settingsSchema = z.object({
  cycleLength: z
    .number({ invalid_type_error: 'Cycle length is required' })
    .int('Cycle length must be a whole number')
    .min(1, 'Cycle length must be at least 1 day')
    .max(365, 'Cycle length must not exceed 365 days'),
  contributionAmount: z
    .number({ invalid_type_error: 'Contribution amount is required' })
    .positive('Contribution amount must be greater than 0')
    .max(1_000_000, 'Contribution amount must not exceed 1,000,000'),
  maxMembers: z
    .number({ invalid_type_error: 'Max members is required' })
    .int('Max members must be a whole number')
    .min(2, 'Group must allow at least 2 members')
    .max(50, 'Group cannot exceed 50 members'),
  frequency: z.enum(['weekly', 'monthly']),
  duration: z
    .number({ invalid_type_error: 'Duration is required' })
    .int()
    .min(1, 'Duration must be at least 1 cycle'),
})

export const groupFormSchema = basicInfoSchema.merge(settingsSchema).extend({
  invitedMembers: z.array(z.string()).default([]),
})

export type BasicInfoValues = z.infer<typeof basicInfoSchema>
export type SettingsValues = z.infer<typeof settingsSchema>
export type GroupFormValues = z.infer<typeof groupFormSchema>

// Keep legacy helpers for non-RHF steps (MembersStep, ReviewStep)
export { validateField, validateStep, validateForm } from './validationLegacy'

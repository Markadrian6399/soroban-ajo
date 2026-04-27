import { FormErrors, GroupFormData } from './types'

export const validateField = (name: string, value: unknown): string | undefined => {
  switch (name) {
    case 'groupName':
      if (!String(value ?? '').trim()) return 'Group name is required'
      if (String(value).trim().length < 3) return 'Group name must be at least 3 characters'
      if (String(value).trim().length > 100) return 'Group name must not exceed 100 characters'
      return undefined
    case 'description':
      if (value && String(value).length > 500) return 'Description must not exceed 500 characters'
      return undefined
    case 'cycleLength':
      if (!value) return 'Cycle length is required'
      if (Number(value) < 1) return 'Cycle length must be at least 1 day'
      if (Number(value) > 365) return 'Cycle length must not exceed 365 days'
      return undefined
    case 'contributionAmount':
      if (!value) return 'Contribution amount is required'
      if (Number(value) <= 0) return 'Contribution amount must be greater than 0'
      if (Number(value) > 1_000_000) return 'Contribution amount must not exceed 1,000,000'
      return undefined
    case 'maxMembers':
      if (!value) return 'Max members is required'
      if (Number(value) < 2) return 'Group must allow at least 2 members'
      if (Number(value) > 50) return 'Group cannot exceed 50 members'
      return undefined
    default:
      return undefined
  }
}

export const validateStep = (
  step: number,
  formData: GroupFormData,
  currentErrors: FormErrors
): { valid: boolean; errors: FormErrors } => {
  const stepFields: Record<number, (keyof FormErrors)[]> = {
    1: ['groupName', 'description'],
    2: ['cycleLength', 'contributionAmount', 'maxMembers'],
  }
  const fields = stepFields[step] ?? []
  const newErrors: FormErrors = { ...currentErrors }
  let valid = true
  fields.forEach((f) => {
    const err = validateField(f, formData[f as keyof GroupFormData])
    if (err) { newErrors[f] = err; valid = false } else { delete newErrors[f] }
  })
  return { valid, errors: newErrors }
}

export const validateForm = (formData: GroupFormData): FormErrors => {
  const newErrors: FormErrors = {}
  Object.keys(formData).forEach((key) => {
    const error = validateField(key, formData[key as keyof GroupFormData])
    if (error) newErrors[key as keyof FormErrors] = error
  })
  return newErrors
}

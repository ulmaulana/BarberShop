export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 13
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password minimal 6 karakter' }
  }
  return { valid: true }
}

export function validateRequired(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export function validateMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength
}

export function validateMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength
}

export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

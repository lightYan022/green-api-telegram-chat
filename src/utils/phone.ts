export const normalizePhone = (rawPhone: string): string => {
  const digits = rawPhone.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }

  return digits
}

export const formatPhoneLabel = (phone: string): string => {
  const digits = normalizePhone(phone)

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }

  if (digits.length === 12 && digits.startsWith('375')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`
  }

  return digits ? `+${digits}` : phone
}

export const normalizeUsername = (rawUsername: string): string => {
  const value = rawUsername.trim()
  if (!value) {
    return ''
  }

  return value.startsWith('@') ? value : `@${value}`
}

const USERNAME_PATTERN = /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/

export type Recipient =
  | { kind: 'phone'; phone: string; label: string }
  | { kind: 'username'; username: string; label: string }

export const parseRecipient = (rawValue: string): Recipient | null => {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.includes('@') || /[a-zA-Z_]/.test(trimmed)) {
    const username = normalizeUsername(trimmed)
    if (!USERNAME_PATTERN.test(username)) {
      return null
    }

    return { kind: 'username', username, label: username }
  }

  const phone = normalizePhone(trimmed)
  if (phone.length < 10 || phone.length > 15) {
    return null
  }

  return { kind: 'phone', phone, label: formatPhoneLabel(phone) }
}

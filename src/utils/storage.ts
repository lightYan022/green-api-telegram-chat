import type { Chat, ChatMessage, Credentials } from '../types'

const CREDS_KEY = 'telegram-green-api-credentials'

const getChatsKey = (idInstance: string): string => `telegram-green-api-chats-${idInstance}`
const getMessagesKey = (idInstance: string): string => `telegram-green-api-messages-${idInstance}`

export const loadCredentials = (): Credentials | null => {
  const raw = sessionStorage.getItem(CREDS_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as Credentials
  } catch {
    return null
  }
}

export const saveCredentials = (credentials: Credentials): void => {
  sessionStorage.setItem(CREDS_KEY, JSON.stringify(credentials))
}

export const clearCredentials = (): void => {
  sessionStorage.removeItem(CREDS_KEY)
}

export const loadChats = (idInstance: string): Chat[] => {
  const raw = localStorage.getItem(getChatsKey(idInstance))
  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as Chat[]
  } catch {
    return []
  }
}

export const saveChats = (idInstance: string, chats: Chat[]): void => {
  localStorage.setItem(getChatsKey(idInstance), JSON.stringify(chats))
}

export const loadMessages = (idInstance: string): Record<string, ChatMessage[]> => {
  const raw = localStorage.getItem(getMessagesKey(idInstance))
  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as Record<string, ChatMessage[]>
  } catch {
    return {}
  }
}

export const saveMessages = (
  idInstance: string,
  messagesByChat: Record<string, ChatMessage[]>,
): void => {
  localStorage.setItem(getMessagesKey(idInstance), JSON.stringify(messagesByChat))
}

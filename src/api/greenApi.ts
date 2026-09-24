import type { Credentials, ReceiveNotificationResponse } from '../types'

type RequestOptions = {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  body?: unknown
  signal?: AbortSignal
}

const GREEN_API_URL_HEADER = 'X-Green-Api-Url'
const GREEN_API_PATH_HEADER = 'X-Green-Api-Path'

const getGreenApiPath = (credentials: Credentials, path: string): string => {
  const parsed = new URL(credentials.apiUrl.replace(/\/$/, ''))
  const basePath = parsed.pathname.replace(/\/$/, '')
  return `${basePath}/waInstance${credentials.idInstance}${path}`
}

const getRequestUrl = (credentials: Credentials, path: string): string =>
  `/green-api${getGreenApiPath(credentials, path)}`

const getErrorMessage = (errorText: string, status: number): string => {
  if (!errorText) {
    return `Ошибка запроса: ${status}`
  }

  if (errorText.includes('This operation was aborted') || status === 504) {
    return 'Запрос к GREEN-API оборвался. Нажмите «Создать» ещё раз'
  }

  try {
    const parsed = JSON.parse(errorText) as { message?: string; reason?: string }
    return parsed.message || parsed.reason || errorText
  } catch {
    return errorText
  }
}

const requestJson = async <T>(credentials: Credentials, options: RequestOptions): Promise<T | null> => {
  const url = getRequestUrl(credentials, options.path)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [GREEN_API_URL_HEADER]: credentials.apiUrl.replace(/\/$/, ''),
    [GREEN_API_PATH_HEADER]: getGreenApiPath(credentials, options.path),
  }

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(getErrorMessage(errorText, response.status))
    }

    const text = await response.text()
    if (!text) {
      return null
    }

    return JSON.parse(text) as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }

    if (error instanceof TypeError) {
      throw new Error('Нет связи с GREEN-API. Проверьте интернет и apiUrl, затем попробуйте ещё раз')
    }

    throw error
  }
}

export const getStateInstance = async (credentials: Credentials): Promise<string> => {
  const data = await requestJson<{ stateInstance: string }>(credentials, {
    method: 'GET',
    path: `/getStateInstance/${credentials.apiTokenInstance}`,
  })

  if (!data?.stateInstance) {
    throw new Error('Не удалось получить состояние инстанса')
  }

  return data.stateInstance
}

export const getSettings = async (
  credentials: Credentials,
): Promise<{ webhookUrl?: string; incomingWebhook?: string } | null> => {
  return requestJson<{ webhookUrl?: string; incomingWebhook?: string }>(credentials, {
    method: 'GET',
    path: `/getSettings/${credentials.apiTokenInstance}`,
  })
}

export const enableHttpReceiving = async (credentials: Credentials): Promise<void> => {
  const settings = await getSettings(credentials)
  const hasEmptyWebhook = !settings?.webhookUrl
  const hasIncoming = settings?.incomingWebhook === 'yes'

  if (hasEmptyWebhook && hasIncoming) {
    return
  }

  await requestJson(credentials, {
    method: 'POST',
    path: `/setSettings/${credentials.apiTokenInstance}`,
    body: {
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'no',
    },
  })
}

export const checkAccount = async (
  credentials: Credentials,
  query: { phoneNumber?: number; username?: string },
): Promise<{ exist: boolean; chatId: string; username?: string; phoneNumber?: number }> => {
  const data = await requestJson<{
    exist?: boolean
    chatId?: string
    username?: string
    phoneNumber?: number
    status?: boolean
    reason?: string
  }>(credentials, {
    method: 'POST',
    path: `/checkAccount/${credentials.apiTokenInstance}`,
    body: query.username ? { username: query.username } : { phoneNumber: query.phoneNumber },
  })

  if (data?.status === false) {
    throw new Error(data.reason || 'Не удалось проверить получателя')
  }

  return {
    exist: Boolean(data?.exist),
    chatId: data?.chatId || '',
    username: data?.username,
    phoneNumber: data?.phoneNumber,
  }
}

export const sendMessage = async (
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<string> => {
  const data = await requestJson<{ idMessage: string }>(credentials, {
    method: 'POST',
    path: `/sendMessage/${credentials.apiTokenInstance}`,
    body: { chatId, message },
  })

  if (!data?.idMessage) {
    throw new Error('Сообщение не отправлено')
  }

  return data.idMessage
}

export const receiveNotification = async (
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<ReceiveNotificationResponse | null> => {
  return requestJson<ReceiveNotificationResponse>(credentials, {
    method: 'GET',
    path: `/receiveNotification/${credentials.apiTokenInstance}?receiveTimeout=5`,
    signal,
  })
}

export const deleteNotification = async (
  credentials: Credentials,
  receiptId: number,
): Promise<void> => {
  await requestJson(credentials, {
    method: 'DELETE',
    path: `/deleteNotification/${credentials.apiTokenInstance}/${receiptId}`,
  })
}

export type ChatHistoryItem = {
  type?: 'incoming' | 'outgoing'
  idMessage?: string
  timestamp?: number
  typeMessage?: string
  chatId?: string
  textMessage?: string
  caption?: string
  senderName?: string
  extendedTextMessageData?: {
    text?: string
  }
}

export const getChatHistory = async (
  credentials: Credentials,
  chatId: string,
  count = 20,
): Promise<ChatHistoryItem[]> => {
  const data = await requestJson<ChatHistoryItem[]>(credentials, {
    method: 'POST',
    path: `/getChatHistory/${credentials.apiTokenInstance}`,
    body: { chatId, count },
  })

  return Array.isArray(data) ? data : []
}

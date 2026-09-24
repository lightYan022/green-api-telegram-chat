export type Credentials = {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

export type Chat = {
  chatId: string
  title: string
  phone?: string
  username?: string
  lastText: string
  lastTimestamp: number
}

export type ChatMessage = {
  id: string
  chatId: string
  text: string
  timestamp: number
  isOutgoing: boolean
  senderName?: string
}

export type NotificationBody = {
  typeWebhook?: string
  timestamp?: number
  idMessage?: string
  senderData?: {
    chatId?: string
    chatName?: string
    sender?: string
    senderName?: string
    senderPhoneNumber?: number
  }
  messageData?: {
    typeMessage?: string
    textMessageData?: {
      textMessage?: string
    }
    extendedTextMessageData?: {
      text?: string
    }
    quotedMessage?: {
      textMessage?: string
    }
  }
}

export type ReceiveNotificationResponse = {
  receiptId: number
  body: NotificationBody
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chat, ChatMessage, Credentials, NotificationBody } from '../types'
import {
  checkAccount,
  deleteNotification,
  getChatHistory,
  receiveNotification,
  sendMessage,
} from '../api/greenApi'
import { ChatWindow } from './ChatWindow/ChatWindow'
import { NewChatModal } from './NewChatModal/NewChatModal'
import { Sidebar } from './Sidebar/Sidebar'
import { parseRecipient } from '../utils/phone'
import { loadChats, loadMessages, saveChats, saveMessages } from '../utils/storage'
import styles from './Messenger.module.css'

type MessengerProps = {
  credentials: Credentials
  onLogout: () => void
}

const extractMessageText = (body: NotificationBody): string => {
  const messageData = body.messageData
  if (!messageData) {
    return ''
  }

  const fromText = messageData.textMessageData?.textMessage?.trim()
  const fromExtended = messageData.extendedTextMessageData?.text?.trim()
  const fromQuoted = messageData.quotedMessage?.textMessage?.trim()

  return fromText || fromExtended || fromQuoted || ''
}

const toUnixSeconds = (timestamp: number): number => {
  if (timestamp > 1_000_000_000_000) {
    return Math.floor(timestamp / 1000)
  }

  return timestamp
}

const sortMessages = (messages: ChatMessage[]): ChatMessage[] => {
  return [...messages].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp - right.timestamp
    }

    return left.id.localeCompare(right.id)
  })
}

const upsertChat = (chats: Chat[], nextChat: Chat): Chat[] => {
  const withoutCurrent = chats.filter((chat) => chat.chatId !== nextChat.chatId)
  return [nextChat, ...withoutCurrent]
}

export const Messenger = ({ credentials, onLogout }: MessengerProps) => {
  const [chats, setChats] = useState<Chat[]>(() => loadChats(credentials.idInstance))
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>(() =>
    loadMessages(credentials.idInstance),
  )
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [newChatError, setNewChatError] = useState('')
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [sendError, setSendError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)

  const chatsRef = useRef(chats)
  const messagesRef = useRef(messagesByChat)
  const credentialsRef = useRef(credentials)

  useEffect(() => {
    credentialsRef.current = credentials
  }, [credentials])

  useEffect(() => {
    chatsRef.current = chats
    saveChats(credentials.idInstance, chats)
  }, [chats, credentials.idInstance])

  useEffect(() => {
    messagesRef.current = messagesByChat
    saveMessages(credentials.idInstance, messagesByChat)
  }, [messagesByChat, credentials.idInstance])

  const addMessage = useCallback((chatPatch: Chat, message: ChatMessage) => {
    const normalizedMessage: ChatMessage = {
      ...message,
      timestamp: toUnixSeconds(message.timestamp),
    }

    const existingMessages = messagesRef.current[chatPatch.chatId] || []
    if (existingMessages.some((item) => item.id === normalizedMessage.id)) {
      return
    }

    const existingChat = chatsRef.current.find((chat) => chat.chatId === chatPatch.chatId)
    const nextMessages = sortMessages([...existingMessages, normalizedMessage])
    const lastMessage = nextMessages[nextMessages.length - 1]
    const nextChat: Chat = {
      chatId: chatPatch.chatId,
      title: chatPatch.title || existingChat?.title || chatPatch.chatId,
      phone: chatPatch.phone || existingChat?.phone,
      username: chatPatch.username || existingChat?.username,
      lastText: lastMessage?.text || normalizedMessage.text,
      lastTimestamp: lastMessage?.timestamp || normalizedMessage.timestamp,
    }

    chatsRef.current = upsertChat(chatsRef.current, nextChat)
    messagesRef.current = {
      ...messagesRef.current,
      [chatPatch.chatId]: nextMessages,
    }

    setChats((prevChats) => upsertChat(prevChats, nextChat))
    setMessagesByChat((prevMessages) => ({
      ...prevMessages,
      [chatPatch.chatId]: sortMessages([...(prevMessages[chatPatch.chatId] || []), normalizedMessage]),
    }))
  }, [])

  useEffect(() => {
    let isCancelled = false

    const pollNotifications = async () => {
      while (!isCancelled) {
        try {
          const notification = await receiveNotification(credentialsRef.current)
          if (isCancelled) {
            return
          }
          if (!notification) {
            continue
          }

          const body = notification.body
          const text = extractMessageText(body)
          const chatId = body.senderData?.chatId || body.senderData?.sender
          const webhookType = body.typeWebhook || ''
          const isIncoming = webhookType === 'incomingMessageReceived'
          const isOutgoing =
            webhookType === 'outgoingAPIMessageReceived' || webhookType === 'outgoingMessageReceived'

          if (text && chatId && (isIncoming || isOutgoing) && body.idMessage) {
            const phoneFromSender = body.senderData?.senderPhoneNumber
              ? String(body.senderData.senderPhoneNumber)
              : undefined

            addMessage(
              {
                chatId,
                title: body.senderData?.chatName || body.senderData?.senderName || chatId,
                phone: phoneFromSender,
                lastText: text,
                lastTimestamp: body.timestamp || Math.floor(Date.now() / 1000),
              },
              {
                id: body.idMessage,
                chatId,
                text,
                timestamp: body.timestamp || Math.floor(Date.now() / 1000),
                isOutgoing: !isIncoming,
                senderName: body.senderData?.senderName,
              },
            )
          }

          await deleteNotification(credentialsRef.current, notification.receiptId)
        } catch (error) {
          if (isCancelled) {
            return
          }

          const isAbort = error instanceof Error && error.name === 'AbortError'
          if (isAbort) {
            continue
          }

          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      }
    }

    void pollNotifications()

    return () => {
      isCancelled = true
    }
  }, [addMessage, credentials.idInstance, credentials.apiTokenInstance])

  useEffect(() => {
    if (!selectedChatId) {
      return
    }

    let isCancelled = false

    const syncHistory = async () => {
      try {
        const history = await getChatHistory(credentialsRef.current, selectedChatId, 100)
        if (isCancelled) {
          return
        }

        const chronological = [...history].sort(
          (left, right) => (left.timestamp || 0) - (right.timestamp || 0),
        )

        chronological.forEach((item) => {
          const text = (item.textMessage || item.caption || item.extendedTextMessageData?.text || '').trim()
          if (!text || !item.idMessage) {
            return
          }

          const chatId = item.chatId || selectedChatId
          addMessage(
            {
              chatId,
              title: item.senderName || '',
              lastText: text,
              lastTimestamp: item.timestamp || Math.floor(Date.now() / 1000),
            },
            {
              id: item.idMessage,
              chatId,
              text,
              timestamp: item.timestamp || Math.floor(Date.now() / 1000),
              isOutgoing: item.type !== 'incoming',
              senderName: item.senderName,
            },
          )
        })
      } catch {
        // История — запасной канал; очередь HTTP API остаётся основным
      }
    }

    void syncHistory()
    const intervalId = window.setInterval(() => {
      void syncHistory()
    }, 4000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [addMessage, selectedChatId])

  const handleCreateChat = async (rawRecipient: string) => {
    setNewChatError('')

    const recipient = parseRecipient(rawRecipient)
    if (!recipient) {
      setNewChatError('Введите телефон в международном формате или @username')
      return
    }

    setIsCreatingChat(true)

    try {
      const account = await checkAccount(
        credentials,
        recipient.kind === 'username'
          ? { username: recipient.username }
          : { phoneNumber: Number(recipient.phone) },
      )

      if (!account.exist || !account.chatId) {
        setNewChatError('У этого получателя нет аккаунта Telegram')
        return
      }

      const existingChat = chatsRef.current.find((chat) => chat.chatId === account.chatId)
      const phone =
        account.phoneNumber !== undefined
          ? String(account.phoneNumber)
          : recipient.kind === 'phone'
            ? recipient.phone
            : undefined
      const nextChat: Chat = existingChat || {
        chatId: account.chatId,
        title: account.username || recipient.label,
        phone,
        username: account.username || (recipient.kind === 'username' ? recipient.username : undefined),
        lastText: '',
        lastTimestamp: 0,
      }

      setChats((prevChats) => upsertChat(prevChats, nextChat))
      setSelectedChatId(account.chatId)
      setIsMobileChatOpen(true)
      setIsNewChatOpen(false)
    } catch (error) {
      setNewChatError(error instanceof Error ? error.message : 'Не удалось создать чат')
    } finally {
      setIsCreatingChat(false)
    }
  }

  const selectedChat = chats.find((chat) => chat.chatId === selectedChatId) || null

  const handleSend = async (text: string) => {
    if (!selectedChatId) {
      return
    }

    const currentChat = chatsRef.current.find((chat) => chat.chatId === selectedChatId)
    setSendError('')
    setIsSending(true)

    try {
      const idMessage = await sendMessage(credentials, selectedChatId, text)
      addMessage(
        {
          chatId: selectedChatId,
          title: currentChat?.title || selectedChatId,
          phone: currentChat?.phone,
          username: currentChat?.username,
          lastText: text,
          lastTimestamp: Math.floor(Date.now() / 1000),
        },
        {
          id: idMessage,
          chatId: selectedChatId,
          text,
          timestamp: Math.floor(Date.now() / 1000),
          isOutgoing: true,
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить сообщение'
      setSendError(message)
      throw error
    } finally {
      setIsSending(false)
    }
  }
  const selectedMessages = selectedChatId ? messagesByChat[selectedChatId] || [] : []

  return (
    <div className={styles.layout}>
      <div className={`${styles.sidebarPane} ${isMobileChatOpen ? styles.hideOnMobile : ''}`}>
        <Sidebar
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={(chatId) => {
            setSelectedChatId(chatId)
            setSendError('')
            setIsMobileChatOpen(true)
          }}
          onNewChat={() => {
            setNewChatError('')
            setIsNewChatOpen(true)
          }}
          onLogout={onLogout}
        />
      </div>

      <div className={`${styles.chatPane} ${isMobileChatOpen ? '' : styles.hideOnMobile}`}>
        {selectedChat ? (
          <>
            <button
              type="button"
              className={styles.back}
              onClick={() => setIsMobileChatOpen(false)}
              aria-label="К списку чатов"
            >
              ← Чаты
            </button>
            <ChatWindow
              chat={selectedChat}
              messages={selectedMessages}
              errorText={sendError}
              isSending={isSending}
              onSend={handleSend}
            />
          </>
        ) : (
          <div className={styles.placeholder}>
            <p>Выберите чат или создайте новый</p>
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={isNewChatOpen}
        errorText={newChatError}
        isLoading={isCreatingChat}
        onClose={() => setIsNewChatOpen(false)}
        onCreate={handleCreateChat}
      />
    </div>
  )
}

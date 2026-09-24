import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Chat, ChatMessage } from '../../types'
import styles from './ChatWindow.module.css'

type ChatWindowProps = {
  chat: Chat
  messages: ChatMessage[]
  errorText: string
  isSending: boolean
  onSend: (text: string) => Promise<void>
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const ChatWindow = ({ chat, messages, errorText, isSending, onSend }: ChatWindowProps) => {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, chat.chatId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || isSending) {
      return
    }

    try {
      await onSend(text)
      setDraft('')
    } catch {
      // Текст остаётся в поле, ошибка показывается над формой
    }
  }

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const text = draft.trim()
      if (!text || isSending) {
        return
      }

      try {
        await onSend(text)
        setDraft('')
      } catch {
        // Текст остаётся в поле, ошибка показывается над формой
      }
    }
  }

  return (
    <section className={styles.window} aria-label={`Чат ${chat.title}`}>
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">
          {chat.title.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h2 className={styles.title}>{chat.title}</h2>
          <p className={styles.subtitle}>{chat.username || chat.phone || chat.chatId}</p>
        </div>
      </header>

      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 ? (
          <p className={styles.empty}>Напишите первое сообщение</p>
        ) : (
          [...messages]
            .sort((left, right) => left.timestamp - right.timestamp)
            .map((message) => (
            <article
              key={message.id}
              className={`${styles.bubble} ${message.isOutgoing ? styles.out : styles.in}`}
            >
              {!message.isOutgoing && message.senderName ? (
                <span className={styles.sender}>{message.senderName}</span>
              ) : null}
              <p className={styles.text}>{message.text}</p>
              <time className={styles.time}>{formatTime(message.timestamp)}</time>
            </article>
          ))
        )}
      </div>

      {errorText ? (
        <p className={styles.error} role="alert">
          {errorText}
        </p>
      ) : null}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className={styles.srOnly} htmlFor="message-input">
          Текст сообщения
        </label>
        <textarea
          id="message-input"
          className={styles.input}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          maxLength={4000}
          aria-label="Текст сообщения"
        />
        <button
          type="submit"
          className={styles.send}
          disabled={isSending || !draft.trim()}
          aria-label="Отправить"
        >
          ➤
        </button>
      </form>
    </section>
  )
}

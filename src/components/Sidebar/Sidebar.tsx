import type { Chat } from '../../types'
import styles from './Sidebar.module.css'

type SidebarProps = {
  chats: Chat[]
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onLogout: () => void
}

const formatTime = (timestamp: number): string => {
  if (!timestamp) {
    return ''
  }

  return new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const Sidebar = ({
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onLogout,
}: SidebarProps) => {
  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            ✈
          </span>
          <span>Telegram</span>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onLogout}
          aria-label="Выйти"
          title="Выйти"
        >
          <svg className={styles.logoutIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M13.34,8.17C12.41,8.17 11.65,7.4 11.65,6.47A1.69,1.69 0 0,1 13.34,4.78C14.28,4.78 15.04,5.54 15.04,6.47C15.04,7.4 14.28,8.17 13.34,8.17M10.3,19.93L4.37,18.75L4.71,17.05L8.86,17.9L10.21,11.04L8.69,11.64V14.5H7V10.54L11.4,8.67L12.07,8.59C12.67,8.59 13.17,8.93 13.5,9.44L14.36,10.79C15.04,12 16.39,12.82 18,12.82V14.5C16.14,14.5 14.44,13.67 13.34,12.4L12.84,14.94L14.61,16.63V23H12.92V17.9L11.14,16.21L10.3,19.93M21,23H19V3H6V16.11L4,15.69V1H21V23M6,23H4V19.78L6,20.2V23Z"
            />
          </svg>
        </button>
      </header>

      <button type="button" className={styles.newChat} onClick={onNewChat}>
        Новый чат
      </button>

      <ul className={styles.list} aria-label="Список чатов">
        {chats.length === 0 ? (
          <li className={styles.empty}>Нет чатов. Создайте новый.</li>
        ) : (
          chats.map((chat) => {
            const isSelected = chat.chatId === selectedChatId
            return (
              <li key={chat.chatId}>
                <button
                  type="button"
                  className={`${styles.chatItem} ${isSelected ? styles.chatItemActive : ''}`}
                  onClick={() => onSelectChat(chat.chatId)}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {chat.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.meta}>
                    <span className={styles.row}>
                      <span className={styles.name}>{chat.title}</span>
                      <time className={styles.time}>{formatTime(chat.lastTimestamp)}</time>
                    </span>
                    <span className={styles.preview}>{chat.lastText || 'Нет сообщений'}</span>
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </aside>
  )
}

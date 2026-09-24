import { useState, type FormEvent, type KeyboardEvent } from 'react'
import styles from './NewChatModal.module.css'

type NewChatModalProps = {
  isOpen: boolean
  errorText: string
  isLoading: boolean
  onClose: () => void
  onCreate: (phone: string) => Promise<void>
}

export const NewChatModal = ({
  isOpen,
  errorText,
  isLoading,
  onClose,
  onCreate,
}: NewChatModalProps) => {
  const [phone, setPhone] = useState('')

  if (!isOpen) {
    return null
  }

  const handleClose = () => {
    setPhone('')
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onCreate(phone)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        tabIndex={0}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="new-chat-title" className={styles.title}>
          Новый чат
        </h2>
        <p className={styles.hint}>Телефон получателя или @username в Telegram</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Получатель</span>
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+79991234567 или @username"
              aria-label="Телефон или username получателя"
              autoFocus
            />
          </label>
          {errorText ? (
            <p className={styles.error} role="alert">
              {errorText}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className={styles.primary} disabled={isLoading}>
              {isLoading ? 'Создаём…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import type { Credentials } from '../../types'
import { enableHttpReceiving, getStateInstance } from '../../api/greenApi'
import styles from './LoginScreen.module.css'

type LoginScreenProps = {
  onLogin: (credentials: Credentials) => void
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [errorText, setErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorText('')

    const credentials: Credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: apiUrl.trim().replace(/\/$/, ''),
    }

    if (!credentials.idInstance || !credentials.apiTokenInstance || !credentials.apiUrl) {
      setErrorText('Введите idInstance, apiTokenInstance и apiUrl')
      return
    }

    try {
      new URL(credentials.apiUrl)
    } catch {
      setErrorText('Проверьте apiUrl — скопируйте его из кабинета GREEN-API')
      return
    }

    setIsLoading(true)

    try {
      const stateInstance = await getStateInstance(credentials)

      if (stateInstance !== 'authorized') {
        setErrorText(
          `Инстанс в статусе «${stateInstance}». В кабинете нажмите «Получить QR» и отсканируйте его в Telegram: Настройки → Устройства.`,
        )
        return
      }

      try {
        await enableHttpReceiving(credentials)
      } catch {
        // Получение сообщений всё равно попробуем — настройка могла быть задана в кабинете
      }

      onLogin(credentials)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось войти'
      setErrorText(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            ✈
          </span>
          <div>
            <h1 id="login-title" className={styles.title}>
              Telegram
            </h1>
            <p className={styles.subtitle}>Чат через GREEN-API</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
          <label className={styles.field}>
            <span>idInstance</span>
            <input
              type="text"
              name="greenApiIdInstance"
              autoComplete="off"
              spellCheck={false}
              value={idInstance}
              onChange={(event) => setIdInstance(event.target.value)}
              placeholder="ID"
              required
              aria-label="idInstance"
            />
          </label>

          <label className={styles.field}>
            <span>apiTokenInstance</span>
            <input
              type="password"
              name="greenApiTokenInstance"
              autoComplete="new-password"
              value={apiTokenInstance}
              onChange={(event) => setApiTokenInstance(event.target.value)}
              placeholder="Token"
              required
              aria-label="apiTokenInstance"
            />
          </label>

          <label className={styles.field}>
            <span>apiUrl</span>
            <input
              type="url"
              name="greenApiUrl"
              autoComplete="off"
              spellCheck={false}
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder="URL"
              required
              aria-label="apiUrl"
            />
          </label>
          <p className={styles.hint}>
            Скопируйте данные из кабинета. Перед входом инстанс должен быть авторизован по QR-коду в Telegram.
          </p>

          {errorText ? (
            <p className={styles.error} role="alert">
              {errorText}
            </p>
          ) : null}

          <button className={styles.submit} type="submit" disabled={isLoading}>
            {isLoading ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  )
}

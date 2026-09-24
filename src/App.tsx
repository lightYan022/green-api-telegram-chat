import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen/LoginScreen'
import { Messenger } from './components/Messenger'
import type { Credentials } from './types'
import { clearCredentials, loadCredentials, saveCredentials } from './utils/storage'

const App = () => {
  const [credentials, setCredentials] = useState<Credentials | null>(() => loadCredentials())

  const handleLogin = (nextCredentials: Credentials) => {
    saveCredentials(nextCredentials)
    setCredentials(nextCredentials)
  }

  const handleLogout = () => {
    clearCredentials()
    setCredentials(null)
  }

  if (!credentials) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <Messenger credentials={credentials} onLogout={handleLogout} />
}

export default App

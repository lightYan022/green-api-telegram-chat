import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const DEV_PORT = 5173
const PREVIEW_PORT = 4173
const BROWSER_CLOSE_EXIT_MS = 4_000

const freeListenPort = async (port: number) => {
  let netstatOut = ''
  try {
    netstatOut = execSync('netstat -ano', { encoding: 'utf8' })
  } catch {
    return
  }

  const pids = new Set<string>()
  for (const line of netstatOut.split(/\r?\n/)) {
    if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue
    const pid = line.trim().split(/\s+/).pop()
    if (pid && /^\d+$/.test(pid) && pid !== String(process.pid) && pid !== '0') {
      pids.add(pid)
    }
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
    } catch {
      /* already gone */
    }
  }

  if (pids.size > 0) {
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
}

const stopWhenBrowserCloses = (): Plugin => ({
  name: 'stop-when-browser-closes',
  apply: 'serve',
  configureServer(server) {
    let openClientCount = 0
    let exitTimer: ReturnType<typeof setTimeout> | undefined

    server.ws.on('connection', (socket) => {
      openClientCount += 1
      clearTimeout(exitTimer)

      socket.on('close', () => {
        openClientCount -= 1
        if (openClientCount > 0) return

        exitTimer = setTimeout(() => {
          if (openClientCount > 0) return
          void server.close().finally(() => {
            process.exit(0)
          })
        }, BROWSER_CLOSE_EXIT_MS)
      })
    })
  },
})

const greenApiProxy = {
  '/green-api': {
    target: 'https://4100.api.green-api.com',
    changeOrigin: true,
    timeout: 90_000,
    proxyTimeout: 90_000,
    rewrite: (path: string) => path.replace(/^\/green-api/, ''),
  },
}

export default defineConfig(async () => {
  await freeListenPort(DEV_PORT)

  return {
    plugins: [react(), stopWhenBrowserCloses()],
    server: {
      host: '127.0.0.1',
      port: DEV_PORT,
      strictPort: true,
      proxy: greenApiProxy,
    },
    preview: {
      host: '127.0.0.1',
      port: PREVIEW_PORT,
      proxy: greenApiProxy,
    },
  }
})

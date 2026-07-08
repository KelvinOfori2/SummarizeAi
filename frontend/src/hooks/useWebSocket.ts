/**
 * useWebSocket  —  JWT-authenticated WebSocket with:
 *   - Auto-connect on login / page reload
 *   - Auto-reconnect (exponential backoff, max 5 attempts)
 *   - Auto-disconnect on logout
 *   - Real-time React Query cache updates
 *   - Keep-alive pong responses
 *   - Connection status exposed to the app
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient }  from '@tanstack/react-query'
import { useAuthStore }    from '@/store/authStore'
import toast from 'react-hot-toast'

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// Read from env or fall back to same host as the app
// In dev: Vite proxies /ws → ws://localhost:8000 (see vite.config.ts)
// In prod: set VITE_WS_URL in your environment e.g. ws://yourdomain.com
const WS_BASE = (() => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  // Auto-detect: use same host as the page, just change protocol
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host  = window.location.host   // e.g. localhost:5173
  return `${proto}//${host}`
})()

const MAX_RETRIES      = 6
const BASE_DELAY_MS    = 2000   // 2 s, 4 s, 8 s … up to ~32 s

export function useWebSocket() {
  const qc                          = useQueryClient()
  const { accessToken, isAuthenticated } = useAuthStore()
  const wsRef                       = useRef<WebSocket | null>(null)
  const retryCount                  = useRef(0)
  const retryTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopped                     = useRef(false)          // set true on intentional close
  const [status, setStatus]         = useState<WSStatus>('disconnected')

  // ── helpers ─────────────────────────────────────────────────────────────────
  const clearRetry = () => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }
  }

  const disconnect = useCallback(() => {
    stopped.current = true
    clearRetry()
    const ws = wsRef.current
    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close(1000, 'logout')
    wsRef.current = null
    setStatus('disconnected')
  }, [])

  // ── connect ──────────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    // Guard: don't connect if we shouldn't
    if (stopped.current)                              return
    if (!isAuthenticated || !accessToken)             return
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return

    const url = `${WS_BASE}/ws?token=${encodeURIComponent(accessToken)}`
    console.debug('[WS] Connecting to', url)
    setStatus('connecting')

    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
      setStatus('error')
      return
    }
    wsRef.current = ws

    // ── onopen ────────────────────────────────────────────────────────────────
    ws.onopen = () => {
      console.debug('[WS] Connected')
      retryCount.current = 0
      setStatus('connected')
    }

    // ── onmessage ─────────────────────────────────────────────────────────────
    ws.onmessage = (ev: MessageEvent) => {
      let msg: { type: string; data: Record<string, unknown> }
      try { msg = JSON.parse(ev.data as string) } catch { return }

      console.debug('[WS] ←', msg.type, msg.data)

      switch (msg.type) {

        // Summary list and stats changed
        case 'summary_created':
        case 'summary_deleted':
          qc.invalidateQueries({ queryKey: ['summaries'] })
          qc.invalidateQueries({ queryKey: ['user-stats'] })
          if (msg.type === 'summary_created') {
            window.dispatchEvent(new CustomEvent('summary_created', { detail: msg.data }))
          }
          break

        // Push new stats directly into the cache (zero extra HTTP call)
        case 'stats_updated':
          if (msg.data && typeof msg.data === 'object') {
            qc.setQueryData(['user-stats'], msg.data)
          }
          break

        // Admin: platform-wide stats refreshed
        case 'admin_stats':
          qc.invalidateQueries({ queryKey: ['admin-analytics'] })
          break

        // Admin: a user connected / disconnected
        case 'user_online':
        case 'user_offline':
          qc.invalidateQueries({ queryKey: ['admin-users'] })
          break

        // Server-pushed notification → toast
        case 'notification': {
          const d = msg.data as { title?: string; message?: string }
          toast(d.message || d.title || 'New notification', { icon: '🔔', duration: 6000 })
          break
        }

        // Server welcome — optionally useful for debugging
        case 'connected':
          console.info('[WS] Welcome:', (msg.data as { message?: string }).message)
          break

        // Keep-alive
        case 'ping':
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong', data: {} }))
          }
          break

        // Auth error from server
        case 'error':
          console.warn('[WS] Server error:', (msg.data as { message?: string }).message)
          setStatus('error')
          break

        default:
          break
      }
    }

    // ── onerror ───────────────────────────────────────────────────────────────
    ws.onerror = (ev) => {
      console.warn('[WS] Error — will close and retry', ev)
      setStatus('error')
      // onclose fires right after, which handles retry
    }

    // ── onclose ───────────────────────────────────────────────────────────────
    ws.onclose = (ev) => {
      wsRef.current = null
      console.debug(`[WS] Closed  code=${ev.code}  reason="${ev.reason}"`)

      // Don't retry on intentional close or auth failure
      if (stopped.current)  { setStatus('disconnected'); return }
      if (ev.code === 4001) { setStatus('error'); return }  // bad token

      setStatus('disconnected')

      if (retryCount.current < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount.current)  // exponential backoff
        console.debug(`[WS] Reconnecting in ${delay}ms  (attempt ${retryCount.current + 1}/${MAX_RETRIES})`)
        retryCount.current++
        retryTimer.current = setTimeout(() => { if (!stopped.current) connect() }, delay)
      } else {
        console.warn('[WS] Max retries reached. Giving up.')
        setStatus('error')
      }
    }
  }, [accessToken, isAuthenticated, qc])   // only stable dependencies

  // ── lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnect()
      return
    }
    stopped.current = false
    connect()
    return () => {
      // Only clean up on unmount (which is the whole app — logout handles the rest)
    }
  }, [isAuthenticated, accessToken, connect, disconnect])

  // ── public API ───────────────────────────────────────────────────────────────
  const send = useCallback((type: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }))
    }
  }, [])

  return { status, send }
}

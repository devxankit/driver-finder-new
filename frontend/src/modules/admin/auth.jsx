import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '@/lib/api'
import { connectAdminSocket, disconnectAdminSocket } from '@/lib/live'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [checking, setChecking] = useState(Boolean(tokenStore.get()))

  const logout = useCallback(() => {
    tokenStore.clear()
    disconnectAdminSocket()
    setAdmin(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    api('/admin/auth/me')
      .then((d) => {
        setAdmin(d.admin)
        connectAdminSocket()
      })
      .catch(() => tokenStore.clear())
      .finally(() => setChecking(false))
  }, [logout])

  const login = useCallback(async (email, password) => {
    const d = await api('/admin/auth/login', { method: 'POST', body: { email, password }, auth: false })
    tokenStore.set(d.token)
    connectAdminSocket()
    setAdmin(d.admin)
  }, [])

  const value = useMemo(() => ({ admin, checking, login, logout, isSuper: admin?.role === 'super' }), [admin, checking, login, logout])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

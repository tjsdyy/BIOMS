'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  id: number
  userId: string
  roleIdTotal?: number
  shopId?: number
  shopName?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 检查本地存储中的认证状态
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('user')
        const isAuth = localStorage.getItem('isAuthenticated')

        if (storedUser && isAuth === 'true') {
          const userData = JSON.parse(storedUser)
          console.log('[AuthContext] 从 localStorage 读取用户信息:', userData)
          setUser(userData)
          setIsAuthenticated(true)
        } else {
          console.log('[AuthContext] localStorage 中没有用户信息', { storedUser, isAuth })
        }
      } catch (error) {
        console.error('检查认证状态失败:', error)
        // 如果解析失败，清除存储
        localStorage.removeItem('user')
        localStorage.removeItem('isAuthenticated')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('isAuthenticated', 'true')
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用')
  }
  return context
}
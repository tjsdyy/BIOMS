import { NextRequest } from 'next/server'
import { User } from './context'

/**
 * 从请求头中获取用户信息
 * 前端需要在请求头中设置 x-user-info（base64 编码）
 * @param request Next.js请求对象
 * @returns 用户信息，如果未找到则返回null
 */
export function getUserFromRequest(request: NextRequest): User | null {
  try {
    const userHeaderBase64 = request.headers.get('x-user-info')

    if (!userHeaderBase64) {
      console.warn('API request missing user info in headers')
      return null
    }

    // 解码 base64 编码的用户信息
    const userJson = decodeURIComponent(Buffer.from(userHeaderBase64, 'base64').toString())
    const user = JSON.parse(userJson) as User

    // 验证必需字段
    if (!user.id || !user.userId) {
      console.warn('Invalid user info in request headers')
      return null
    }

    return user
  } catch (error) {
    console.error('Error parsing user info from request headers:', error)
    return null
  }
}

/**
 * 验证API请求的用户权限
 * @param request Next.js请求对象
 * @returns 用户信息，如果验证失败则抛出错误
 */
export function requireAuth(request: NextRequest): User {
  const user = getUserFromRequest(request)

  if (!user) {
    throw new Error('未授权访问：缺少用户认证信息')
  }

  return user
}
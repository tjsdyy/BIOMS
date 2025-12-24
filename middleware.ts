import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公开路径，不需要认证
  const publicPaths = ['/login', '/api/auth/login']

  // 检查是否是公开路径
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // 如果是受保护的路径，检查认证状态
  // 注意：在中间件中我们无法访问localStorage，所以我们检查cookie或者在客户端组件中处理
  // 这里我们先让请求通过，在客户端组件中处理认证重定向

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 匹配所有路径，除了以下路径：
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
/**
 * 认证请求工具
 * 自动在请求头中添加用户认证信息
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const userStr = localStorage.getItem('user');

  if (userStr) {
    const user = JSON.parse(userStr);
    const userBase64 = btoa(encodeURIComponent(JSON.stringify(user)));

    options.headers = {
      ...options.headers,
      'x-user-info': userBase64,
    };
  }

  return fetch(url, options);
}

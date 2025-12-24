import { User } from './context'
import { getUserNameByUserId } from '../db/queries'

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

/**
 * 获取用户角色
 * @param user 用户信息
 * @returns 用户角色
 */
export function getUserRole(user: User): UserRole {
  // shopId = 0 为管理员
  if (user.shopId === 0) {
    return UserRole.ADMIN
  }

  // roleIdTotal = 41 为店长
  if (user.roleIdTotal === 41) {
    return UserRole.MANAGER
  }

  // 其他为普通员工
  return UserRole.EMPLOYEE
}

/**
 * 检查用户是否为管理员
 * @param user 用户信息
 * @returns 是否为管理员
 */
export function isAdmin(user: User): boolean {
  return getUserRole(user) === UserRole.ADMIN
}

/**
 * 检查用户是否为店长
 * @param user 用户信息
 * @returns 是否为店长
 */
export function isManager(user: User): boolean {
  return getUserRole(user) === UserRole.MANAGER
}

/**
 * 检查用户是否为普通员工
 * @param user 用户信息
 * @returns 是否为普通员工
 */
export function isEmployee(user: User): boolean {
  return getUserRole(user) === UserRole.EMPLOYEE
}

/**
 * 获取用户权限下的门店筛选条件
 * 店长只能查看自己门店的数据，管理员不受限制，普通员工不受门店限制
 * @param user 用户信息
 * @param requestedShop 请求的门店参数
 * @returns 实际应该应用的门店筛选条件
 */
export function getShopFilter(user: User, requestedShop?: string): string | undefined {
  const role = getUserRole(user)

  switch (role) {
    case UserRole.ADMIN:
      // 管理员可以查看任何门店数据
      return requestedShop

    case UserRole.MANAGER:
      // 店长只能查看自己门店的数据，强制使用用户的shopName
      return user.shopName || undefined

    case UserRole.EMPLOYEE:
      // 普通员工可以查看任何门店数据，但只能查看自己的销售数据
      return requestedShop

    default:
      return requestedShop
  }
}

/**
 * 获取用户权限下的销售员筛选条件
 * 员工只能查看自己的销售数据
 * @param user 用户信息
 * @param requestedSalesperson 请求的销售员参数
 * @returns 实际应该应用的销售员筛选条件
 */
export function getSalespersonFilter(user: User, requestedSalesperson?: string): string | undefined {
  const role = getUserRole(user)

  switch (role) {
    case UserRole.ADMIN:
      // 管理员可以查看任何销售员数据
      return requestedSalesperson

    case UserRole.MANAGER:
      // 店长可以查看任何销售员数据（在自己门店范围内）
      return requestedSalesperson

    case UserRole.EMPLOYEE:
      // 普通员工只能查看自己的销售数据，强制使用用户的userId
      return user.userId

    default:
      return requestedSalesperson
  }
}

/**
 * 获取用户权限下的销售员筛选条件（异步版本，将 userId 转换为 userName）
 * 员工只能查看自己的销售数据
 * @param user 用户信息
 * @param requestedSalesperson 请求的销售员参数
 * @returns 实际应该应用的销售员筛选条件（userName）
 */
export async function getSalespersonFilterAsync(user: User, requestedSalesperson?: string): Promise<string | undefined> {
  const role = getUserRole(user)

  switch (role) {
    case UserRole.ADMIN:
      // 管理员可以查看任何销售员数据
      return requestedSalesperson

    case UserRole.MANAGER:
      // 店长可以查看任何销售员数据（在自己门店范围内）
      return requestedSalesperson

    case UserRole.EMPLOYEE:
      // 普通员工只能查看自己的销售数据，需要将 userId 转换为 userName
      if (user.userId) {
        const userName = await getUserNameByUserId(user.userId)
        return userName || undefined
      }
      return undefined

    default:
      return requestedSalesperson
  }
}

/**
 * 检查用户是否可以访问指定门店的数据
 * @param user 用户信息
 * @param shopName 门店名称
 * @returns 是否有权限访问
 */
export function canAccessShop(user: User, shopName: string): boolean {
  const role = getUserRole(user)

  switch (role) {
    case UserRole.ADMIN:
      // 管理员可以访问所有门店
      return true

    case UserRole.MANAGER:
      // 店长只能访问自己的门店
      return user.shopName === shopName

    case UserRole.EMPLOYEE:
      // 普通员工暂时可以访问所有门店
      return true

    default:
      return false
  }
}

/**
 * 获取用户角色的中文名称
 * @param user 用户信息
 * @returns 角色中文名称
 */
export function getUserRoleName(user: User): string {
  const role = getUserRole(user)

  switch (role) {
    case UserRole.ADMIN:
      return '管理员'
    case UserRole.MANAGER:
      return '店长'
    case UserRole.EMPLOYEE:
      return '员工'
    default:
      return '未知'
  }
}
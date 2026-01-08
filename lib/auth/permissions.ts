import { User } from './context'
import { getUserNameByUserId } from '../db/queries'

// 区域经理配置：userId → 可访问的门店ID列表（用于门店列表API）
export const REGIONAL_MANAGER_SHOP_MAP: Record<string, string[]> = {
  'chenweiwei': ['3', '30'],  // 杭州留和路店, 苏州诚品店
  'chenweiweicp': ['3', '30'],  // 杭州留和路店, 苏州诚品店
  'chenweiweihz': ['3', '30'],  // 杭州留和路店, 苏州诚品店
  // 未来可添加更多区域经理，例如：
  // 'zhangsan': ['5', '8', '12'],  // 其他门店
  // 'lisi': ['15', '20'],
}

// 区域经理配置：userId → 可访问的门店名称列表（用于数据查询API）
export const REGIONAL_MANAGER_SHOP_NAMES_MAP: Record<string, string[]> = {
  'chenweiwei': ['杭州留和路店', '苏州诚品店'],
  'chenweiweicp': ['杭州留和路店', '苏州诚品店'],
  'chenweiweihz': ['杭州留和路店', '苏州诚品店'],
  // 未来可添加更多区域经理，例如：
  // 'zhangsan': ['北京店', '上海店', '广州店'],
  // 'lisi': ['深圳店', '成都店'],
}

/**
 * 快速判断是否为区域经理
 * @param userId 用户ID
 * @returns 是否为区域经理
 */
export function isRegionalManager(userId: string): boolean {
  return userId in REGIONAL_MANAGER_SHOP_MAP
}

/**
 * 获取区域经理可访问的门店ID列表
 * @param userId 用户ID
 * @returns 门店ID列表
 */
export function getRegionalManagerShops(userId: string): string[] {
  return REGIONAL_MANAGER_SHOP_MAP[userId] || []
}

/**
 * 获取区域经理可访问的门店名称列表
 * @param userId 用户ID
 * @returns 门店名称列表
 */
export function getRegionalManagerShopNames(userId: string): string[] {
  return REGIONAL_MANAGER_SHOP_NAMES_MAP[userId] || []
}

export enum UserRole {
  ADMIN = 'admin',
  REGIONAL_MANAGER = 'regional_manager',  // 区域经理
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

/**
 * 获取用户角色
 * @param user 用户信息
 * @returns 用户角色
 */
export function getUserRole(user: User): UserRole {
  // 1. 管理员判断（优先级最高）
  if (user.userId === 'caoli' || user.userId === 'mamingyao' || user.userId === 'libaonan') {
    return UserRole.ADMIN
  }

  // 2. 区域经理判断
  if (isRegionalManager(user.userId)) {
    return UserRole.REGIONAL_MANAGER
  }

  // 3. 员工预判断
  if (user.shopId === 0) {
    return UserRole.EMPLOYEE
  }

  // 4. 店长判断
  if (user.roleIdTotal === 41) {
    return UserRole.MANAGER
  }

  // 5. 默认为普通员工
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
 * 检查用户是否为区域经理
 * @param user 用户信息
 * @returns 是否为区域经理
 */
export function isRegionalManagerRole(user: User): boolean {
  return getUserRole(user) === UserRole.REGIONAL_MANAGER
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

    case UserRole.REGIONAL_MANAGER:
      // 区域经理可以查看其管理的门店数据
      const allowedShopNames = getRegionalManagerShopNames(user.userId)

      if (!requestedShop || requestedShop === '') {
        // 如果没有请求特定门店（首次加载），默认返回第一个门店
        return allowedShopNames.length > 0 ? allowedShopNames[0] : undefined
      }

      // 验证请求的门店是否在允许列表中
      if (allowedShopNames.includes(requestedShop)) {
        return requestedShop
      }

      // 如果请求的门店不在允许列表中，返回第一个门店（权限限制）
      return allowedShopNames.length > 0 ? allowedShopNames[0] : undefined

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

    case UserRole.REGIONAL_MANAGER:
      // 区域经理可以查看任何销售员数据（在其管理的门店范围内）
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

    case UserRole.REGIONAL_MANAGER:
      // 区域经理可以查看任何销售员数据（在其管理的门店范围内）
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

    case UserRole.REGIONAL_MANAGER:
      // 区域经理可以访问其管理的门店
      // 暂时简化：只要是区域经理就允许（在实际数据查询时会进一步过滤）
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
    case UserRole.REGIONAL_MANAGER:
      return '区域经理'
    case UserRole.MANAGER:
      return '店长'
    case UserRole.EMPLOYEE:
      return '员工'
    default:
      return '未知'
  }
}
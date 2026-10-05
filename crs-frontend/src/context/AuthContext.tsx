/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  fetchAddresses,
  createAddress as apiCreateAddress,
  updateAddress as apiUpdateAddress,
  deleteAddress as apiDeleteAddress,
  setDefaultAddress as apiSetDefaultAddress,
  mapDbAddress,
} from '../services/auth'
import type { Address, Role, User } from '../types'

export type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  authModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void
  login: (user: User, token?: string) => void
  logout: () => void
  updateUserProfile: (data: Partial<User>) => void
  addAddress: (address: Omit<Address, 'id'>) => Promise<Address | null>
  updateAddress: (id: string, address: Partial<Address>) => Promise<Address | null>
  deleteAddress: (id: string) => Promise<void>
  setDefaultAddress: (id: string) => Promise<void>
  roleLabel: (role: Role) => string
}

export function roleLabel(role: Role): string {
  return role === 'admin' ? 'Quản Trị Viên' : 'Khách hàng'
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('crs_user')
    if (!stored) return null
    try {
      const parsed = JSON.parse(stored) as User & { phone_number?: string }
      if (!parsed.role) {
        parsed.role = 'user'
      }
      if (parsed.addresses && parsed.addresses.length > 0) {
        parsed.addresses = parsed.addresses.map((a: any) =>
          a.recipient_name ? mapDbAddress(a) : a
        )
      }
      localStorage.setItem('crs_user', JSON.stringify(parsed))
      localStorage.setItem('crs_role', parsed.role)
      return parsed
    } catch {
      localStorage.removeItem('crs_user')
      localStorage.removeItem('crs_role')
      return null
    }
  })

  const setAuthModalOpen = (open: boolean) => {
    if (open) {
      window.location.href = '/login'
    }
  }

  useEffect(() => {
    if (user) {
      localStorage.setItem('crs_user', JSON.stringify(user))
    }
  }, [user])

  useEffect(() => {
    const unauthorized = () => setUser(null)
    window.addEventListener('crs:unauthorized', unauthorized)
    return () => window.removeEventListener('crs:unauthorized', unauthorized)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetchAddresses(user.id as number)
      .then((addrs) => {
        setUser((prev) => {
          if (!prev) return null
          const updated = { ...prev, addresses: addrs }
          localStorage.setItem('crs_user', JSON.stringify(updated))
          return updated
        })
      })
      .catch(() => {
        /* silent */
      })
  }, [user?.id])

  const login = (nextUser: User & { phone_number?: string; addresses?: any[] }, token = 'demo-token') => {
    const role: Role = nextUser.role === 'admin' ? 'admin' : (nextUser.role || 'user')

    const normalizedAddresses: Address[] = (nextUser.addresses ?? []).map((a: any) =>
      a.recipient_name ? mapDbAddress(a) : (a as Address)
    )

    const fullUser: User = {
      ...nextUser,
      role,
      addresses: normalizedAddresses,
    }
    localStorage.setItem('crs_token', token)
    localStorage.setItem('crs_user', JSON.stringify(fullUser))
    localStorage.setItem('crs_role', fullUser.role)

    setUser(fullUser)
    window.dispatchEvent(new CustomEvent('crs:user-login', { detail: fullUser }))

    toast.success(`Chào mừng trở lại, ${fullUser.name}!`, {
      description:
        fullUser.role === 'admin'
          ? 'Đã đăng nhập với quyền Quản Trị Viên.'
          : 'Bạn đã đăng nhập thành công vào Striker.',
    })
  }

  const logout = () => {
    localStorage.removeItem('crs_token')
    localStorage.removeItem('crs_user')
    localStorage.removeItem('crs_role')
    localStorage.removeItem('crs_coupon')
    setUser(null)
    window.dispatchEvent(new CustomEvent('crs:user-logout'))
    toast.info('Đã đăng xuất tài khoản')
  }

  const updateUserProfile = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      localStorage.setItem('crs_user', JSON.stringify(updated))
      return updated
    })
    toast.success('Đã lưu thay đổi thông tin cá nhân!')
  }

  const addAddress = async (newAddr: Omit<Address, 'id'>): Promise<Address | null> => {
    if (!user?.id) return null
    try {
      const created = await apiCreateAddress(user.id as number, newAddr)
      setUser((prev) => {
        if (!prev) return null
        const addresses = prev.addresses ?? []
        const updated = created.isDefault
          ? addresses.map((a) => ({ ...a, isDefault: false }))
          : [...addresses]
        const nextUser = { ...prev, addresses: [...updated, created] }
        localStorage.setItem('crs_user', JSON.stringify(nextUser))
        return nextUser
      })
      toast.success('Đã thêm địa chỉ nhận hàng mới!')
      return created
    } catch (e) {
      toast.error('Không thể thêm địa chỉ. Vui lòng thử lại.')
      throw e
    }
  }

  const updateAddress = async (id: string, addrData: Partial<Address>): Promise<Address | null> => {
    if (!user?.id) return null
    try {
      const updated = await apiUpdateAddress(id, addrData)
      setUser((prev) => {
        if (!prev) return null
        const addresses = prev.addresses ?? []
        const nextAddresses = addresses.map((a) => {
          if (String(a.id) === String(id)) {
            return { ...a, ...updated }
          }
          if (updated.isDefault) {
            return { ...a, isDefault: false }
          }
          return a
        })
        const nextUser = { ...prev, addresses: nextAddresses }
        localStorage.setItem('crs_user', JSON.stringify(nextUser))
        return nextUser
      })
      toast.success('Đã cập nhật địa chỉ thành công!')
      return updated
    } catch (e) {
      toast.error('Không thể cập nhật địa chỉ. Vui lòng thử lại.')
      throw e
    }
  }

  const deleteAddress = async (id: string) => {
    if (!user?.id) return
    try {
      await apiDeleteAddress(id)
      setUser((prev) => {
        if (!prev) return null
        const addresses = (prev.addresses ?? []).filter((a) => a.id !== id)
        const nextUser = { ...prev, addresses }
        localStorage.setItem('crs_user', JSON.stringify(nextUser))
        return nextUser
      })
      toast.info('Đã xóa địa chỉ khỏi sổ địa chỉ')
    } catch {
      toast.error('Không thể xóa địa chỉ. Vui lòng thử lại.')
    }
  }

  const setDefaultAddress = async (id: string) => {
    if (!user?.id) return
    try {
      await apiSetDefaultAddress(id)
      setUser((prev) => {
        if (!prev) return null
        const addresses = (prev.addresses ?? []).map((a) => ({ ...a, isDefault: a.id === id }))
        const nextUser = { ...prev, addresses }
        localStorage.setItem('crs_user', JSON.stringify(nextUser))
        return nextUser
      })
      toast.success('Đã đặt làm địa chỉ mặc định!')
    } catch {
      toast.error('Không thể cập nhật địa chỉ mặc định.')
    }
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    authModalOpen: false,
    setAuthModalOpen,
    login,
    logout,
    updateUserProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    roleLabel,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

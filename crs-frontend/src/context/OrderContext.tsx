/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { fetchOrders, mapBackendOrder, cancelOrder as apiCancelOrder } from '../services/orders'
import type { Order, OrderStatus, PaymentStatus } from '../types'
import { useAuth } from './AuthContext'

export type OrderContextValue = {
  orders: Order[]
  ordersLoading: boolean
  refreshOrders: () => Promise<void>
  addOrder: (order: Order) => void
  updateOrderStatus: (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => void
  cancelOrder: (orderId: string) => Promise<void>
}

const OrderContext = createContext<OrderContextValue | null>(null)

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const refreshOrders = async () => {
    if (!user?.id) {
      setOrders([])
      return
    }
    setOrdersLoading(true)
    try {
      const raw = await fetchOrders(user.id as number)
      const list: any[] = Array.isArray(raw) ? raw : raw?.data ?? []
      setOrders(list.map(mapBackendOrder))
    } catch {
      // Silent fail
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    void refreshOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    const handleLogout = () => {
      setOrders([])
    }
    window.addEventListener('crs:user-logout', handleLogout)
    return () => {
      window.removeEventListener('crs:user-logout', handleLogout)
    }
  }, [])

  const addOrder = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev])
  }

  const updateOrderStatus = (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status, ...(paymentStatus ? { paymentStatus } : {}) }
          : o
      )
    )
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('order-status-changed'))
    }
  }

  const cancelOrder = async (orderId: string) => {
    try {
      await apiCancelOrder(orderId)
      updateOrderStatus(orderId, 'cancelled')
      toast.success(`Đã hủy đơn hàng ${orderId} thành công!`)
    } catch {
      toast.error('Không thể hủy đơn hàng. Vui lòng thử lại.')
    }
  }

  const value: OrderContextValue = {
    orders,
    ordersLoading,
    refreshOrders,
    addOrder,
    updateOrderStatus,
    cancelOrder,
  }

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}

export function useOrders() {
  const context = useContext(OrderContext)
  if (!context) throw new Error('useOrders must be used inside OrderProvider')
  return context
}

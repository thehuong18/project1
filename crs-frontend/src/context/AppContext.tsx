/* eslint-disable react-refresh/only-export-components */
import { type ReactNode } from 'react'
import { AuthProvider, useAuth, roleLabel, type AuthContextValue } from './AuthContext'
import { CartProvider, useCart, type CartContextValue } from './CartContext'
import { OrderProvider, useOrders, type OrderContextValue } from './OrderContext'

export type AppContextValue = AuthContextValue & CartContextValue & OrderContextValue

/**
 * Root AppProvider combining all modular domain contexts:
 * - AuthProvider (User, Session, Addresses)
 * - CartProvider (Cart items, Calculations, Coupons, Cart drawer)
 * - OrderProvider (User order history, Status changes, Order cancellation)
 */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <OrderProvider>{children}</OrderProvider>
      </CartProvider>
    </AuthProvider>
  )
}

/**
 * Consolidated hook for backward compatibility across the entire frontend.
 * Combines AuthContext, CartContext, and OrderContext.
 */
export function useApp(): AppContextValue {
  const auth = useAuth()
  const cart = useCart()
  const orders = useOrders()

  return {
    ...auth,
    ...cart,
    ...orders,
  }
}

// Re-export individual hooks for fine-grained subscriptions and cleaner architecture
export { useAuth, useCart, useOrders, roleLabel }
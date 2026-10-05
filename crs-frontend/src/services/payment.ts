import api from './api'

export interface InitiateMomoPayload {
  order_id: number | string
  amount: number
  user_id?: number | string
  order_code?: string
  order_number?: string
}

export interface MomoInitiateResponse {
  pay_url: string
  order_id: number
  payment_id: number
  transaction_id: number
  momo_response?: any
}

/**
 * Call payment-service to initialize a MoMo QR / ATM payment link
 */
export async function initiateMomoPayment(payload: InitiateMomoPayload): Promise<MomoInitiateResponse | null> {
  try {
    const response = await api.post('/payment/momo/start', payload)
    return response.data?.data ?? null
  } catch (error) {
    console.error('Lỗi khởi tạo thanh toán MoMo:', error)
    return null
  }
}

/**
 * Get payment status from payment-service
 */
export async function fetchPaymentStatus(orderId: number | string) {
  try {
    const response = await api.get('/payments/status', { params: { order_id: orderId } })
    return response.data?.data ?? null
  } catch {
    return null
  }
}

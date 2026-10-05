import axios, { type AxiosError } from 'axios'

/**
 * Standard interface for backend error payloads
 */
interface BackendErrorResponse {
  success?: boolean
  message?: string
  error?: string | {
    message?: string
    details?: Record<string, string | string[]>
  }
  errors?: Record<string, string | string[]> | string[]
  [key: string]: unknown
}

/**
 * Từ điển chuyển đổi các thông báo lỗi Laravel phổ biến sang tiếng Việt thân thiện
 */
const ERROR_TRANSLATIONS: Record<string, string> = {
  'The email has already been taken.': 'Địa chỉ Email này đã được một tài khoản khác đăng ký sử dụng. Vui lòng chọn email khác.',
  'The phone has already been taken.': 'Số điện thoại này đã được tài khoản khác sử dụng.',
  'The identifier has already been taken.': 'Email hoặc số điện thoại này đã tồn tại trong hệ thống.',
  'The password field must be at least 6 characters.': 'Mật khẩu phải có tối thiểu 6 ký tự.',
  'The current_password field is incorrect.': 'Mật khẩu hiện tại không chính xác.',
  'These credentials do not match our records.': 'Thông tin đăng nhập hoặc mật khẩu không chính xác.',
  'Unauthenticated.': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'CSRF token mismatch.': 'Phiên làm việc đã hết hạn. Vui lòng tải lại trang.',
}

function translateErrorMessage(msg: string): string {
  if (!msg) return msg
  const trimmed = msg.trim()
  if (ERROR_TRANSLATIONS[trimmed]) {
    return ERROR_TRANSLATIONS[trimmed]
  }

  // Regex matches
  if (/email.*already been taken/i.test(trimmed)) {
    return 'Địa chỉ Email này đã được một tài khoản khác đăng ký sử dụng. Vui lòng chọn email khác.'
  }
  if (/phone.*already been taken/i.test(trimmed)) {
    return 'Số điện thoại này đã được một tài khoản khác đăng ký sử dụng.'
  }
  if (/password.*at least \d+ characters/i.test(trimmed)) {
    return 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.'
  }

  return trimmed
}

/**
 * Extract a single, friendly, human-readable error message from any error object
 */
export function getErrorMessage(error: unknown, fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại!'): string {
  if (!error) return fallbackMessage

  // If it's already a plain string
  if (typeof error === 'string') {
    return translateErrorMessage(error.trim()) || fallbackMessage
  }

  // If it's an Axios error with server response
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<BackendErrorResponse>
    const resData = axiosErr.response?.data
    const status = axiosErr.response?.status

    // 1. Check first field validation error in `errors` or `error.details`
    const fieldError = getFirstFieldError(error)
    if (fieldError) {
      return translateErrorMessage(fieldError)
    }

    // 2. Check nested error message: { error: { message: "..." } }
    if (typeof resData?.error === 'object' && resData?.error?.message) {
      return translateErrorMessage(resData.error.message)
    }

    // 3. Check if error itself is a string: { error: "..." }
    if (typeof resData?.error === 'string' && resData.error.trim()) {
      return translateErrorMessage(resData.error)
    }

    // 4. Check main `message` field (e.g. { message: "..." })
    if (typeof resData?.message === 'string' && resData.message.trim()) {
      const msg = resData.message.trim()
      if (!msg.toLowerCase().includes('server error') && !msg.toLowerCase().includes('sqlstate')) {
        return translateErrorMessage(msg)
      }
    }

    // 5. Fallback based on HTTP Status Codes
    if (status) {
      switch (status) {
        case 400:
          return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.'
        case 401:
          return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.'
        case 403:
          return 'Bạn không có quyền thực hiện thao tác này.'
        case 404:
          return 'Không tìm thấy dữ liệu yêu cầu.'
        case 409:
          return 'Dữ liệu đã tồn tại hoặc xảy ra xung đột.'
        case 422:
          return 'Thông tin không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.'
        case 429:
          return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.'
        case 500:
        case 502:
        case 503:
        case 504:
          return 'Hệ thống máy chủ đang bận hoặc gặp sự cố. Vui lòng thử lại sau.'
        default:
          break
      }
    }

    // 6. Network connection issues (No response received)
    if (axiosErr.code === 'ERR_NETWORK' || axiosErr.message === 'Network Error' || !axiosErr.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng internet.'
    }

    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
      return 'Yêu cầu quá thời gian chờ (Timeout). Vui lòng thử lại.'
    }
  }

  // Standard JS Error
  if (error instanceof Error && error.message) {
    return translateErrorMessage(error.message)
  }

  return fallbackMessage
}

/**
 * Extract all field-level validation errors into a clean key-value map
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!axios.isAxiosError(error)) return result

  const resData = error.response?.data as BackendErrorResponse | undefined
  if (!resData) return result

  const errorsObj = resData.errors || (typeof resData.error === 'object' ? resData.error?.details : null)

  if (errorsObj && typeof errorsObj === 'object' && !Array.isArray(errorsObj)) {
    for (const [key, val] of Object.entries(errorsObj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        result[key] = translateErrorMessage(val[0])
      } else if (typeof val === 'string') {
        result[key] = translateErrorMessage(val)
      }
    }
  }

  return result
}

/**
 * Extract the first specific field validation error message if present
 */
export function getFirstFieldError(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null

  const resData = error.response?.data as BackendErrorResponse | undefined
  if (!resData) return null

  const errorsObj = resData.errors || (typeof resData.error === 'object' ? resData.error?.details : null)

  if (errorsObj && typeof errorsObj === 'object') {
    if (Array.isArray(errorsObj) && errorsObj.length > 0 && typeof errorsObj[0] === 'string') {
      return translateErrorMessage(errorsObj[0])
    }

    for (const key of Object.keys(errorsObj)) {
      const val = (errorsObj as Record<string, unknown>)[key]
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        return translateErrorMessage(val[0])
      }
      if (typeof val === 'string' && val.trim()) {
        return translateErrorMessage(val)
      }
    }
  }

  return null
}

/**
 * Check whether an error was caused by loss of internet / network disconnection
 */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return (
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    (!error.response && Boolean(error.request))
  )
}

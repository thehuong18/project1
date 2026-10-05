import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request Interceptor: Attach bearer token if available
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      localStorage.getItem('crs_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('accessToken')

    if (token && token !== 'demo-token') {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Global error & auth event dispatching
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')

    // 401 Unauthorized: Expired or invalid token
    if (status === 401 && !isAuthEndpoint) {
      console.warn('⚠️ Token expired or unauthorized access:', url)
      localStorage.removeItem('crs_token')
      localStorage.removeItem('crs_user')
      localStorage.removeItem('crs_role')
      window.dispatchEvent(new CustomEvent('crs:unauthorized'))
    }

    // 403 Forbidden
    if (status === 403) {
      window.dispatchEvent(new CustomEvent('crs:forbidden'))
    }

    // 503 Service Unavailable
    if (status === 503) {
      window.dispatchEvent(new CustomEvent('crs:offline'))
    }

    return Promise.reject(error)
  }
)

export default api

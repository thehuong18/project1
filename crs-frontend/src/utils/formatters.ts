/**
 * Utility functions for formatting currency, dates, numbers, and strings across the application.
 */

/**
 * Format a number or numeric string to Vietnamese Dong (VND) currency string.
 * Example: 1500000 -> "1.500.000 ₫"
 */
export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0 ₫'
  }
  const numericVal = Math.round(Number(amount))
  return `${numericVal.toLocaleString('vi-VN')} ₫`
}

/**
 * Format a date string, timestamp, or Date object into Vietnamese locale string.
 * Example: "2026-10-03T08:30:00Z" -> "03/10/2026" or "15:30 03/10/2026"
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  mode: 'date' | 'datetime' | 'time' = 'date'
): string {
  if (!dateInput) return '—'

  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return String(dateInput)

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    if (mode === 'datetime') {
      return `${hours}:${minutes} ${day}/${month}/${year}`
    }
    if (mode === 'time') {
      return `${hours}:${minutes}`
    }
    return `${day}/${month}/${year}`
  } catch {
    return String(dateInput)
  }
}

/**
 * Format Vietnamese phone number for display.
 * Example: "0987654321" -> "0987 654 321"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  return phone
}

/**
 * Format a plain integer with thousands separators.
 * Example: 12500 -> "12.500"
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined || isNaN(Number(num))) {
    return '0'
  }
  return Number(num).toLocaleString('vi-VN')
}

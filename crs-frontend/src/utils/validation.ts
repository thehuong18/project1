/**
 * Form and input validation helper utilities.
 */

// Regex RFC 5322 standard email format
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Regex Vietnamese phone numbers (10 digits starting with 03, 05, 07, 08, 09 or +84)
const VN_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/

/**
 * Validate an email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Validate Vietnamese phone number format
 */
export function isValidVietnamesePhone(phone: string): boolean {
  if (!phone) return false
  const cleanPhone = phone.replace(/[\s.-]/g, '')
  return VN_PHONE_REGEX.test(cleanPhone)
}

/**
 * Validate password requirements
 */
export function isValidPassword(
  password: string,
  minLength = 6
): { isValid: boolean; message?: string } {
  if (!password || password.length === 0) {
    return { isValid: false, message: 'Vui lòng nhập mật khẩu.' }
  }
  if (password.length < minLength) {
    return { isValid: false, message: `Mật khẩu phải có tối thiểu ${minLength} ký tự.` }
  }
  return { isValid: true }
}

/**
 * Validate 6-digit numeric OTP code
 */
export function isValidOTP(otp: string, length = 6): boolean {
  if (!otp) return false
  const clean = otp.replace(/\D/g, '')
  return clean.length === length
}

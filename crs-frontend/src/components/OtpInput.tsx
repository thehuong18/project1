import React, { useRef, useEffect } from 'react'

export interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  hasError?: boolean
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
  hasError = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputsRef.current[0]?.focus()
    }
  }, [autoFocus, disabled])

  const handleChange = (index: number, val: string) => {
    const cleanDigit = val.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = cleanDigit
    const nextVal = newDigits.join('')
    onChange(nextVal)

    if (cleanDigit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }

    if (nextVal.length === length && onComplete) {
      onComplete(nextVal)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus()
      } else if (digits[index]) {
        const newDigits = [...digits]
        newDigits[index] = ''
        onChange(newDigits.join(''))
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pastedData) return

    onChange(pastedData)

    const nextIndex = Math.min(pastedData.length, length - 1)
    inputsRef.current[nextIndex]?.focus()

    if (pastedData.length === length && onComplete) {
      onComplete(pastedData)
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={`h-12 w-10 sm:h-14 sm:w-12 rounded-xl text-center font-mono text-xl sm:text-2xl font-black text-lime-400 outline-none transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/50' : 'bg-slate-900/90'
          } ${
            hasError
              ? 'border-rose-500/80 ring-2 ring-rose-500/20'
              : 'border border-white/10 hover:border-white/20 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30'
          }`}
        />
      ))}
    </div>
  )
}

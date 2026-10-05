import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
  maxWidth?: string
}

export function AuthLayout({ children, maxWidth = 'max-w-md' }: AuthLayoutProps) {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat overflow-y-auto py-12 px-4 selection:bg-lime-400 selection:text-slate-950 font-sans"
      style={{
        backgroundImage:
          "url('https://www.sport9.vn/images/thumbs/002/0023958_b%C3%B3ng-da-mon-the-thao-vua.jpeg')",
      }}
    >
      {/* Dark Blur Overlay */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md pointer-events-none" />

      {/* Centered Glassmorphism Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative z-10 w-full ${maxWidth} p-8 sm:p-10 rounded-3xl bg-slate-950/90 border border-white/10 shadow-2xl backdrop-blur-2xl text-white`}
      >
        {children}
      </motion.div>
    </div>
  )
}


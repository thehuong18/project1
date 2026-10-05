import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Tự động cuộn trang lên đầu mỗi khi chuyển route / chuyển trang trong ứng dụng.
 * Khắc phục hoàn toàn lỗi SPA giữ nguyên vị trí scroll của trang trước.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    // Nếu có hash (ví dụ #specs, #reviews), thử cuộn tới element đó
    if (hash) {
      const id = hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }

    // Cuộn ngay lập tức về đầu trang (0, 0)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, search, hash])

  return null
}

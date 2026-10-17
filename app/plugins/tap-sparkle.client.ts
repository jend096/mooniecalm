// ===== ดาวแวบทุกครั้งที่กดปุ่ม (app/plugins/tap-sparkle.client.ts) =====
// ดักการกดทั้งแอปที่เดียว: กดปุ่ม/ลิงก์ตรงไหน จะมีดาวเล็กๆ พุ่งออกจากจุดที่นิ้วแตะแล้วจางหาย
// ปุ่มที่กดไม่ได้ (disabled) ไม่เกิดเอฟเฟกต์ / อยากปิดเฉพาะจุดไหน ใส่ data-no-sparkle ที่ปุ่มหรือกล่องที่ครอบอยู่
// ตัวเอฟเฟกต์อยู่ใน ~/utils/sparkle-burst.ts (คนที่ตั้งค่า "ลดแอนิเมชัน" ไว้จะไม่เห็น)
import { sparkleBurstAt } from '~/utils/sparkle-burst'

export default defineNuxtPlugin(() => {
  // iOS Safari จะไม่ใช้สไตล์ :active (ปุ่มยุบตอนกด ดู assets/css/press.css) ถ้าหน้าเว็บไม่มีตัวดักการแตะ เลยใส่ตัวว่างๆ ไว้
  document.addEventListener('touchstart', () => {}, { passive: true })

  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest?.('button, a[href], [role="button"]') as HTMLElement | null
      if (!el || el.closest('[data-no-sparkle]')) return
      if ((el as HTMLButtonElement).disabled) return

      // กดด้วยคีย์บอร์ดจะได้พิกัด 0,0 -> ใช้จุดกลางของปุ่มแทน
      let x = e.clientX
      let y = e.clientY
      if (!x && !y) {
        const rect = el.getBoundingClientRect()
        x = rect.left + rect.width / 2
        y = rect.top + rect.height / 2
      }
      sparkleBurstAt(x, y, 7)
    },
    true
  )
})

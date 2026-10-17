// ===== ประกายดาวแวบ ๆ ตอนกดปุ่ม (app/utils/sparkle-burst.ts) =====
// ใช้: sparkleBurst(event.currentTarget as HTMLElement) หรือ sparkleBurstAt(x, y)  -> มีดาวเล็กๆ พุ่งออกจากกลางปุ่ม แล้วจางหายใน ~0.8 วินาที
// ทำงานด้วย Web Animations API: สร้างดาวชั่วคราวติดบนจอ (position: fixed) แล้วลบทิ้งเองเมื่อเล่นจบ
// คนที่ตั้งค่า "ลดแอนิเมชัน" ไว้ในเครื่อง จะไม่เห็นเอฟเฟกต์นี้
const STAR_COLORS = ['#FE7777', '#FFA8E6', '#CCBBFF', '#FF6E8A', '#FFD7E2']
const STAR_PATH = 'M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z'

export function sparkleBurst(target: HTMLElement | null | undefined, count = 9) {
  if (!target || typeof document === 'undefined') return
  // จุดกลางของปุ่ม (พิกัดบนจอ)
  const rect = target.getBoundingClientRect()
  sparkleBurstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, count)
}

// ปล่อยดาวแวบ ณ จุดที่กำหนดบนจอ (cx, cy เป็นพิกัดหน้าจอ) ใช้กับการกดทุกปุ่มผ่านปลั๊กอิน tap-sparkle
export function sparkleBurstAt(cx: number, cy: number, count = 9) {
  if (typeof document === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  for (let i = 0; i < count; i++) {
    const size = 8 + Math.random() * 10
    const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    star.setAttribute('viewBox', '0 0 24 24')
    star.setAttribute('aria-hidden', 'true')
    star.style.cssText = `position:fixed;left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;pointer-events:none;z-index:9999;`
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', STAR_PATH)
    path.setAttribute('fill', STAR_COLORS[i % STAR_COLORS.length]!)
    star.appendChild(path)
    document.body.appendChild(star)

    // กระจายรอบทิศทาง (แบ่งมุมเท่าๆ กัน + สุ่มเพิ่มนิดหน่อยให้ดูเป็นธรรมชาติ)
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
    const distance = 28 + Math.random() * 28
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance - 8 // ลอยขึ้นนิดๆ

    const animation = star.animate(
      [
        { transform: 'translate(0, 0) scale(0.3) rotate(0deg)', opacity: 0 },
        { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(1.1) rotate(60deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.4) rotate(140deg)`, opacity: 0 }
      ],
      { duration: 650 + Math.random() * 250, easing: 'ease-out', fill: 'forwards' }
    )
    animation.onfinish = () => star.remove()
  }
}

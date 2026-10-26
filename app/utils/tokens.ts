// ===== อ่านค่าสีจาก tokens.css ไปใช้ในโค้ด JS / canvas (app/utils/tokens.ts) =====
// canvas ใช้ตัวแปร CSS (var(--...)) ตรงๆ ไม่ได้ จึงต้องอ่านค่าจริงจากหน้าเว็บมาใช้
// ผลคือแก้สีที่ app/assets/css/tokens.css ที่เดียว รูปที่วาดด้วย canvas (การ์ดแชร์ ฯลฯ) ก็เปลี่ยนตามด้วย
// ค่าสำรอง (fallback) ใช้เฉพาะตอนอ่านไม่ได้ (เช่นรันบนเซิร์ฟเวอร์) ปกติไม่ถูกใช้

export function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

// "#FFD7E2" -> "255, 215, 226" (ไว้ประกอบเป็น rgba(...) ใน canvas)
export function hexToRgbText(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

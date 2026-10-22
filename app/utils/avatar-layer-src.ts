// เลือกไฟล์รูปของอวตารแต่ละชั้น (ใช้ทั้งโชว์บนหน้าจอและวาดลงรูปการ์ดที่แชร์)
// ตา / หู(ตัว) / สีตัว ใช้ SVG (ส่งออกจาก Figma) ย่อขยายได้คมไม่แตก
// ส่วนชั้นเอฟเฟกต์ (รหัสขึ้นต้นด้วย fx_) ใน Figma ใช้ noise ซึ่งส่งออกเป็น SVG แล้วไม่เหมือนต้นฉบับ จึงยังต้องใช้ PNG
// animated = true: ชั้นตัวกระต่าย (ear_*) ใช้ไฟล์ที่หูขยับได้ (public/avatar/anim) ไว้โชว์บนหน้าจอเท่านั้น
// รูปการ์ดแชร์ไม่ต้องส่ง animated เพราะวาดลงรูปนิ่ง
export function avatarLayerSrc(code: string | null, animated = false): string {
  if (!code) return ''
  if (code.startsWith('fx_')) return `/avatar/${code}.png`
  if (animated && code.startsWith('ear_')) return `/avatar/anim/${code}.svg`
  return `/avatar/${code}.svg`
}

// เลือกไฟล์รูปของอวตารแต่ละชั้น (ใช้ทั้งโชว์บนหน้าจอและวาดลงรูปการ์ดที่แชร์)
// ตา / หู(ตัว) / สีตัว ใช้ SVG (ส่งออกจาก Figma) ย่อขยายได้คมไม่แตก
// ส่วนชั้นเอฟเฟกต์ (รหัสขึ้นต้นด้วย fx_) ใน Figma ใช้ noise ซึ่งส่งออกเป็น SVG แล้วไม่เหมือนต้นฉบับ จึงยังต้องใช้ PNG
export function avatarLayerSrc(code: string | null): string {
  if (!code) return ''
  return code.startsWith('fx_') ? `/avatar/${code}.png` : `/avatar/${code}.svg`
}

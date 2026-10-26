import type { Config } from 'tailwindcss'

// ตัวช่วย: ทำให้ใช้ความโปร่งใสกับสีจาก CSS variable ได้ เช่น bg-moon-pink/50 หรือ text-moon-ink/60
// (Tailwind ปกติทำไม่ได้กับสีที่เป็น var(...) ทำให้คลาสแบบ /50 เงียบหายไปเฉยๆ)
// ถ้าไม่ได้ใส่ /ตัวเลข จะใช้สีเต็มตามเดิม
const moon = (variable: string) =>
  (({ opacityValue }: { opacityValue?: string | number }) => {
    // ไม่มี /ตัวเลข (Tailwind จะส่งมาเป็น undefined หรือ var(--tw-...)) → ใช้สีเต็ม
    if (opacityValue === undefined || String(opacityValue).startsWith('var(')) return `var(${variable})`
    // มี /ตัวเลข เช่น /50 → ผสมกับโปร่งใสตามเปอร์เซ็นต์
    return `color-mix(in srgb, var(${variable}) ${Number(opacityValue) * 100}%, transparent)`
  }) as unknown as string

export default {
  theme: {
    extend: {
      // ฟอนต์หลักของทั้งแอป: ทุกตัวอักษรใช้ Anuphan อัตโนมัติ (ไม่ต้องเขียน font-['Anuphan'] ซ้ำ)
      // ถ้าโหลดฟอนต์ไม่ทัน/ไม่ได้ จะใช้ฟอนต์ของเครื่องแทนตามลำดับ
      // น้ำหนักที่โหลดจริง: 400 (font-normal), 500 (font-medium), 600 (font-semibold) ตรงกับ Figma
      fontFamily: {
        sans: ['Anuphan', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      // ขนาดตัวหนังสือ + ความสูงบรรทัด ตามที่ใช้จริงใน Figma
      // (ทับค่ามาตรฐานของ Tailwind ที่ชื่อซ้ำ เช่น text-sm จะเป็น 14/21 แทน 14/20)
      fontSize: {
        xxs: ['11px', '16px'],   // ป้ายเล็ก เช่น เบา/กลาง/มาก, วันในสัปดาห์
        xs: ['12px', '18px'],    // ข้อความย่อย/คำอธิบายใต้การ์ด
        sm: ['14px', '21px'],    // เนื้อหาทั่วไปในการ์ด
        base: ['16px', '24px'],  // หัวข้อการ์ด/ปุ่ม
        lg: ['18px', '26px'],    // หัวข้อส่วน
        xl: ['20px', '28px'],    // หัวข้อรอง
        '2xl': ['24px', '32px'], // หัวหน้าจอ เช่น "เช็คอินประจำวัน"
        '3xl': ['30px', '38px']  // หัวใหญ่/ตัวเลขเด่น
      },
      // มุมโค้ง: การ์ดใน Figma ส่วนใหญ่โค้ง 20 (rounded-2xl=16, rounded-3xl=24, ปุ่มแคปซูลใช้ rounded-full)
      borderRadius: {
        card: '20px'
      },
      colors: {
        // สีหลัก
        'moon-ink': moon('--color-ink'),
        'moon-bg': moon('--color-bg'),
        'moon-bg-end': moon('--color-bg-end'),
        'moon-pink': moon('--color-pink'),
        // สีเสริม
        'moon-cream': moon('--color-cream'),
        'moon-lavender': moon('--color-lavender'),
        'moon-coral': moon('--color-coral'),
        // สีของประจำเดือน
        'moon-period': moon('--color-period-day'),
        'moon-period-predicted': moon('--color-period-predicted'),
        // พื้นการ์ดอ่อน + ตัวหนังสือรอง
        'moon-card': moon('--color-card'),
        'moon-pink-soft': moon('--color-pink-soft'),
        'moon-cream-soft': moon('--color-cream-soft'),
        'moon-lavender-soft': moon('--color-lavender-soft'),
        'moon-chip': moon('--color-chip'),
        'moon-muted': moon('--color-muted'),
        'moon-yellow': moon('--color-yellow'),
        'moon-gray': moon('--color-gray'),
        'moon-gray-soft': moon('--color-gray-soft'),
        'moon-handle': moon('--color-handle'),
        'moon-placeholder': moon('--color-placeholder'),
        'moon-hint': moon('--color-hint'),
        'moon-error': moon('--color-error'),
        'moon-on-ink': moon('--color-on-ink'),
        // ชื่อเก่า (ยังมีหน้าเดิมใช้อยู่ ปรับครบแล้วค่อยลบ)
        'moon-peach': moon('--color-accent-peach')
      }
    }
  }
} satisfies Partial<Config>

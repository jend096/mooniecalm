// เช็คกับเซิร์ฟเวอร์ว่า "ผู้ใช้ที่ล็อกอินค้างอยู่ในเบราว์เซอร์" ยังมีอยู่จริงไหม
//
// ทำไมต้องมี: supabase.auth.getSession() อ่านจากเครื่อง (localStorage) อย่างเดียว ไม่ถามเซิร์ฟเวอร์
// ถ้าเราไปลบผู้ใช้ใน Supabase แล้ว session เก่ายังค้างอยู่ในเบราว์เซอร์
// แอปเลยคิดว่ายังล็อกอินอยู่ แล้วข้ามหน้ากรอกอีเมลไปหน้ากรอกชื่อเลย
//
// คืนค่า true  = ผู้ใช้ยังอยู่ (หรือเช็คไม่ได้เพราะเน็ตหลุด ให้ถือว่ายังใช้ต่อได้ ไม่เด้งออกมั่ว ๆ)
// คืนค่า false = ผู้ใช้ถูกลบแล้ว/โทเคนใช้ไม่ได้ -> ล้าง session ที่ค้างในเครื่องทิ้งให้อัตโนมัติ
export async function isSessionStillValid(): Promise<boolean> {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    // 401/403 หรือ user_not_found = เซิร์ฟเวอร์บอกว่าผู้ใช้นี้ไม่มีแล้ว
    const status = (error as { status?: number }).status
    const code = (error as { code?: string }).code
    const gone = status === 401 || status === 403 || code === 'user_not_found'
    if (!gone) return true // error แบบอื่น (เช่นเน็ตหลุด) ไม่ถือว่าผู้ใช้ถูกลบ
  } else if (data.user) {
    return true
  }

  // ล้างเฉพาะ session ในเครื่องนี้ (scope: 'local') ไม่ไปกระทบเครื่องอื่น
  await supabase.auth.signOut({ scope: 'local' })
  return false
}

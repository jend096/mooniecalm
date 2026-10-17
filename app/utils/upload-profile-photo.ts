// อัปโหลดรูปโปรไฟล์ (ที่ตัดแล้ว) ขึ้น Supabase Storage แล้วบันทึกลิงก์ลงตาราง user_profiles
// ใช้ทั้งหน้า onboarding/photo และหน้าแก้รูปจากหน้าหลัก
// คืนค่าเป็นลิงก์รูปใหม่
export async function uploadProfilePhoto(photo: Blob): Promise<string> {
  const { data: sessionData } = await useSupabaseClient().auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('ยังไม่ได้เข้าสู่ระบบ')

  const supabase = await getAuthedSupabaseClient()

  // ตั้งชื่อไฟล์ตามผู้ใช้ (1 คน 1 รูป) อัปรูปใหม่จะทับรูปเก่า
  const path = `${userId}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, photo, { upsert: true, contentType: 'image/jpeg' })
  if (uploadError) throw uploadError

  // ต่อท้ายลิงก์ด้วยเวลา กันเบราว์เซอร์/CDN โชว์รูปเก่าที่จำไว้ (ชื่อไฟล์ซ้ำกับรูปเดิม)
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ profile_image_url: url })
    .eq('auth_user_id', userId)
  if (updateError) throw updateError

  return url
}

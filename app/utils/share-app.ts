// ===== แชร์แอป (app/utils/share-app.ts) =====
// ใช้ทั้งหน้า home (ปุ่มแชร์ใต้อวตาร) และหน้า reveal: แชร์เป็น "รูปการ์ดอวตาร + ลิงก์ให้คนอื่นเข้ามาลองเล่น"
// ลิงก์ = ที่อยู่เว็บที่เปิดอยู่ตอนกดแชร์ (บนเว็บจริงคือ mooniecalm.vercel.app)

// ข้อความชวนเล่น แนบลิงก์ไว้ในข้อความด้วย (แอปแชทบางตัวรับแค่ข้อความ ไม่รับ url แยก)
function inviteText(nickname: string): string {
  return `${nickname} ชวนมาลองเล่น MoonieCalm! เข้าเล่นได้ที่ ${window.location.origin}`
}

// Opens the native share sheet, or copies the link when it isn't available.
// Returns 'copied' so the caller can show a toast.
export async function shareApp(nickname: string): Promise<'shared' | 'copied'> {
  const shareData = {
    title: 'MoonieCalm',
    text: inviteText(nickname),
    url: window.location.origin
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch {
      // user cancelled the share sheet, nothing to do
    }
    return 'shared'
  }

  await navigator.clipboard.writeText(shareData.url)
  return 'copied'
}

// แชร์รูปการ์ดอวตาร (blob) พร้อมข้อความชวนเล่นที่มีลิงก์
//   'shared' = เปิดหน้าต่างแชร์ของเครื่องแล้ว (หรือผู้ใช้กดยกเลิก)
//   'saved'  = เครื่องแชร์ไฟล์ไม่ได้ (เช่นเปิดบนคอม) -> ดาวน์โหลดรูปให้ และคัดลอกลิงก์ไว้ในคลิปบอร์ดด้วย
//   'copied' = สร้างรูปไม่สำเร็จ -> ถอยไปแชร์/คัดลอกแค่ลิงก์
export async function shareAvatarCard(nickname: string, blob: Blob | null): Promise<'shared' | 'saved' | 'copied'> {
  if (!blob) return await shareApp(nickname) === 'copied' ? 'copied' : 'shared'

  const file = new File([blob], 'mooniecalm-avatar.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'MoonieCalm', text: inviteText(nickname) })
    } catch {
      // กดยกเลิกหน้าต่างแชร์ ไม่ต้องทำอะไร
    }
    return 'shared'
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'mooniecalm-avatar.png'
  link.click()
  URL.revokeObjectURL(url)
  try {
    await navigator.clipboard.writeText(window.location.origin)
  } catch {
    // คัดลอกลิงก์ไม่ได้ก็ไม่เป็นไร รูปการ์ดมีที่อยู่เว็บเขียนอยู่แล้ว
  }
  return 'saved'
}

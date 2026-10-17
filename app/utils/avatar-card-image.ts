// วาด "รูปการ์ดอวตาร" สำหรับแชร์ลงโซเชียล (สัดส่วนแนวตั้ง 9:16 แบบสตอรี่ไอจี) ด้วย canvas
// มีแค่ ชื่อแอป + อวตาร + ข้อความสั้นๆ + ลายตกแต่ง (วาดเองด้วย canvas เลยไม่ต้องลง library เพิ่ม)

interface AvatarCardImageInput {
  nickname: string
  // ชื่อไฟล์รูปอวตารเรียงจากล่างสุดไปบนสุด เช่น ['fx_warm_rosy', 'ear_erect', ...]
  layerCodes: string[]
}

// สีเดียวกับ tokens.css (canvas ใช้ตัวแปร CSS ตรงๆ ไม่ได้ เลยใส่ค่าสีตรงนี้)
const COLORS = {
  ink: '#292929',
  muted: '#6B6264',
  coral: '#FE7777',
  pink: '#FFD7E2',
  lavender: '#CCBBFF',
  predicted: '#FFA8E6',
  bgStart: '#FFFDFC',
  bgEnd: '#FFEFF4'
}

const FONT_FAMILY = 'Anuphan, "Noto Sans Thai", sans-serif'

const WIDTH = 1080
const HEIGHT = 1920

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null) // รูปไหนโหลดไม่ได้ก็ข้ามไป ไม่ให้ทั้งการ์ดพัง
    img.src = src
  })
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ตัดบรรทัดตามความกว้าง ภาษาไทยไม่มีเว้นวรรค เลยใช้ Intl.Segmenter ตัดตามคำ
// (ถ้าเบราว์เซอร์ไม่มี จะตัดทีละตัวอักษรแทน)
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  type SegmenterCtor = new (locale: string, options: { granularity: string }) => {
    segment(input: string): Iterable<{ segment: string }>
  }
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter
  const pieces = Segmenter
    ? Array.from(new Segmenter('th', { granularity: 'word' }).segment(text), s => s.segment)
    : Array.from(text)

  const lines: string[] = []
  let line = ''
  for (const piece of pieces) {
    const attempt = line + piece
    if (line && ctx.measureText(attempt).width > maxWidth) {
      lines.push(line.trimEnd())
      line = piece.trimStart()
    } else {
      line = attempt
    }
  }
  if (line.trim()) lines.push(line.trimEnd())
  return lines
}

// ---------- ลายตกแต่ง ----------

// ประกายดาว 4 แฉก (เว้าเข้าตรงกลาง)
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rotation = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.fillStyle = color
  ctx.beginPath()
  const angles = [-90, 0, 90, 180].map(a => (a * Math.PI) / 180)
  ctx.moveTo(0, -r)
  for (let i = 0; i < 4; i++) {
    const next = angles[(i + 1) % 4]!
    const mid = angles[i]! + Math.PI / 4
    ctx.quadraticCurveTo(Math.cos(mid) * r * 0.16, Math.sin(mid) * r * 0.16, Math.cos(next) * r, Math.sin(next) * r)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

// กรอบกระจก (glass): ขาวโปร่งไล่เฉด + ขอบขาว + เงาฟุ้งนุ่มๆ
// (canvas ทำเบลอพื้นหลังจริงไม่ได้ในทุกเบราว์เซอร์ เลยจำลองด้วยสีขาวโปร่ง ซึ่งพื้นหลังเราเป็นแสงฟุ้งอยู่แล้ว)
function drawGlass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.save()
  ctx.shadowColor = 'rgba(254, 119, 119, 0.22)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 24
  const fill = ctx.createLinearGradient(x, y, x + w, y + h)
  fill.addColorStop(0, 'rgba(255, 255, 255, 0.78)')
  fill.addColorStop(1, 'rgba(255, 255, 255, 0.38)')
  ctx.fillStyle = fill
  roundedRectPath(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.restore()

  // ขอบขาวเงาๆ
  const edge = ctx.createLinearGradient(x, y, x + w, y + h)
  edge.addColorStop(0, 'rgba(255, 255, 255, 1)')
  edge.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)')
  edge.addColorStop(1, 'rgba(255, 255, 255, 0.9)')
  ctx.strokeStyle = edge
  ctx.lineWidth = 4
  roundedRectPath(ctx, x, y, w, h, r)
  ctx.stroke()
}

export async function renderAvatarCardImage(input: AvatarCardImageInput): Promise<Blob> {
  // รอให้ฟอนต์ที่ใช้โหลดเสร็จก่อนวาด ไม่งั้นตัวหนังสือจะเป็นฟอนต์สำรอง
  if (document.fonts) {
    await Promise.all([
      document.fonts.load(`700 72px ${FONT_FAMILY}`),
      document.fonts.load(`500 44px ${FONT_FAMILY}`)
    ]).catch(() => {})
  }

  const images = await Promise.all(input.layerCodes.map(code => loadImage(`/avatar/${code}.png`)))
  // โลโก้ปัจจุบัน: พระจันทร์ + กระต่าย (วงกลม) แล้วตามด้วยชื่อ Moonie Calm สองบรรทัดอยู่ข้างขวา
  // + คิวอาร์โค้ดมุมขวาล่าง (ไฟล์อยู่ที่ public/brand/qr.png)
  const [moonImg, rabbitImg, wordmarkImg, qrImg] = await Promise.all([
    loadImage('/brand/moon.svg'),
    loadImage('/brand/rabbit.svg'),
    loadImage('/brand/wordmark-two.svg'),
    loadImage('/brand/qr.png')
  ])

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // ----- คำนวณความสูงเนื้อหาทั้งก้อน แล้ววางให้อยู่กึ่งกลางแนวตั้ง (เว้นที่ด้านล่างไว้ให้คิวอาร์) -----
  const logoSize = 210 // วงกลมโลโก้
  const wordW = 210 // ชื่อ Moonie Calm (ไฟล์ wordmark-two.svg สัดส่วน 236 x 159)
  const wordH = Math.round((wordW * 159) / 236)
  const logoGap = 28 // ระยะระหว่างวงกลมกับชื่อ
  const brandH = logoSize
  const avatarSize = 840 // อวตารไม่มีกรอบ วางเต็มๆ
  const overlap = 70 // การ์ดข้อความซ้อนทับขอบล่างของอวตาร
  const gap = 40
  const boxX = 100
  const boxW = WIDTH - boxX * 2
  const textW = boxW - 120
  const bottomReserve = 120 // พื้นที่ด้านล่างที่เว้นไว้ให้คิวอาร์ + ลิงก์ (ยิ่งน้อย เนื้อหายิ่งขยับลงล่าง)
  const title = `ยินดีด้วย ${input.nickname}!`
  // ชื่อยาวมาก ค่อยๆ ลดขนาดตัวอักษรจนพอดีกรอบ ถ้าเล็กสุดแล้วยังไม่พอก็ตัดขึ้นบรรทัดใหม่
  let titleSize = 76
  ctx.font = `700 ${titleSize}px ${FONT_FAMILY}`
  while (titleSize > 52 && ctx.measureText(title).width > textW) {
    titleSize -= 4
    ctx.font = `700 ${titleSize}px ${FONT_FAMILY}`
  }
  const titleLines = wrapText(ctx, title, textW)
  const titleLineH = Math.round(titleSize * 1.4)
  const subtitleSize = 44
  const subtitleH = 64
  const boxH = 64 + titleLines.length * titleLineH + 20 + subtitleH + 56

  const contentH = brandH + gap + avatarSize - overlap + boxH
  const top = Math.max(60, Math.round((HEIGHT - bottomReserve - contentH) / 2))
  const brandY = top
  const avatarX = (WIDTH - avatarSize) / 2
  const avatarY = brandY + brandH + gap
  const avatarCy = avatarY + avatarSize / 2
  const boxY = avatarY + avatarSize - overlap

  // ----- พื้นหลัง: ตรงกลางสีขาว ไล่ออกไปเป็นชมพูอ่อน (สีแบรนด์) -----
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  bg.addColorStop(0, '#FFFFFF')
  bg.addColorStop(0.5, '#FFF6F9')
  bg.addColorStop(1, '#FFD7E2')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  drawGlow(ctx, WIDTH / 2, avatarCy, 720, '255, 255, 255', 1) // แสงขาวด้านหลังอวตาร ให้ขอบรูปกลืนกับพื้น
  drawGlow(ctx, 120, 1750, 560, '255, 215, 226', 0.8) // ชมพู ล่างซ้าย
  drawGlow(ctx, 980, 260, 460, '255, 215, 226', 0.6) // ชมพู ขวาบน

  // ----- ลายตกแต่ง: ประกายดาวแค่ไม่กี่ดวง ไม่ให้รก -----
  drawStar(ctx, 120, 280, 38, COLORS.coral, -0.2)
  drawStar(ctx, 960, 400, 28, COLORS.lavender)
  drawStar(ctx, 110, 1180, 30, COLORS.predicted)
  drawStar(ctx, 975, 1240, 36, COLORS.lavender, 0.15)

  // ----- โลโก้ + ชื่อแอป (วงกลมซ้าย ชื่อขวา) จัดกลุ่มให้อยู่กึ่งกลางการ์ด -----
  const lockupW = logoSize + logoGap + wordW
  const logoX = (WIDTH - lockupW) / 2
  if (moonImg) {
    // 1) พระจันทร์
    ctx.drawImage(moonImg, logoX, brandY, logoSize, logoSize)
    // 2) กระต่าย: ตัดให้อยู่ในวงกลมเหมือนในแอป
    if (rabbitImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(logoX + logoSize / 2, brandY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(rabbitImg, logoX, brandY, logoSize, logoSize)
      ctx.restore()
    }
    // 3) ประกายในวงกลมโลโก้ (ตำแหน่งตามโลโก้ในแอป วัดบนกรอบ 240 แล้วย่อ/ขยายตามขนาด)
    const k = logoSize / 240
    const sparks = [
      { x: 20, y: 130, s: 20, color: COLORS.coral },
      { x: 191, y: 145, s: 20, color: '#FFFFEC' },
      { x: 9, y: 114, s: 13, color: '#FFFFEC' },
      { x: 220, y: 120, s: 13, color: '#E6DDFF' },
      { x: 13, y: 163, s: 13, color: '#E6DDFF' },
      { x: 206, y: 169, s: 10, color: COLORS.coral }
    ]
    for (const sp of sparks) {
      drawStar(ctx, logoX + (sp.x + sp.s / 2) * k, brandY + (sp.y + sp.s / 2) * k, (sp.s / 2) * k * 1.3, sp.color)
    }
  }
  const wordX = logoX + logoSize + logoGap
  if (wordmarkImg) {
    ctx.drawImage(wordmarkImg, wordX, brandY + (logoSize - wordH) / 2, wordW, wordH)
  } else {
    // ถ้ารูปชื่อโหลดไม่ได้ ใช้ตัวหนังสือแทน
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `700 64px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.ink
    ctx.fillText('Moonie', wordX, brandY + logoSize / 2 - 4)
    ctx.fillText('Calm', wordX, brandY + logoSize / 2 + 64)
  }

  // ----- อวตาร: ไม่มีกรอบ ไม่มีเงา เบลอขอบ 4 ด้านให้กลืนกับพื้นหลัง -----
  // วาดทุกเลเยอร์ลงผืนผ้าใบแยกก่อน แล้วค่อยทำขอบจางแล้วแปะลงการ์ด
  const avatarCanvas = document.createElement('canvas')
  avatarCanvas.width = avatarSize
  avatarCanvas.height = avatarSize
  const actx = avatarCanvas.getContext('2d')!
  for (const img of images) {
    if (img) actx.drawImage(img, 0, 0, avatarSize, avatarSize)
  }
  // ขอบจาง: ใช้ destination-in กับไล่สีโปร่งใส -> ทึบ ทีละด้าน (ไม่ใช้ ctx.filter เพราะ Safari บางรุ่นไม่รองรับ)
  const feather = 90
  actx.globalCompositeOperation = 'destination-in'
  const edges: [number, number, number, number][] = [
    [0, 0, feather, 0], // ซ้าย
    [avatarSize, 0, avatarSize - feather, 0], // ขวา
    [0, 0, 0, feather], // บน
    [0, avatarSize, 0, avatarSize - feather] // ล่าง
  ]
  for (const [x0, y0, x1, y1] of edges) {
    const g = actx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, 'rgba(0, 0, 0, 0)')
    g.addColorStop(1, 'rgba(0, 0, 0, 1)')
    actx.fillStyle = g
    actx.fillRect(0, 0, avatarSize, avatarSize)
  }
  // จางวงกลมอีกชั้น ให้มุมสี่เหลี่ยมของรูปหายไป เหลือแต่แสงฟุ้งกลมๆ (ตัวละครอยู่กลางภาพ ไม่โดนจาง)
  const c = avatarSize / 2
  const radial = actx.createRadialGradient(c, c, avatarSize * 0.42, c, c, avatarSize * 0.68)
  radial.addColorStop(0, 'rgba(0, 0, 0, 1)')
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)')
  actx.fillStyle = radial
  actx.fillRect(0, 0, avatarSize, avatarSize)
  ctx.drawImage(avatarCanvas, avatarX, avatarY)

  // ----- การ์ดข้อความกระจก: ซ้อนอยู่บนขอบล่างของอวตาร -----
  drawGlass(ctx, boxX, boxY, boxW, boxH, 64)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COLORS.ink
  ctx.font = `700 ${titleSize}px ${FONT_FAMILY}`
  titleLines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, boxY + 64 + titleSize + i * titleLineH)
  })
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 ${subtitleSize}px ${FONT_FAMILY}`
  ctx.fillText('นี่คืออวตารตัวจิ๋วของคุณ', WIDTH / 2, boxY + 64 + titleLines.length * titleLineH + 20 + subtitleSize + 4)

  // ----- มุมขวาล่าง: คิวอาร์โค้ด (แผ่นขาวรองให้สแกนง่าย) + ที่อยู่เว็บอยู่ฝั่งซ้าย -----
  const qrPlate = 216
  const qrX = WIDTH - 80 - qrPlate
  const qrY = HEIGHT - 60 - qrPlate
  if (qrImg) {
    ctx.save()
    ctx.shadowColor = 'rgba(254, 119, 119, 0.2)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    ctx.fillStyle = '#FFFFFF'
    roundedRectPath(ctx, qrX, qrY, qrPlate, qrPlate, 28)
    ctx.fill()
    ctx.restore()
    const pad = 14
    ctx.drawImage(qrImg, qrX + pad, qrY + pad, qrPlate - pad * 2, qrPlate - pad * 2)
  }
  // ที่อยู่เว็บ ใช้ที่อยู่ที่เปิดอยู่ตอนกดแชร์ (ถ้าไม่มีคิวอาร์จะอยู่กึ่งกลางล่าง)
  const hasQr = !!qrImg
  ctx.textAlign = hasQr ? 'left' : 'center'
  const textX = hasQr ? 100 : WIDTH / 2
  const midY = qrY + qrPlate / 2
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 40px ${FONT_FAMILY}`
  ctx.fillText('ลองเล่นได้ที่', textX, midY - 6)
  let hostSize = 46
  ctx.font = `700 ${hostSize}px ${FONT_FAMILY}`
  const maxHostW = hasQr ? qrX - 100 - 30 : WIDTH - 200
  while (hostSize > 28 && ctx.measureText(window.location.host).width > maxHostW) {
    hostSize -= 2
    ctx.font = `700 ${hostSize}px ${FONT_FAMILY}`
  }
  ctx.fillStyle = COLORS.ink
  ctx.fillText(window.location.host, textX, midY + 54)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('สร้างรูปการ์ดไม่สำเร็จ'))), 'image/png')
  })
}

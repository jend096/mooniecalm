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

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// เครื่องหมาย +
function drawPlus(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - r, y)
  ctx.lineTo(x + r, y)
  ctx.moveTo(x, y - r)
  ctx.lineTo(x, y + r)
  ctx.stroke()
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
  // โลโก้ปัจจุบัน: พระจันทร์ + กระต่าย + ชื่อ MoonieCalm (ไฟล์เดียวกับที่ใช้ในแอป)
  const [moonImg, rabbitImg, wordmarkImg] = await Promise.all([
    loadImage('/brand/moon.svg'),
    loadImage('/brand/rabbit.svg'),
    loadImage('/brand/wordmark-one.svg')
  ])

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // ----- คำนวณความสูงเนื้อหาทั้งก้อน แล้ววางให้อยู่กึ่งกลางแนวตั้ง -----
  // ส่วนหัว = โลโก้วงกลม (พระจันทร์+กระต่าย) วางบน ชื่อ MoonieCalm วางล่าง
  const logoSize = 220
  const wordW = 400
  const wordH = Math.round((wordW * 85) / 399) // สัดส่วนไฟล์ wordmark-one.svg คือ 399 x 85
  const logoGap = 22
  const brandH = logoSize + logoGap + wordH
  const frame = 720
  const gap = 60
  const boxX = 100
  const boxW = WIDTH - boxX * 2
  const textW = boxW - 120
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

  const contentH = brandH + gap + frame + gap + boxH
  const top = Math.round((HEIGHT - contentH) / 2)
  const brandY = top
  const frameCx = WIDTH / 2
  const frameCy = brandY + brandH + gap + frame / 2
  const boxY = frameCy + frame / 2 + gap

  // ----- พื้นหลัง: ไล่สีชมพูอ่อน + แสงฟุ้งสีชมพู/ม่วง -----
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  bg.addColorStop(0, COLORS.bgStart)
  bg.addColorStop(0.5, COLORS.bgEnd)
  bg.addColorStop(1, '#FFE6F0')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  drawGlow(ctx, 900, 260, 520, '254, 119, 119', 0.25) // โคอรัล มุมขวาบน
  drawGlow(ctx, 120, 900, 560, '204, 187, 255', 0.45) // ลาเวนเดอร์ ซ้ายกลาง
  drawGlow(ctx, 960, 1350, 520, '255, 168, 230', 0.3) // ชมพูบานเย็น ขวาล่าง
  drawGlow(ctx, 300, 1800, 640, '255, 215, 226', 0.7) // ชมพู ล่างซ้าย

  // ----- ลายตกแต่งด้านหลัง: ประกายดาวกับจุดสีอ่อนๆ กระจายรอบภาพ -----
  drawStar(ctx, 130, 250, 44, COLORS.coral, -0.2)
  drawStar(ctx, 950, 170, 34, COLORS.lavender)
  drawStar(ctx, 90, 760, 38, COLORS.predicted)
  drawStar(ctx, 990, 1250, 42, COLORS.lavender, 0.15)
  drawStar(ctx, 80, 1500, 50, COLORS.lavender)
  drawStar(ctx, 930, 1700, 36, COLORS.coral)
  drawStar(ctx, 250, 1850, 30, COLORS.predicted)
  drawStar(ctx, 840, 100, 22, COLORS.coral)
  drawDot(ctx, 60, 1060, 14, COLORS.coral)
  drawDot(ctx, 1010, 640, 14, COLORS.lavender)
  drawDot(ctx, 880, 1810, 12, COLORS.predicted)
  drawDot(ctx, 200, 150, 10, COLORS.lavender)
  drawPlus(ctx, 1000, 420, 18, COLORS.coral)
  drawPlus(ctx, 70, 1300, 16, COLORS.lavender)

  // ----- โลโก้ + ชื่อแอปด้านบน (ไม่มีแคปซูลกระจกแล้ว) -----
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const logoX = (WIDTH - logoSize) / 2
  if (moonImg) {
    // 1) พระจันทร์
    ctx.drawImage(moonImg, logoX, brandY, logoSize, logoSize)
    // 2) กระต่าย: ตัดให้อยู่ในวงกลมเหมือนในแอป
    if (rabbitImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(WIDTH / 2, brandY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(rabbitImg, logoX, brandY, logoSize, logoSize)
      ctx.restore()
    }
    // 3) ประกายรอบพระจันทร์ (ตำแหน่งตามโลโก้ในแอป วัดบนกรอบ 240 แล้วย่อ/ขยายตามขนาด)
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
  if (wordmarkImg) {
    ctx.drawImage(wordmarkImg, (WIDTH - wordW) / 2, brandY + logoSize + logoGap, wordW, wordH)
  } else {
    // ถ้ารูปชื่อโหลดไม่ได้ ใช้ตัวหนังสือแทน
    ctx.font = `700 64px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.coral
    ctx.fillText('MoonieCalm', WIDTH / 2, brandY + logoSize + logoGap + 60)
  }

  // ----- อวตาร: วางเต็มกรอบมนมุม (ไม่มีกรอบขาวซ้อน) เอียงนิดๆ -----
  const frameX = -frame / 2
  const frameY = -frame / 2
  ctx.save()
  ctx.translate(frameCx, frameCy)
  ctx.rotate(-0.03)

  // แสงฟุ้งสีชมพูหลังรูป
  drawGlow(ctx, 0, 0, 560, '255, 215, 226', 0.9)

  ctx.save()
  ctx.shadowColor = 'rgba(254, 119, 119, 0.3)'
  ctx.shadowBlur = 70
  ctx.shadowOffsetY = 30
  ctx.fillStyle = '#FFFFFF' // ใช้เป็นฐานให้เงา (ถูกรูปอวตารทับหมด ไม่เห็นเป็นกรอบ)
  roundedRectPath(ctx, frameX, frameY, frame, frame, 72)
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundedRectPath(ctx, frameX, frameY, frame, frame, 72)
  ctx.clip()
  for (const img of images) {
    if (img) ctx.drawImage(img, frameX, frameY, frame, frame)
  }
  ctx.restore()
  ctx.restore()

  // ประกายที่ทับมุมรูป ให้ดูเหมือนฟุ้งออกมา
  drawStar(ctx, frameCx - 350, frameCy - 360, 54, COLORS.coral, 0.2)
  drawStar(ctx, frameCx + 360, frameCy + 340, 58, COLORS.lavender)
  drawStar(ctx, frameCx + 385, frameCy - 365, 26, COLORS.predicted)
  drawStar(ctx, frameCx - 380, frameCy + 320, 24, COLORS.coral)

  // ----- กรอบข้อความกระจก -----
  drawGlass(ctx, boxX, boxY, boxW, boxH, 64)

  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.ink
  ctx.font = `700 ${titleSize}px ${FONT_FAMILY}`
  titleLines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, boxY + 64 + titleSize + i * titleLineH)
  })
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 ${subtitleSize}px ${FONT_FAMILY}`
  ctx.fillText('นี่คืออวตารตัวจิ๋วของคุณ', WIDTH / 2, boxY + 64 + titleLines.length * titleLineH + 20 + subtitleSize + 4)

  // ลายตกแต่งเล็กๆ ที่มุมกรอบข้อความ
  drawStar(ctx, boxX + boxW - 30, boxY + 20, 34, COLORS.lavender)
  drawStar(ctx, boxX + 30, boxY + boxH - 14, 26, COLORS.coral)

  // ที่อยู่เว็บใต้การ์ด ให้คนที่เห็นรูป (เช่น แคปไปโพสต์ต่อ) เข้ามาลองเล่นได้ ใช้ที่อยู่เว็บที่เปิดอยู่ตอนกดแชร์
  ctx.fillStyle = COLORS.muted
  ctx.font = `500 40px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  // วางใต้กรอบข้อความ (เผื่อเนื้อหายาว ไม่ให้ทับกัน)
  const linkY = Math.min(HEIGHT - 70, top + contentH + 90)
  ctx.fillText(`ลองเล่นได้ที่ ${window.location.host}`, WIDTH / 2, linkY)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('สร้างรูปการ์ดไม่สำเร็จ'))), 'image/png')
  })
}

// ===== ตัวช่วยหน้า "รพ.ใกล้ฉัน" (app/pages/hospital.vue) =====
// ข้อมูลโรงพยาบาล/คลินิก: OpenStreetMap ผ่าน Overpass API เป็นตัวหลัก (ฟรี ไม่ต้องมีคีย์)
//   ดึงแท็ก phone / contact:phone (เบอร์โทร) และ opening_hours (เวลาทำการ) มาด้วยทุกครั้ง
// ถ้า Overpass เรียกไม่สำเร็จ/ล่มทุกเจ้า จะสลับไปใช้ Nominatim (ค้นหาของ OSM เหมือนกัน) แทนอัตโนมัติ ผู้ใช้ไม่ต้องกดอะไร
// เส้นทาง: OSRM สาธารณะ (ฟรี) เพื่อวาดเส้นบนแผนที่ + บอกระยะ/เวลา  ส่วนปุ่ม "เปิดใน Google Maps" ใช้ลิงก์ธรรมดา
// หมายเหตุ: ข้อมูล OSM บางแห่งไม่มีเบอร์โทร/เวลาทำการ หน้าจะไม่โชว์ปุ่มโทรของที่นั่น

export interface Hospital {
  id: string
  name: string
  lat: number
  lng: number
  distanceKm: number
  phone: string | null // เบอร์แรกที่เจอ เก็บเฉพาะตัวเลขกับ + (ใช้ต่อท้าย tel: เพื่อโทรออก)
  hours: string | null // ข้อความเวลาเปิด-ปิดที่แปลเป็นไทยแล้ว (null = ไม่มีข้อมูล)
}

export interface LatLng { lat: number, lng: number }

export interface RouteInfo {
  distanceKm: number
  minutes: number
  path: [number, number][] // [lat, lng] ต่อกันเป็นเส้นทาง
}

// เซิร์ฟเวอร์ Overpass หลายเจ้า (เซิร์ฟเวอร์สาธารณะล่มสลับกันบ่อย): ถามพร้อมกัน ใครตอบสำเร็จก่อนใช้เจ้านั้น
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

// ระยะทางเส้นตรงระหว่างสองจุด (กม.)
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km))
}

// ---------- เวลาทำการ (opening_hours ของ OSM -> ไทย) ----------
const DAY_TH: Record<string, string> = {
  Mo: 'จ.', Tu: 'อ.', We: 'พ.', Th: 'พฤ.', Fr: 'ศ.', Sa: 'ส.', Su: 'อา.', PH: 'วันหยุดนักขัตฤกษ์'
}

// แปลงเป็นข้อความสั้นๆ: 24/7 -> "เปิด 24 ชม."  "Mo-Fr 08:00-16:00" -> "เปิด จ.-ศ. 08:00-16:00 น."
// รูปแบบซับซ้อนแปลเท่าที่แปลได้ (ชื่อวัน / off / ทุกวัน) ส่วนที่เหลือคงตามต้นฉบับ
function readHours(raw: string | undefined): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  if (v === '24/7') return 'เปิด 24 ชม.'
  const t = v
    .replace(/\bMo-Su\b/g, 'ทุกวัน')
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, d => DAY_TH[d] ?? d)
    .replace(/\boff\b/gi, 'ปิด')
    .replace(/\s*;\s*/g, ' · ')
    .replace(/(\d{1,2}:\d{2}-\d{1,2}:\d{2})/g, '$1 น.')
  return `เปิด ${t}`
}

// ---------- เบอร์โทร (phone / contact:phone) ----------
// ลำดับที่หา: phone -> contact:phone -> phone:th -> mobile -> contact:mobile (ถ้ามีหลายเบอร์คั่นด้วย ; , / เอาเบอร์แรก)
function rawPhone(tags: Record<string, string>): string {
  const raw = tags.phone || tags['contact:phone'] || tags['phone:th'] || tags.mobile || tags['contact:mobile'] || ''
  return raw.split(/[;,/]/)[0]?.trim() ?? ''
}

// คืนเบอร์ที่ใช้ต่อท้าย tel: ได้ (ตัดช่องว่าง/ขีด/วงเล็บ เหลือ + กับตัวเลข) ถ้าไม่มีคืน null
export function pickPhone(tags: Record<string, string>): string | null {
  const cleaned = rawPhone(tags).replace(/[^\d+]/g, '')
  return cleaned.length >= 5 ? cleaned : null
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number, lon: number }
  tags?: Record<string, string>
}

function toHospitals(elements: OverpassElement[], origin: LatLng): Hospital[] {
  const seen = new Set<string>()
  const result: Hospital[] = []
  for (const el of elements) {
    const tags = el.tags ?? {}
    const name = tags['name:th'] || tags.name || tags['name:en']
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (!name || lat === undefined || lng === undefined) continue
    const key = `${name}|${lat.toFixed(3)}|${lng.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    const phone = pickPhone(tags)
    result.push({
      id: `${el.type}/${el.id}`,
      name,
      lat,
      lng,
      distanceKm: distanceKm(origin, { lat, lng }),
      phone,
      hours: readHours(tags.opening_hours)
    })
  }
  return result.sort((a, b) => a.distanceKm - b.distanceKm)
}

// ยิงคำขอพร้อมตัดเวลา: เซิร์ฟเวอร์ที่ค้าง/ตอบช้าเกินกำหนดจะถูกข้ามไป ไม่ให้ผู้ใช้รอนาน
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ถามทุกเซิร์ฟเวอร์ Overpass พร้อมกัน ใครตอบสำเร็จก่อนใช้เจ้านั้น (ทุกเจ้าล้มเหลว = โยน error)
async function runOverpass(query: string): Promise<OverpassElement[]> {
  return Promise.any(OVERPASS_URLS.map(async (url) => {
    const res = await fetchWithTimeout(`${url}?data=${encodeURIComponent(query)}`, 10000)
    if (!res.ok) throw new Error(`overpass ${res.status}`)
    const json = await res.json() as { elements?: OverpassElement[] }
    // บางเจ้าตอบ 200 แต่เป็นข้อความ error ไม่มี elements -> ถือว่าล้มเหลว ให้เจ้าอื่นแทน
    if (!json.elements) throw new Error('overpass bad response')
    return json.elements
  }))
}

// ---------- ตัวสำรอง: Nominatim ----------
// ใช้เมื่อ Overpass ล่มเท่านั้น  ข้อมูลมาจาก OSM เหมือนกัน (ขอ extratags มาด้วยเพื่อให้ได้ phone / opening_hours เท่าที่มี)
interface NominatimItem {
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  name?: string
  type?: string
  extratags?: Record<string, string>
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const MEDICAL_TYPES = new Set(['hospital', 'clinic', 'doctors'])
const NOMINATIM_TYPE: Record<string, string> = { node: 'node', way: 'way', relation: 'relation' }

async function runNominatim(text: string, origin: LatLng, deg: number): Promise<Hospital[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: text,
    viewbox: `${origin.lng - deg},${origin.lat + deg},${origin.lng + deg},${origin.lat - deg}`,
    bounded: '1',
    limit: '40',
    extratags: '1',
    'accept-language': 'th'
  })
  const res = await fetchWithTimeout(`${NOMINATIM_URL}?${params}`, 12000)
  if (!res.ok) throw new Error(`nominatim ${res.status}`)
  const items = await res.json() as NominatimItem[]
  // แปลงเป็นรูปเดียวกับที่ Overpass ส่งมา แล้วใช้ตัวแปลงตัวเดียวกัน (เบอร์/เวลาทำการ/ระยะทางจะออกมาเหมือนกัน)
  const elements: OverpassElement[] = items
    .filter(r => r.name && MEDICAL_TYPES.has(r.type ?? ''))
    .map(r => ({
      type: NOMINATIM_TYPE[r.osm_type] ?? 'node',
      id: r.osm_id,
      lat: Number(r.lat),
      lon: Number(r.lon),
      tags: { ...(r.extratags ?? {}), name: r.name! }
    }))
  return toHospitals(elements, origin)
}

// โรงพยาบาล/คลินิกรอบจุดที่กำหนด (รัศมีเป็นเมตร) เรียงจากใกล้ไปไกล
// Overpass ก่อน -> ถ้าไม่สำเร็จค่อยสลับไป Nominatim (ค้นคำว่า "โรงพยาบาล" กับ "คลินิก" ในกรอบรอบตัวผู้ใช้)
// ล่มทั้งสองแหล่ง = โยน error ให้หน้าเว็บขึ้นข้อความ "โหลดไม่สำเร็จ"
export async function fetchNearbyHospitals(origin: LatLng, radiusM = 8000, limit = 15): Promise<Hospital[]> {
  const q = `[out:json][timeout:20];nwr["amenity"~"^(hospital|clinic)$"]["name"](around:${radiusM},${origin.lat},${origin.lng});out center tags 120;`
  let list: Hospital[]
  try {
    list = toHospitals(await runOverpass(q), origin)
  } catch {
    const deg = radiusM / 111000
    const results = await Promise.allSettled([
      runNominatim('โรงพยาบาล', origin, deg),
      runNominatim('คลินิก', origin, deg)
    ])
    if (results.every(r => r.status === 'rejected')) throw new Error('overpass and nominatim both failed')
    const seen = new Set<string>()
    list = results
      .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
      .filter(h => (seen.has(h.id) ? false : (seen.add(h.id), true)))
      .filter(h => h.distanceKm * 1000 <= radiusM * 1.05)
      .sort((a, b) => a.distanceKm - b.distanceKm)
  }
  return list.slice(0, limit)
}

// ค้นหาตามชื่อ (พิมพ์บางส่วนได้) ในรัศมี 60 กม. รอบจุดที่กำหนด  Overpass ก่อน ไม่สำเร็จค่อยสลับไป Nominatim
export async function searchHospitalsByName(text: string, origin: LatLng, limit = 10): Promise<Hospital[]> {
  const safe = text.trim().replace(/[\\"^$.|?*+()[\]{}]/g, '\\$&')
  if (!safe) return []
  const q = `[out:json][timeout:25];nwr["amenity"~"^(hospital|clinic)$"]["name"~"${safe}",i](around:60000,${origin.lat},${origin.lng});out center tags 60;`
  try {
    return toHospitals(await runOverpass(q), origin).slice(0, limit)
  } catch {
    return (await runNominatim(text.trim(), origin, 0.55)).slice(0, limit)
  }
}

// เส้นทางขับรถจาก from ไป to (null = หาเส้นทางไม่ได้)
export async function fetchRoute(from: LatLng, to: LatLng): Promise<RouteInfo | null> {
  const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json() as { routes?: { distance: number, duration: number, geometry: { coordinates: [number, number][] } }[] }
  const r = json.routes?.[0]
  if (!r) return null
  return {
    distanceKm: r.distance / 1000,
    minutes: Math.max(1, Math.round(r.duration / 60)),
    path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
  }
}

// ลิงก์เปิดนำทางใน Google Maps (ถ้ารู้ตำแหน่งผู้ใช้จะใส่เป็นจุดเริ่มต้นให้)
export function googleMapsDirectionsUrl(to: LatLng, from?: LatLng | null): string {
  const origin = from ? `&origin=${from.lat},${from.lng}` : ''
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${to.lat},${to.lng}&travelmode=driving`
}

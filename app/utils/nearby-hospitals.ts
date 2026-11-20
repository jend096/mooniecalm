// ===== ตัวช่วยหน้า "รพ.ใกล้ฉัน" (app/pages/hospital.vue) =====
// ข้อมูลโรงพยาบาล/คลินิก: OpenStreetMap ผ่าน Overpass API (ฟรี ไม่ต้องมีคีย์)
// เส้นทาง: OSRM สาธารณะ (ฟรี) เพื่อวาดเส้นบนแผนที่ + บอกระยะ/เวลา  ส่วนปุ่ม "เปิดใน Google Maps" ใช้ลิงก์ธรรมดา
// ถ้า Overpass ล่ม/ช้า (เซิร์ฟเวอร์สาธารณะล่มบ่อย) จะสลับไปใช้ Nominatim (ค้นหาของ OSM เหมือนกัน) แทนอัตโนมัติ
// หมายเหตุ: ข้อมูล OSM บางแห่งไม่มีเบอร์โทร/เวลาทำการ หน้าจะโชว์ว่า "ยังไม่มีเบอร์"

export interface Hospital {
  id: string
  name: string
  lat: number
  lng: number
  distanceKm: number
  phone: string | null // เบอร์แรกที่เจอ (เอาไว้กดโทร)
  hours: string | null // ข้อความเวลาเปิด-ปิดที่แปลเป็นไทยแล้ว (null = ไม่มีข้อมูล)
}

export interface LatLng { lat: number, lng: number }

export interface RouteInfo {
  distanceKm: number
  minutes: number
  path: [number, number][] // [lat, lng] ต่อกันเป็นเส้นทาง
}

// เซิร์ฟเวอร์สำรองหลายเจ้า: ถ้าเจ้าแรกล่ม/ปฏิเสธ จะลองเจ้าถัดไปอัตโนมัติ
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
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

// แปลง opening_hours ของ OSM เป็นข้อความสั้น ๆ (รูปแบบซับซ้อนให้โชว์ตามต้นฉบับ)
function readHours(raw: string | undefined): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (v === '24/7') return 'เปิด 24 ชม.'
  return `เปิด ${v}`
}

// คืนเบอร์แรกที่ใช้โทรได้ (ตัดช่องว่าง/ขีด เหลือ + และตัวเลข) ถ้าไม่มีคืน null
export function pickPhone(tags: Record<string, string>): string | null {
  const raw = tags.phone || tags['contact:phone'] || tags['phone:th'] || ''
  const first = raw.split(/[;,]/)[0]?.trim() ?? ''
  const cleaned = first.replace(/[^\d+]/g, '')
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
    result.push({
      id: `${el.type}/${el.id}`,
      name,
      lat,
      lng,
      distanceKm: distanceKm(origin, { lat, lng }),
      phone: pickPhone(tags),
      hours: readHours(tags.opening_hours)
    })
  }
  return result.sort((a, b) => a.distanceKm - b.distanceKm)
}

// ยิงคำขอพร้อมตัดเวลา: เซิร์ฟเวอร์ที่ค้าง/ตอบช้าเกินกำหนดจะถูกข้ามไปลองเจ้าถัดไปเลย ไม่ให้ผู้ใช้รอนาน
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ถามทุกเซิร์ฟเวอร์พร้อมกัน ใครตอบสำเร็จก่อนใช้เจ้านั้น (เซิร์ฟเวอร์สาธารณะล่มสลับกันบ่อย รอทีละเจ้าจะช้ามาก)
async function runOverpass(query: string): Promise<OverpassElement[]> {
  return Promise.any(OVERPASS_URLS.map(async (url) => {
    const res = await fetchWithTimeout(`${url}?data=${encodeURIComponent(query)}`, 10000)
    if (!res.ok) throw new Error(`overpass ${res.status}`)
    const json = await res.json() as { elements: OverpassElement[] }
    return json.elements
  }))
}

// ตัวหลักกับตัวสำรองวิ่งแข่งกัน: ตัวสำรองรอ 4 วินาทีก่อนค่อยเริ่ม (ถ้าตัวหลักตอบทันก็ไม่ต้องรบกวน Nominatim)
// ใช้ผลของตัวที่ "สำเร็จและมีข้อมูล" ก่อน  ถ้าทั้งคู่ล้มเหลวจะโยน error
function raceWithBackup<T>(primary: () => Promise<T[]>, backup: () => Promise<T[]>, hedgeMs = 4000): Promise<T[]> {
  const nonEmpty = async (run: () => Promise<T[]>) => {
    const r = await run()
    if (!r.length) throw new Error('empty')
    return r
  }
  return Promise.any([
    nonEmpty(primary),
    new Promise<void>(res => setTimeout(res, hedgeMs)).then(() => nonEmpty(backup))
  ])
}

// ---- ตัวสำรอง: Nominatim ----
interface NominatimItem {
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  name?: string
  category?: string
  class?: string
  type?: string
  extratags?: Record<string, string>
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const MEDICAL_TYPES = new Set(['hospital', 'clinic', 'doctors'])

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
  const elements: OverpassElement[] = items
    .filter(r => r.name && MEDICAL_TYPES.has(r.type ?? ''))
    .map(r => ({
      type: r.osm_type,
      id: r.osm_id,
      lat: Number(r.lat),
      lon: Number(r.lon),
      tags: { name: r.name!, ...(r.extratags ?? {}) }
    }))
  return toHospitals(elements, origin)
}

// โรงพยาบาล/คลินิกรอบจุดที่กำหนด (รัศมีเป็นเมตร) เรียงจากใกล้ไปไกล
export async function fetchNearbyHospitals(origin: LatLng, radiusM = 8000, limit = 15): Promise<Hospital[]> {
  const q = `[out:json][timeout:20];nwr["amenity"~"^(hospital|clinic)$"]["name"](around:${radiusM},${origin.lat},${origin.lng});out center tags 120;`
  const deg = radiusM / 111000
  let list: Hospital[]
  try {
    list = await raceWithBackup(
      async () => toHospitals(await runOverpass(q), origin),
      async () => {
        // ตัวสำรอง: ค้นคำว่า "โรงพยาบาล" กับ "คลินิก" ในกรอบรอบตัวผู้ใช้
        const [a, b] = await Promise.all([
          runNominatim('โรงพยาบาล', origin, deg).catch(() => [] as Hospital[]),
          runNominatim('คลินิก', origin, deg).catch(() => [] as Hospital[])
        ])
        return [...a, ...b].sort((x, y) => x.distanceKm - y.distanceKm)
      }
    )
  } catch {
    return [] // ทั้งสองแหล่งไม่ตอบ/ไม่พบ: หน้าจะขึ้นข้อความให้ลองใหม่
  }
  return list.filter(h => h.distanceKm * 1000 <= radiusM * 1.05).slice(0, limit)
}

// ค้นหาตามชื่อ (พิมพ์บางส่วนได้) ในรัศมี 60 กม. รอบจุดที่กำหนด
export async function searchHospitalsByName(text: string, origin: LatLng, limit = 10): Promise<Hospital[]> {
  const safe = text.trim().replace(/[\\"^$.|?*+()[\]{}]/g, '\\$&')
  if (!safe) return []
  const q = `[out:json][timeout:25];nwr["amenity"~"^(hospital|clinic)$"]["name"~"${safe}",i](around:60000,${origin.lat},${origin.lng});out center tags 60;`
  try {
    const list = await raceWithBackup(
      async () => toHospitals(await runOverpass(q), origin),
      () => runNominatim(text.trim(), origin, 0.55),
      2500
    )
    return list.slice(0, limit)
  } catch {
    return []
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

<script setup lang="ts">
// ===== หน้า "โรงพยาบาลใกล้ฉัน" (/hospital) ตามฟิกม่า =====
// ลำดับการทำงาน: เข้าหน้า -> เบราว์เซอร์ถามขอใช้ตำแหน่ง -> แผนที่ย้ายมาที่ผู้ใช้ + ดึงรายชื่อโรงพยาบาล/คลินิกใกล้เคียง
// ช่องค้นหา: แตะแล้วมีรายชื่อใกล้เคียงขึ้นให้เลือก (ไม่ต้องพิมพ์ก็ได้) หรือพิมพ์ชื่อเพื่อค้นหาก็ได้
// การ์ดแต่ละแห่ง: กด "โทร" โทรออก / กด "นำทาง" วาดเส้นทางบนแผนที่ + บอกระยะและเวลา + มีปุ่มเปิดใน Google Maps
// แผนที่: Leaflet + OpenStreetMap (ฟรี ไม่ต้องมีคีย์)  ข้อมูลสถานพยาบาล/เส้นทางอยู่ใน ~/utils/nearby-hospitals.ts
import 'leaflet/dist/leaflet.css'
import type { Hospital, LatLng, RouteInfo } from '~/utils/nearby-hospitals'
import {
  distanceKm,
  fetchNearbyHospitals,
  fetchRoute,
  formatKm,
  googleMapsDirectionsUrl,
  searchHospitalsByName
} from '~/utils/nearby-hospitals'

type LeafletModule = typeof import('leaflet')

// กรุงเทพฯ: ใช้เป็นจุดกลางแผนที่ตอนยังไม่รู้ตำแหน่งผู้ใช้ (หรือผู้ใช้ไม่อนุญาต)
const DEFAULT_CENTER: LatLng = { lat: 13.7563, lng: 100.5018 }

// idle = ยังไม่ได้ขอ / asking = รอผู้ใช้กดอนุญาต / granted = ได้ตำแหน่งแล้ว / denied = ไม่อนุญาต / error = หาตำแหน่งไม่เจอ
const locStatus = ref<'idle' | 'asking' | 'granted' | 'denied' | 'error'>('idle')
const userPos = ref<LatLng | null>(null)

const hospitals = ref<Hospital[]>([])
const isLoadingList = ref(false)
const listError = ref('')

const selectedId = ref<string | null>(null)
const route = ref<RouteInfo | null>(null)
const routeLoading = ref(false)
const routeError = ref('')

// ---------- ช่องค้นหา ----------
const query = ref('')
const searchOpen = ref(false)
// กำลังพิมพ์อยู่ (ช่องค้นหาโฟกัส) -> ซ่อนแถบเมนูล่างชั่วคราว กันมันลอยตามคีย์บอร์ดบน iPhone แล้วหน้าดูสั่น
const searchFocused = ref(false)
const remoteResults = ref<Hospital[]>([])
const isSearching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchToken = 0

const searchOrigin = computed(() => userPos.value ?? DEFAULT_CENTER)

// รายชื่อที่ขึ้นใต้ช่องค้นหา: ไม่พิมพ์ = โรงพยาบาลใกล้เคียง / พิมพ์ = ที่ชื่อตรงในลิสต์ + ผลค้นหาจากเซิร์ฟเวอร์ (ตัดซ้ำ)
const suggestions = computed<Hospital[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return hospitals.value.slice(0, 8)
  const local = hospitals.value.filter(h => h.name.toLowerCase().includes(q))
  const seen = new Set(local.map(h => h.id))
  const merged = [...local, ...remoteResults.value.filter(h => !seen.has(h.id))]
  return merged.slice(0, 8)
})

watch(query, (value) => {
  clearTimeout(searchTimer)
  const text = value.trim()
  if (text.length < 2) {
    remoteResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  const token = ++searchToken
  // รอผู้ใช้หยุดพิมพ์ครู่หนึ่งก่อนค่อยถามเซิร์ฟเวอร์ (ไม่ยิงทุกตัวอักษร)
  searchTimer = setTimeout(async () => {
    try {
      const found = await searchHospitalsByName(text, searchOrigin.value)
      if (token === searchToken) remoteResults.value = found
    } catch {
      if (token === searchToken) remoteResults.value = []
    } finally {
      if (token === searchToken) isSearching.value = false
    }
  }, 450)
})

function closeSearch() {
  searchOpen.value = false
}

function pickFirstSuggestion() {
  const first = suggestions.value[0]
  if (first) selectHospital(first, true)
}

// ---------- ตำแหน่งผู้ใช้ ----------
function requestLocation() {
  if (!navigator.geolocation) {
    locStatus.value = 'error'
    return
  }
  locStatus.value = 'asking'
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userPos.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      locStatus.value = 'granted'
      void loadNearby()
    },
    (err) => {
      locStatus.value = err.code === err.PERMISSION_DENIED ? 'denied' : 'error'
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  )
}

async function loadNearby() {
  if (!userPos.value) return
  isLoadingList.value = true
  listError.value = ''
  try {
    hospitals.value = await fetchNearbyHospitals(userPos.value)
    if (!hospitals.value.length) listError.value = 'ไม่พบโรงพยาบาลหรือคลินิกในรัศมี 8 กม. ลองพิมพ์ชื่อค้นหาดูนะ'
  } catch {
    listError.value = 'โหลดรายชื่อไม่สำเร็จ ลองใหม่อีกครั้งนะ'
  } finally {
    isLoadingList.value = false
  }
}

const locationMessage = computed(() => {
  if (locStatus.value === 'denied') return 'ยังไม่ได้อนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งของเว็บนี้ในเบราว์เซอร์ แล้วกดปุ่มด้านบนอีกครั้ง หรือค้นหาจากชื่อแทนก็ได้'
  if (locStatus.value === 'error') return 'หาตำแหน่งของคุณไม่เจอ ลองกดปุ่มด้านบนอีกครั้ง หรือค้นหาจากชื่อแทนก็ได้'
  return ''
})

// ---------- เลือกโรงพยาบาล / เส้นทาง ----------
const selected = computed(() => hospitals.value.find(h => h.id === selectedId.value) ?? null)

function selectHospital(h: Hospital, fromSearch = false) {
  // เลือกจากช่องค้นหาแล้วไม่อยู่ในลิสต์ใกล้เคียง = เติมไว้บนสุดของลิสต์ให้เห็นการ์ดของมัน
  if (!hospitals.value.some(x => x.id === h.id)) hospitals.value = [h, ...hospitals.value]
  if (selectedId.value !== h.id) {
    selectedId.value = h.id
    route.value = null
    routeError.value = ''
  }
  if (fromSearch) {
    query.value = ''
    remoteResults.value = []
    searchOpen.value = false
    ;(document.activeElement as HTMLElement | null)?.blur()
  }
  nextTick(() => document.getElementById(`hospital-${cssId(h.id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

function cssId(id: string) {
  return id.replace(/[^a-z0-9]/gi, '-')
}

async function startNavigation(h: Hospital) {
  selectHospital(h)
  routeError.value = ''
  if (!userPos.value) {
    routeError.value = 'ต้องรู้ตำแหน่งของคุณก่อนถึงจะวาดเส้นทางได้ กดปุ่ม "ใช้ตำแหน่งปัจจุบันของฉัน" ด้านบนนะ'
    return
  }
  routeLoading.value = true
  try {
    const r = await fetchRoute(userPos.value, { lat: h.lat, lng: h.lng })
    if (selectedId.value !== h.id) return // ระหว่างรอผู้ใช้เปลี่ยนไปเลือกที่อื่นแล้ว
    route.value = r
    if (!r) routeError.value = 'หาเส้นทางขับรถไม่ได้ ลองเปิดใน Google Maps แทนนะ'
  } catch {
    routeError.value = 'โหลดเส้นทางไม่สำเร็จ ลองเปิดใน Google Maps แทนนะ'
  } finally {
    routeLoading.value = false
  }
}

function distanceText(h: Hospital): string | null {
  if (!userPos.value) return null
  return `ห่างประมาณ ${formatKm(distanceKm(userPos.value, h))} กม.`
}

function subline(h: Hospital): string {
  return [distanceText(h), h.hours].filter(Boolean).join(' · ') || 'ยังไม่มีข้อมูลเวลาทำการ'
}

// ---------- แผนที่ (Leaflet) ----------
const mapEl = ref<HTMLElement | null>(null)
let L: LeafletModule | null = null
let map: import('leaflet').Map | null = null
let userMarker: import('leaflet').Marker | null = null
let hospitalLayer: import('leaflet').LayerGroup | null = null
let routeLayer: import('leaflet').Polyline | null = null

function drawHospitals() {
  if (!L || !map || !hospitalLayer) return
  const Lf = L
  hospitalLayer.clearLayers()
  hospitals.value.slice(0, 15).forEach((h, i) => {
    const active = h.id === selectedId.value
    const icon = Lf.divIcon({
      className: 'hosp-pin-wrap',
      html: `<span class="hosp-pin${active ? ' hosp-pin--active' : ''}">${i + 1}</span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    Lf.marker([h.lat, h.lng], { icon, zIndexOffset: active ? 500 : 0 })
      .on('click', () => selectHospital(h))
      .addTo(hospitalLayer!)
  })
}

function fitAll() {
  if (!L || !map) return
  const points: [number, number][] = []
  if (userPos.value) points.push([userPos.value.lat, userPos.value.lng])
  hospitals.value.slice(0, 5).forEach(h => points.push([h.lat, h.lng]))
  if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
  else if (points.length === 1) map.setView(points[0]!, 15)
}

watch(userPos, (pos) => {
  if (!L || !map || !pos) return
  const Lf = L
  const icon = Lf.icon({ iconUrl: '/nearby/pin.svg', iconSize: [90, 90], iconAnchor: [45, 45] })
  if (userMarker) userMarker.setLatLng([pos.lat, pos.lng])
  else userMarker = Lf.marker([pos.lat, pos.lng], { icon, interactive: false, zIndexOffset: 1000 }).addTo(map)
  map.setView([pos.lat, pos.lng], 15)
})

// ลิสต์โรงพยาบาลเปลี่ยน (โหลดเสร็จ / ค้นหาเพิ่ม) -> วาดหมุดใหม่ ถ้าเป็นการโหลดใกล้เคียงรอบแรกให้ซูมให้เห็นทั้งหมด
watch(hospitals, (list, old) => {
  drawHospitals()
  if (!selectedId.value && list.length && !old.length) fitAll()
})

watch(selectedId, () => {
  drawHospitals()
  const h = selected.value
  if (h && map && !route.value) map.flyTo([h.lat, h.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
})

watch(route, (r) => {
  if (!L || !map) return
  routeLayer?.remove()
  routeLayer = null
  if (!r) return
  routeLayer = L.polyline(r.path, { className: 'hosp-route', weight: 5, opacity: 0.9 }).addTo(map)
  map.fitBounds(routeLayer.getBounds(), { padding: [36, 36] })
})

onMounted(async () => {
  const mod = await import('leaflet')
  L = (mod.default ?? mod) as LeafletModule
  if (!mapEl.value) return
  map = L.map(mapEl.value, { zoomControl: false, attributionControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12)
  map.attributionControl.setPrefix(false)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  hospitalLayer = L.layerGroup().addTo(map)

  // ถามขอตำแหน่งทันทีที่เข้าหน้า (ถ้าเคยกดไม่อนุญาตไว้ จะไม่รบกวนซ้ำ ให้ผู้ใช้กดปุ่มเอง)
  let state: PermissionState | 'unknown' = 'unknown'
  try {
    state = (await navigator.permissions?.query({ name: 'geolocation' }))?.state ?? 'unknown'
  } catch { /* เบราว์เซอร์ไม่รองรับการเช็คสิทธิ์ล่วงหน้า ก็ข้ามไป */ }
  if (state === 'denied') locStatus.value = 'denied'
  else requestLocation()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  map?.remove()
  map = null
})

function goBack() {
  navigateTo('/home')
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col bg-gradient-to-b from-moon-bg to-moon-bg-end px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-16 text-moon-ink">
    <!-- ปุ่มย้อนกลับ -->
    <button
      type="button"
      class="absolute left-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-moon-gray shadow-[0_4px_6px_rgba(0,0,0,0.12)] transition active:scale-95"
      aria-label="ย้อนกลับ"
      @click="goBack"
    >
      <FaIcon name="chevron-left" class="h-[14px] w-2" />
    </button>

    <h1 class="text-center text-2xl font-semibold">โรงพยาบาลใกล้ฉัน</h1>
    <p class="mt-0 text-center text-[13px] leading-[18px] text-moon-muted">
      ค้นหา หรือใช้ตำแหน่งปัจจุบันเพื่อดูสถานพยาบาลที่อยู่ใกล้คุณ
    </p>

    <!-- ช่องค้นหา + รายชื่อที่ขึ้นให้เลือก -->
    <div class="relative z-20 mt-6">
      <label class="flex items-center gap-[10px] rounded-full bg-moon-card px-4 py-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <img src="/nearby/search.svg" alt="" width="20" height="20" class="h-5 w-5 shrink-0">
        <input
          v-model="query"
          type="search"
          inputmode="search"
          enterkeyhint="search"
          autocomplete="off"
          placeholder="ค้นหาโรงพยาบาล คลินิก"
          aria-label="ค้นหาโรงพยาบาล คลินิก"
          class="min-w-0 flex-1 bg-transparent text-base leading-[21px] text-moon-ink outline-none placeholder:text-moon-hint"
          @focus="searchOpen = true; searchFocused = true"
          @blur="closeSearch(); searchFocused = false"
          @keydown.enter.prevent="pickFirstSuggestion"
        >
      </label>

      <ul
        v-if="searchOpen"
        class="absolute inset-x-0 top-full mt-2 max-h-72 overflow-y-auto rounded-card border border-moon-pink-soft bg-moon-card py-2 shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
      >
        <li v-for="h in suggestions" :key="h.id">
          <!-- mousedown.prevent: กดเลือกได้โดยช่องค้นหายังไม่ทันปิดรายชื่อ -->
          <button
            type="button"
            class="flex w-full items-start gap-3 px-4 py-[10px] text-left transition active:bg-moon-pink-soft"
            @mousedown.prevent
            @click="selectHospital(h, true)"
          >
            <span class="mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moon-pink-soft text-moon-period">
              <FaIcon name="location-dot" class="h-3 w-3" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium leading-[21px]">{{ h.name }}</span>
              <span class="block truncate text-xs leading-[18px] text-moon-muted">{{ subline(h) }}</span>
            </span>
          </button>
        </li>
        <li v-if="!suggestions.length" class="px-4 py-3 text-center text-xs leading-[18px] text-moon-muted">
          <template v-if="isSearching || isLoadingList">กำลังค้นหา…</template>
          <template v-else-if="query.trim()">ไม่พบ "{{ query.trim() }}" ลองพิมพ์ชื่ออื่นดูนะ</template>
          <template v-else>กด "ใช้ตำแหน่งปัจจุบันของฉัน" เพื่อดูรายชื่อใกล้คุณ หรือพิมพ์ชื่อโรงพยาบาลได้เลย</template>
        </li>
      </ul>
    </div>

    <!-- ปุ่มขอใช้ตำแหน่ง -->
    <button
      type="button"
      class="mt-6 flex w-full items-center justify-center gap-[10px] rounded-full bg-moon-ink py-4 text-base font-semibold text-moon-on-ink transition active:scale-[0.98] disabled:opacity-70"
      :disabled="locStatus === 'asking'"
      @click="requestLocation"
    >
      <FaIcon name="location-dot" class="h-5 w-5" />
      {{ locStatus === 'asking' ? 'กำลังหาตำแหน่งของคุณ…' : 'ใช้ตำแหน่งปัจจุบันของฉัน' }}
    </button>
    <p v-if="locationMessage" class="mt-3 text-center text-xs leading-[18px] text-moon-muted">
      {{ locationMessage }}
    </p>

    <!-- แผนที่ (isolate: กันไม่ให้ชั้นของ Leaflet ลอยทับแถบเมนูล่างและรายชื่อค้นหา) -->
    <div class="relative isolate mt-6 h-[344px] shrink-0 overflow-hidden rounded-card bg-moon-chip">
      <div ref="mapEl" class="h-full w-full" role="application" aria-label="แผนที่โรงพยาบาลใกล้เคียง" />
    </div>

    <!-- หัวรายการ -->
    <div class="mt-6 flex items-center justify-between">
      <h2 class="text-lg">โรงพยาบาลใกล้คุณ</h2>
      <span v-if="userPos" class="rounded-full bg-moon-cream-soft px-3 py-[6px] text-xs leading-4">ใกล้ที่สุด</span>
    </div>

    <p v-if="isLoadingList" class="mt-4 text-center text-sm text-moon-muted">กำลังค้นหาโรงพยาบาลใกล้คุณ…</p>
    <div v-else-if="listError" class="mt-4 text-center">
      <p class="text-sm text-moon-muted">{{ listError }}</p>
      <button
        v-if="userPos"
        type="button"
        class="mt-3 rounded-full bg-moon-pink px-5 py-2 text-sm font-medium transition active:scale-95"
        @click="loadNearby"
      >
        ลองอีกครั้ง
      </button>
    </div>
    <p v-else-if="!hospitals.length" class="mt-4 text-center text-sm text-moon-muted">
      กดใช้ตำแหน่งปัจจุบัน แล้วรายชื่อโรงพยาบาลใกล้คุณจะขึ้นตรงนี้
    </p>

    <!-- รายการโรงพยาบาล -->
    <ul class="mt-3 flex flex-col gap-3">
      <li
        v-for="(h, i) in hospitals"
        :id="`hospital-${cssId(h.id)}`"
        :key="h.id"
        class="flex items-start gap-3 rounded-card border bg-moon-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition"
        :class="h.id === selectedId ? 'border-moon-period' : 'border-transparent'"
      >
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold leading-[14px] text-moon-on-ink"
          :class="h.id === selectedId ? 'bg-moon-period' : 'bg-moon-ink'"
          :aria-label="`ดูตำแหน่ง ${h.name} บนแผนที่`"
          @click="selectHospital(h)"
        >
          {{ i + 1 }}
        </button>

        <div class="min-w-0 flex-1">
          <p class="text-[15px] font-semibold leading-5">{{ h.name }}</p>
          <p class="mt-1 text-xs leading-[17px] text-moon-muted">{{ subline(h) }}</p>
          <div class="flex gap-2 pt-[10px]">
            <!-- ปุ่มโทร: ไม่โชว์ตัวเลขเบอร์ ถ้ามีเบอร์ในระบบกดแล้วเด้งไปหน้าโทรออกของมือถือทันที (tel:) -->
            <a
              v-if="h.phone"
              :href="`tel:${h.phone}`"
              class="flex items-center justify-center gap-[6px] rounded-full bg-moon-ink px-4 py-[6px] text-[13px] font-medium leading-[17px] text-moon-on-ink transition active:scale-95"
              :aria-label="`โทรหา ${h.name}`"
            >
              <FaIcon name="phone" class="h-3 w-3" />
              โทร
            </a>
            <!-- ไม่มีเบอร์: ปุ่มสีเทา กดไม่ได้ -->
            <span
              v-else
              class="flex items-center justify-center gap-[6px] rounded-full bg-moon-chip px-4 py-[6px] text-[13px] font-medium leading-[17px] text-moon-hint"
              aria-disabled="true"
            >
              <FaIcon name="phone" class="h-3 w-3" />
              โทร
            </span>
            <button
              type="button"
              class="flex items-center justify-center rounded-full bg-moon-pink px-4 py-[6px] text-[13px] leading-[17px] transition active:scale-95"
              @click="startNavigation(h)"
            >
              นำทาง
            </button>
          </div>

          <!-- รายละเอียดเส้นทาง: ขึ้นเฉพาะการ์ดที่กดนำทางอยู่ -->
          <div v-if="h.id === selectedId && (routeLoading || route || routeError)" class="mt-3 rounded-2xl bg-moon-pink-soft px-3 py-[10px]">
            <p v-if="routeLoading" class="text-xs leading-[18px] text-moon-muted">กำลังหาเส้นทาง…</p>
            <template v-else-if="route">
              <p class="text-sm font-medium leading-[21px]">
                ขับรถประมาณ {{ route.minutes }} นาที · {{ formatKm(route.distanceKm) }} กม.
              </p>
              <p class="text-xs leading-[18px] text-moon-muted">เส้นสีชมพูบนแผนที่คือเส้นทางจากตำแหน่งของคุณ</p>
            </template>
            <p v-else class="text-xs leading-[18px] text-moon-muted">{{ routeError }}</p>
            <a
              :href="googleMapsDirectionsUrl({ lat: h.lat, lng: h.lng }, userPos)"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-block rounded-full bg-moon-card px-3 py-1 text-xs font-medium leading-[18px] transition active:scale-95"
            >
              เปิดนำทางใน Google Maps
            </a>
          </div>
        </div>
      </li>
    </ul>

    <p class="mt-4 text-center text-xs leading-[18px] text-moon-muted">
      ข้อมูลจาก OpenStreetMap บางแห่งอาจยังไม่มีเบอร์โทรหรือเวลาทำการ ถ้ามีอาการรุนแรงให้โทร 1669 ได้ทันที
    </p>

    <BottomNav v-show="!searchFocused" active="hospital" />
  </div>
</template>

<!-- หมุด/เส้นทางของ Leaflet ถูกสร้างนอก Vue จึงใช้สไตล์ทั่วไป (ไม่ scoped) ตั้งชื่อคลาสขึ้นต้น hosp- กันชนกับที่อื่น -->
<style>
.hosp-pin-wrap {
  background: transparent;
  border: 0;
}
.hosp-pin {
  display: flex;
  height: 32px;
  width: 32px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-card);
  border-radius: 9999px;
  background: var(--color-ink);
  color: var(--color-on-ink);
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
  transition: transform 0.15s;
}
.hosp-pin--active {
  background: var(--color-period-day);
  transform: scale(1.2);
}
path.hosp-route {
  stroke: var(--color-period-day);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.leaflet-container {
  font-family: inherit;
}
</style>

<script setup lang="ts">
import type { PainPoint } from '~/utils/monthly-summary'

// ===== กราฟเส้นความปวดรายวัน (app/components/PainLineChart.vue) =====
// วาดเป็น SVG เอง ขนาดตามฟิกม่า 348x210: แกน Y = 0 / เบา(2) / กลาง(5) / มาก(8) แกน X = วันที่ของรอบ (วัน 1..N)
// ซ้อนได้หลายเส้น (เทียบหลายเดือน) วันที่ไม่มีบันทึกจะไม่ลากเส้นข้าม
const props = defineProps<{
  days: number // จำนวนวันในแกน X
  series: { key: string, label: string, color: string, points: PainPoint[] }[]
}>()

const W = 348
const H = 210
const GRID_LEFT = 40
const GRID_WIDTH = 300
const PLOT_LEFT = 56
const PLOT_WIDTH = 272
const BASE_Y = 170 // ระดับ 0
const PER_LEVEL = 16 // ความสูงต่อ 1 ระดับ (ระดับ 8 = y 42)

const GRID = [
  { y: BASE_Y, label: '0' },
  { y: BASE_Y - 2 * PER_LEVEL, label: 'เบา' },
  { y: BASE_Y - 5 * PER_LEVEL, label: 'กลาง' },
  { y: BASE_Y - 8 * PER_LEVEL, label: 'มาก' }
]

const count = computed(() => Math.max(props.days, 2))
const xOf = (day: number) => PLOT_LEFT + ((day - 1) * PLOT_WIDTH) / (count.value - 1)
const yOf = (level: number) => BASE_Y - level * PER_LEVEL

// แยกเป็นช่วงวันที่ต่อเนื่องกัน (ช่วงที่ยาว 2 วันขึ้นไปถึงลากเส้น)
const drawn = computed(() => props.series.map((s) => {
  const runs: PainPoint[][] = []
  let run: PainPoint[] = []
  for (const p of s.points) {
    if (run.length && p.day !== run.at(-1)!.day + 1) {
      runs.push(run)
      run = []
    }
    run.push(p)
  }
  if (run.length) runs.push(run)
  const paths = runs.filter(r => r.length > 1).map(r => r.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.day)} ${yOf(p.level)}`).join(' '))
  return { ...s, paths }
}))

const hasAnyPoint = computed(() => props.series.some(s => s.points.length))
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="block h-auto w-full"
    role="img"
    :aria-label="`กราฟเส้นความปวดรายวัน ${series.map(s => s.label).join(', ')}`"
  >
    <g v-for="g in GRID" :key="g.label">
      <line :x1="GRID_LEFT" :x2="GRID_LEFT + GRID_WIDTH" :y1="g.y" :y2="g.y" stroke="var(--color-chip)" stroke-width="1" />
      <text x="0" :y="g.y + 4" font-size="11" fill="var(--color-muted)">{{ g.label }}</text>
    </g>

    <text
      v-for="d in count"
      :key="d"
      :x="xOf(d)"
      :y="BASE_Y + 22"
      text-anchor="middle"
      font-size="11"
      fill="var(--color-muted)"
    >วัน {{ d }}</text>

    <g v-for="s in drawn" :key="s.key">
      <path
        v-for="(d, i) in s.paths"
        :key="i"
        :d="d"
        fill="none"
        :stroke="s.color"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-for="p in s.points"
        :key="p.day"
        :cx="xOf(p.day)"
        :cy="yOf(p.level)"
        r="4"
        :fill="s.color"
        stroke="var(--color-muted)"
        stroke-opacity="0.35"
        stroke-width="1"
      />
    </g>

    <text
      v-if="!hasAnyPoint"
      :x="GRID_LEFT + GRID_WIDTH / 2"
      :y="BASE_Y - 4 * PER_LEVEL"
      text-anchor="middle"
      font-size="12"
      fill="var(--color-muted)"
    >ยังไม่มีบันทึกความปวดในช่วงนี้</text>
  </svg>
</template>

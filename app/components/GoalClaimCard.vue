<template>
  <div class="mt-6 flex w-full flex-col gap-4 overflow-hidden rounded-[24px] border border-moon-pink-soft bg-white px-5 py-5">
    <!-- ขั้น 1: ครบ 28 วันแล้ว -->
    <template v-if="step === 'intro'">
      <div class="relative flex flex-col items-center gap-2 py-6 text-center">
        <svg
          v-for="(s, i) in introSparkles"
          :key="i"
          viewBox="0 0 24 24"
          class="twinkle pointer-events-none absolute"
          :style="{ left: s.left, top: s.top, width: `${s.size}px`, height: `${s.size}px`, color: s.color, animationDelay: `${s.delay}s` }"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
        </svg>
        <h2 class="intro-title font-['Anuphan'] text-[26px] font-semibold">ครบ {{ CYCLE_LENGTH_DAYS }} วันแล้ว!</h2>
        <p class="font-['Anuphan'] text-[14px] font-normal text-moon-muted">เธอทำมาถึงวันสุดท้ายของรอบนี้แล้ว เก่งมากเลย</p>
      </div>
      <button
        type="button"
        class="intro-pulse w-full rounded-full bg-moon-ink py-3 text-center font-['Anuphan'] text-sm font-medium text-white"
        @click="startResults"
      >
        มาดูผลของรอบนี้กัน
      </button>
    </template>

    <!-- ขั้น 2: ผลของแต่ละเป้าหมาย โผล่ทีละข้อพร้อมหลอดสถานะ (ข้อที่ผ่านอยู่บน ไม่ผ่านอยู่ล่างและจาง) -->
    <template v-else-if="step === 'result'">
      <h2 class="font-['Anuphan'] text-[18px] font-semibold text-moon-ink">ผลของรอบนี้</h2>

      <div class="flex flex-col gap-2">
        <div
          v-for="(item, i) in items"
          :key="item.rule.goalCode"
          class="result-card flex flex-col gap-2 rounded-xl px-4 py-3"
          :class="[
            i < shownCount ? 'result-card-in' : 'result-card-wait',
            item.passed ? 'bg-moon-pink-soft/60' : 'bg-moon-chip/70 opacity-50',
            item.passed && i < shownCount ? 'card-glow' : ''
          ]"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="font-['Anuphan'] text-[14px] font-medium text-moon-ink">{{ titleOf(item.rule.goalCode) }}</span>
              <span class="font-['Anuphan'] text-[12px] font-normal text-moon-muted">
                {{ item.days }}/{{ CYCLE_LENGTH_DAYS }} วัน (ต้องได้ {{ item.rule.minDays }} วันขึ้นไป)
              </span>
            </span>
            <!-- ป้ายผลลัพธ์: "ผ่าน" จะโผล่หลังหลอดเต็ม แล้วมีประกายพุ่งออกมารอบป้าย -->
            <span class="relative shrink-0">
              <span
                class="block rounded-full px-3 py-1 font-['Anuphan'] text-[12px] font-medium"
                :class="[
                  item.passed ? 'bg-moon-ink text-white' : 'bg-moon-card text-moon-muted',
                  item.passed ? (i < shownCount ? 'badge-pop' : 'opacity-0') : ''
                ]"
              >
                {{ item.passed ? 'ผ่าน' : 'ไม่ผ่าน' }}
              </span>
              <template v-if="item.passed && i < shownCount">
                <svg
                  v-for="(star, k) in burstStars"
                  :key="k"
                  viewBox="0 0 24 24"
                  class="burst-star pointer-events-none absolute left-1/2 top-1/2"
                  :style="{ '--dx': `${star.dx}px`, '--dy': `${star.dy}px`, width: `${star.size}px`, height: `${star.size}px`, color: star.color, animationDelay: `calc(var(--bar-dur) + var(--bar-delay) + ${star.delay}s)` }"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
                </svg>
              </template>
            </span>
          </div>

          <!-- หลอดสถานะ: ค่อยๆ เต็มตามจำนวนวันที่ทำได้ มีขีดบอกเกณฑ์ที่ต้องถึง -->
          <div class="relative h-2 w-full rounded-full bg-white">
            <div
              class="bar-fill h-full rounded-full"
              :class="item.passed ? 'bg-moon-period' : 'bg-moon-muted/40'"
              :style="{ width: i < shownCount ? `${Math.min(100, (item.days / CYCLE_LENGTH_DAYS) * 100)}%` : '0%' }"
            />
            <span
              aria-hidden="true"
              class="absolute -top-[2px] h-3 w-[2px] rounded-full bg-moon-ink/40"
              :style="{ left: `${(item.rule.minDays / CYCLE_LENGTH_DAYS) * 100}%` }"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ขั้น 3: อวตารที่ได้ หน้าตาเหมือนตอนได้อวตารครั้งแรก (ไม่บอกว่าเปลี่ยนอะไร) -->
    <template v-else-if="step === 'reveal'">
      <div class="relative flex flex-col items-center gap-3 py-2 text-center">
        <svg
          v-for="(s, i) in revealSparkles"
          :key="i"
          viewBox="0 0 24 24"
          class="sparkle pointer-events-none absolute"
          :style="{ left: `calc(50% + ${s.x}px)`, top: `${s.y}px`, width: `${s.size}px`, height: `${s.size}px`, color: s.color, animationDelay: `${s.delay}s` }"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" />
        </svg>

        <h2 class="reveal-in font-['Anuphan'] text-[20px] font-semibold text-moon-ink">{{ revealTitle }}</h2>

        <div class="reveal-pop relative mt-1 aspect-square w-[220px]">
          <div class="avatar-float absolute inset-0">
            <div class="absolute inset-[-12%] rounded-full bg-moon-pink/60 blur-[36px]" />
            <div class="absolute inset-0 overflow-hidden rounded-[22px] shadow-[0_10px_28px_rgba(254,119,119,0.3)]">
              <AvatarScene :layers="layersOf(upgradedAvatar)" />
            </div>
          </div>
        </div>

        <p class="reveal-in mt-2 font-['Anuphan'] text-[13px] font-normal text-moon-muted" style="animation-delay: 0.3s">{{ revealText }}</p>
      </div>

      <button
        type="button"
        class="reveal-in w-full rounded-full bg-moon-ink py-3 text-center font-['Anuphan'] text-sm font-medium text-white transition active:scale-95"
        style="animation-delay: 0.6s"
        @click="step = 'pick'"
      >
        เลือกเป้าหมายรอบใหม่
      </button>
    </template>

    <!-- ขั้น 4: เลือกเป้าหมายรอบถัดไป (แนะนำข้อที่รอบที่แล้วยังไม่ผ่าน) -->
    <template v-else-if="step === 'pick'">
      <div>
        <h2 class="font-['Anuphan'] text-[18px] font-semibold text-moon-ink">เลือกเป้าหมายรอบใหม่</h2>
        <p class="mt-1 font-['Anuphan'] text-[13px] font-normal text-moon-muted">
          รอบใหม่ {{ CYCLE_LENGTH_DAYS }} วัน เลือกได้หลายข้อ อย่างน้อย 1 ข้อ จะเลือกข้อเดิมต่อหรือเปลี่ยนก็ได้
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <button
          v-for="goal in goalTypes"
          :key="goal.id"
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-left transition active:scale-95"
          :class="selectedIds.includes(goal.id) ? 'border-moon-period bg-moon-pink-soft' : 'border-moon-pink-soft bg-white'"
          @click="toggleGoal(goal.id)"
        >
          <span class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span class="font-['Anuphan'] text-[14px] font-medium text-moon-ink">{{ goal.title }}</span>
            <RecommendBadge v-if="recommendedCodes.includes(goal.goal_code)" />
          </span>
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
            :class="selectedIds.includes(goal.id) ? 'border-moon-period bg-moon-period' : 'border-moon-muted/40'"
          >
            <FaIcon name="check" v-if="selectedIds.includes(goal.id)" class="text-white h-3 w-3" />
          </span>
        </button>
      </div>

      <p v-if="errorText" class="font-['Anuphan'] text-[13px] font-normal text-moon-coral">{{ errorText }}</p>

      <button
        type="button"
        :disabled="saving || !selectedIds.length"
        class="flex w-full items-center justify-center gap-2 rounded-full bg-moon-ink py-3 text-center font-['Anuphan'] text-sm font-medium text-white transition disabled:opacity-40"
        :class="saving ? '!opacity-100' : ''"
        @click="claim"
      >
        <BrandLogoMark v-if="saving" :size="28" stage="bob" />
        {{ saving ? 'กำลังบันทึก...' : 'รับผลและเริ่มรอบใหม่' }}
      </button>
      <button
        type="button"
        :disabled="saving"
        class="inline-flex items-center gap-1 self-center font-['Anuphan'] text-[12px] font-medium text-moon-muted"
        @click="step = 'reveal'"
      >
        <FaIcon name="chevron-left" class="h-3 w-3" /> ย้อนกลับ
      </button>
    </template>

    <!-- ขั้น 5: รับผลเรียบร้อย -->
    <template v-else>
      <div class="flex flex-col items-center gap-3 text-center">
        <h2 class="font-['Anuphan'] text-[18px] font-semibold text-moon-ink">เริ่มรอบใหม่แล้ว</h2>
        <AvatarScene :layers="layersOf(finalAvatar)" class="w-40" />
        <p class="font-['Anuphan'] text-[13px] font-normal text-moon-muted">
          บันทึกผลรอบที่แล้วเรียบร้อย วันนี้เป็นวันแรกของรอบใหม่
        </p>
      </div>
      <button
        type="button"
        class="w-full rounded-full bg-moon-ink py-3 text-center font-['Anuphan'] text-sm font-medium text-white transition active:scale-95"
        @click="emit('claimed')"
      >
        เริ่มเช็คอินรอบใหม่
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CYCLE_LENGTH_DAYS, applyUpgrades, evaluateClaim, nextCycleDates } from '~/utils/goal-claim'

const props = defineProps<{
  profileId: number
  goalCycleId: number // รอบที่ครบแล้วและรอรับผล
  activeGoalCodes: string[] // เป้าหมายที่เปิดอยู่ในรอบนี้
  dayCounts: Record<string, number> // วันที่ทำได้ แยกตาม goal_code
}>()

const emit = defineEmits<{ (e: 'claimed'): void }>()

interface GoalTypeRow { id: number, goal_code: string, title: string }

// intro = กล่อง "ครบ 28 วันแล้ว" -> result = ผลทีละข้อ -> reveal = อวตารที่ได้ -> pick = เลือกเป้าหมายใหม่ -> done
const step = ref<'intro' | 'result' | 'reveal' | 'pick' | 'done'>('intro')
const saving = ref(false)
const errorText = ref('')

const goalTypes = ref<GoalTypeRow[]>([])
const currentAvatar = ref<Record<string, string | null>>({ eyes: null, ears: null, body_color: null, fx_overlay: null })
const existingGoalTypeIds = ref<number[]>([]) // เป้าหมายที่เคยมีแถวใน user_goals แล้ว (เปิดหรือปิดก็ตาม)
const selectedIds = ref<number[]>([])
const finalAvatar = ref<Record<string, string | null>>({})

// ขั้นตอนที่ทำสำเร็จไปแล้ว (กดลองใหม่แล้วจะไม่ทำซ้ำ)
const avatarSaved = ref(false)
const goalsSaved = ref(false)
const newCycleSaved = ref(false)

const items = computed(() => evaluateClaim(props.activeGoalCodes, props.dayCounts, currentAvatar.value))
const changes = computed(() => items.value.filter(i => i.willChange))
const upgradedAvatar = computed(() => applyUpgrades(currentAvatar.value, items.value))
// เป้าหมายที่รอบนี้ยังไม่ผ่าน = ข้อที่แนะนำให้ทำต่อในรอบใหม่
const recommendedCodes = computed(() => items.value.filter(i => !i.passed).map(i => i.rule.goalCode))

// ข้อความหน้าอวตารที่ได้ (ไม่บอกว่าชิ้นไหนเปลี่ยน)
const revealTitle = computed(() => {
  if (changes.value.length) return 'ยินดีด้วย!'
  return items.value.some(i => i.passed) ? 'เก่งมากเลย' : 'ไม่เป็นไรนะ'
})
const revealText = computed(() => {
  if (changes.value.length) return 'อวตารของเธอเติบโตขึ้นอีกขั้นแล้ว'
  return items.value.some(i => i.passed)
    ? 'รักษาไว้ได้ดีมาก ไปต่อรอบใหม่ด้วยกันนะ'
    : 'แต่ละช่วงชีวิตไม่เหมือนกัน เริ่มรอบใหม่ไปด้วยกันได้เลย'
})

function titleOf(goalCode: string) {
  return goalTypes.value.find(g => g.goal_code === goalCode)?.title ?? goalCode
}

// ลำดับชั้นเดียวกับหน้าแรก: ตัวแรกอยู่ล่างสุด
const LAYER_ORDER = ['fx_overlay', 'ears', 'eyes', 'body_color']
function layersOf(avatar: Record<string, string | null>) {
  return LAYER_ORDER.map(slot => ({ slot, code: avatar[slot] ?? null }))
}

function toggleGoal(id: number) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(g => g !== id)
    : [...selectedIds.value, id]
}

// ===== จังหวะอนิเมชันหน้าผลรอบ (ปรับความเร็วได้ที่นี่ หน่วยมิลลิวินาที) =====
const FIRST_CARD_DELAY_MS = 800 // รอก่อนข้อแรกโผล่
const CARD_GAP_MS = 1100 // ห่างกันระหว่างแต่ละข้อ
const AFTER_LAST_MS = 3000 // รอหลังข้อสุดท้ายโผล่ แล้วไปหน้าอวตารเอง

const shownCount = ref(0) // โชว์ไปแล้วกี่ข้อ
const timers: ReturnType<typeof setTimeout>[] = []

function startResults() {
  step.value = 'result'
  shownCount.value = 0
  const total = items.value.length
  for (let i = 0; i < total; i++) {
    timers.push(setTimeout(() => { shownCount.value = i + 1 }, FIRST_CARD_DELAY_MS + i * CARD_GAP_MS))
  }
  const endAt = total ? FIRST_CARD_DELAY_MS + (total - 1) * CARD_GAP_MS + AFTER_LAST_MS : 600
  timers.push(setTimeout(() => { step.value = 'reveal' }, endAt))
}

onBeforeUnmount(() => timers.forEach(t => clearTimeout(t)))

// ประกายตกแต่ง (ตำแหน่งเป็น % / px จากกึ่งกลาง, size = px, delay = วินาที)
const introSparkles = [
  { left: '12%', top: '14%', size: 16, delay: 0, color: 'var(--color-period-predicted)' },
  { left: '84%', top: '10%', size: 22, delay: 0.4, color: 'var(--color-coral)' },
  { left: '6%', top: '62%', size: 12, delay: 0.9, color: 'var(--color-lavender)' },
  { left: '90%', top: '66%', size: 14, delay: 1.3, color: 'var(--color-period-predicted)' },
  { left: '50%', top: '4%', size: 10, delay: 0.7, color: 'var(--color-period-day)' }
]
// ประกายที่พุ่งออกจากป้าย "ผ่าน": dx/dy = ระยะที่พุ่งไป (px), size = ขนาด (px), delay = หน่วงเพิ่ม (วินาที)
const burstStars = [
  { dx: -46, dy: -30, size: 14, delay: 0, color: 'var(--color-period-predicted)' },
  { dx: -30, dy: 32, size: 10, delay: 0.1, color: 'var(--color-lavender)' },
  { dx: 0, dy: -38, size: 16, delay: 0.05, color: 'var(--color-coral)' },
  { dx: 28, dy: -26, size: 10, delay: 0.15, color: 'var(--color-period-day)' },
  { dx: 30, dy: 28, size: 13, delay: 0.08, color: 'var(--color-period-predicted)' },
  { dx: -58, dy: 4, size: 9, delay: 0.2, color: 'var(--color-coral)' },
  { dx: 6, dy: 36, size: 9, delay: 0.18, color: 'var(--color-lavender)' }
]
const revealSparkles = [
  { x: -110, y: 70, size: 18, delay: 0, color: 'var(--color-coral)' },
  { x: 108, y: 60, size: 14, delay: 0.5, color: 'var(--color-lavender)' },
  { x: -96, y: 190, size: 12, delay: 0.9, color: 'var(--color-period-predicted)' },
  { x: 100, y: 180, size: 20, delay: 1.3, color: 'var(--color-coral)' },
  { x: 0, y: 40, size: 10, delay: 0.3, color: 'var(--color-period-day)' }
]

onMounted(async () => {
  const authed = await getAuthedSupabaseClient()
  const [typesRes, avatarRes, goalsRes] = await Promise.all([
    authed.from('goal_types').select('id, goal_code, title').order('display_order'),
    authed.from('user_avatar_state').select('feature_slot, current_asset_code').eq('user_id', props.profileId),
    authed.from('user_goals').select('goal_type_id, is_active').eq('user_id', props.profileId)
  ])

  goalTypes.value = (typesRes.data ?? []) as GoalTypeRow[]
  for (const row of avatarRes.data ?? []) {
    currentAvatar.value[row.feature_slot as string] = row.current_asset_code as string | null
  }
  existingGoalTypeIds.value = (goalsRes.data ?? []).map(g => g.goal_type_id as number)

  // เริ่มต้นเลือกข้อที่แนะนำ (ที่รอบนี้ยังไม่ผ่าน) ไว้ให้ก่อน ถ้าผ่านครบทุกข้อ ก็เลือกเป้าหมายเดิมต่อ
  const recommendedIds = goalTypes.value.filter(g => recommendedCodes.value.includes(g.goal_code)).map(g => g.id)
  selectedIds.value = recommendedIds.length
    ? recommendedIds
    : (goalsRes.data ?? []).filter(g => g.is_active).map(g => g.goal_type_id as number)
})

// กด "รับผลและเริ่มรอบใหม่"
// ลำดับสำคัญ: อวตาร -> เป้าหมาย -> สร้างรอบใหม่ -> ปิดรอบเก่า
// ถ้าพังกลางทาง กดซ้ำได้ ไม่ทำซ้ำสิ่งที่สำเร็จแล้ว และรอบใหม่จะถูกสร้างก่อนปิดรอบเก่า
// เพื่อไม่ให้ผู้ใช้ตกอยู่ในสถานะ "ไม่มีรอบเป้าหมายเลย"
async function claim() {
  if (saving.value || !selectedIds.value.length) return
  saving.value = true
  errorText.value = ''

  const authed = await getAuthedSupabaseClient()
  const nowIso = new Date().toISOString()

  // 1) เปลี่ยนชิ้นส่วนอวตารที่ผ่านเกณฑ์
  if (!avatarSaved.value && changes.value.length) {
    const rows = changes.value.map(c => ({
      user_id: props.profileId,
      feature_slot: c.rule.slot,
      current_asset_code: c.nextCode,
      updated_at: nowIso
    }))
    const { error } = await authed.from('user_avatar_state').upsert(rows, { onConflict: 'user_id,feature_slot' })
    if (error) return fail()
  }
  avatarSaved.value = true

  // 2) เป้าหมายรอบใหม่: เปิดข้อที่เลือก, ปิดข้อที่เคยมีแต่ไม่ได้เลือก (ไม่สร้างแถวปิดให้ข้อที่ไม่เคยมี)
  if (!goalsSaved.value) {
    const rows = goalTypes.value
      .filter(g => selectedIds.value.includes(g.id) || existingGoalTypeIds.value.includes(g.id))
      .map(g => ({ user_id: props.profileId, goal_type_id: g.id, is_active: selectedIds.value.includes(g.id) }))
    const { error } = await authed.from('user_goals').upsert(rows, { onConflict: 'user_id,goal_type_id' })
    if (error) return fail()
  }
  goalsSaved.value = true

  // 3) สร้างรอบใหม่ เริ่มวันที่กดรับผลจริง (ถ้ามีแล้วจากการกดครั้งก่อน ถือว่าผ่าน)
  if (!newCycleSaved.value) {
    const dates = nextCycleDates(getLocalDateString())
    const { error } = await authed.from('goal_cycles').insert({
      user_id: props.profileId,
      cycle_start_date: dates.start,
      cycle_end_date: dates.end
    })
    if (error && error.code !== '23505') return fail()
  }
  newCycleSaved.value = true

  // 4) ปิดรอบเก่า (ถ้าขั้นนี้พลาด รอบใหม่ก็ใช้งานได้แล้ว จึงไม่ถือว่าล้มเหลว)
  await authed
    .from('goal_cycles')
    .update({ claimed_at: nowIso, avatar_upgraded: changes.value.length > 0 })
    .eq('id', props.goalCycleId)
    .is('claimed_at', null)

  finalAvatar.value = upgradedAvatar.value
  saving.value = false
  step.value = 'done'
}

function fail() {
  errorText.value = 'บันทึกไม่สำเร็จ ลองกดอีกครั้งได้เลย ข้อมูลที่บันทึกไปแล้วจะไม่ซ้ำ'
  saving.value = false
}
</script>

<style scoped>
/* ประกายหน้า "ครบ 28 วัน": ค่อยๆ โผล่ ขยาย หมุนเล็กน้อย แล้วหายไป วนซ้ำ */
.twinkle {
  opacity: 0;
  animation: twinkle 2.4s ease-in-out infinite;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.3) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1) rotate(35deg);
  }
}

/* หัวข้อ "ครบ 28 วันแล้ว!" เด้งเข้ามาแล้วขยับเบาๆ */
/* สีหัวข้อ: ไล่เฉดสีของประจำเดือนของแอพ (--color-period-day -> --color-period-predicted ใน tokens.css) เหมือนเลข 28 หน้าแรก */
.intro-title {
  background: linear-gradient(100deg, var(--color-period-day) 0%, var(--color-period-predicted) 45%, var(--color-period-day) 90%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation:
    intro-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    intro-wiggle 2.6s ease-in-out 0.8s infinite,
    intro-shimmer 2.6s linear infinite;
}

/* ปุ่ม "มาดูผลของรอบนี้กัน": ซูมเข้า-ออกเบาๆ เป็นจังหวะเหมือนปุ่มเช็คอินหน้าแรก (ตอนกดจริงยุบด้วย scale แยกใน assets/css/press.css)
   ปรับแรงเด้งที่ scale(1.035) และความเร็วที่ 1.9s */
.intro-pulse {
  animation: intro-pulse 1.9s ease-in-out infinite;
}

@keyframes intro-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.035);
  }
}

@keyframes intro-shimmer {
  to {
    background-position: -200% 0;
  }
}

@keyframes intro-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes intro-wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-2deg);
  }
  75% {
    transform: rotate(2deg);
  }
}

/* การ์ดผลแต่ละข้อ: รอ (จองที่ไว้ ไม่ให้หน้าเลื่อน) -> ค่อยๆ เลื่อนขึ้นมา */
.result-card {
  /* จังหวะหลอด: ใช้ร่วมกับป้าย "ผ่าน" + ประกาย ให้โผล่หลังหลอดเต็มพอดี (แก้ที่เดียวตรงนี้) */
  --bar-dur: 0.9s;
  --bar-delay: 0.25s;
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.result-card-wait {
  opacity: 0 !important;
  transform: translateY(14px);
}

.result-card-in {
  transform: translateY(0);
}

/* หลอดสถานะค่อยๆ เต็ม */
.bar-fill {
  transition: width var(--bar-dur) cubic-bezier(0.22, 1, 0.36, 1) var(--bar-delay);
}

/* ป้าย "ผ่าน" เด้งนิดหนึ่งหลังหลอดเต็ม */
/* ป้ายโผล่หลังหลอดเต็ม (หน่วง = เวลาหลอด) */
.badge-pop {
  animation: badge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--bar-dur) + var(--bar-delay)) both;
}

@keyframes badge-pop {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ประกายพุ่งออกจากป้าย "ผ่าน": โผล่ ขยาย หมุน ลอยออกไปทางที่กำหนด (--dx, --dy) แล้วจางหาย */
.burst-star {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
  animation: burst-star 1.1s ease-out both;
}

@keyframes burst-star {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(0deg);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.1) rotate(120deg);
  }
}

/* การ์ดที่ผ่านเรืองแสงชมพูวาบหนึ่งทีตอนป้ายโผล่ */
.card-glow {
  animation: card-glow 1.2s ease-out calc(var(--bar-dur) + var(--bar-delay)) both;
}

@keyframes card-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 110, 138, 0);
  }
  30% {
    box-shadow: 0 0 0 4px rgba(255, 110, 138, 0.25), 0 0 18px rgba(255, 168, 230, 0.55);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 110, 138, 0);
  }
}

/* หน้าอวตารที่ได้: ค่อยๆ เด้งขึ้นมา แล้วลอยขึ้นลงเบาๆ เหมือนหน้าได้อวตารครั้งแรก */
.reveal-pop {
  animation: reveal-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes reveal-pop {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.6);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.reveal-in {
  animation: reveal-in 0.7s ease both;
}

@keyframes reveal-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-float {
  animation: avatar-bob 4.2s ease-in-out infinite;
}

@keyframes avatar-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-1.2deg);
  }
  50% {
    transform: translateY(-7px) rotate(1.2deg);
  }
}

/* ประกายลอยขึ้นรอบอวตาร */
.sparkle {
  opacity: 0;
  transform: translate(-50%, 0) scale(0);
  animation: sparkle-float 2.2s ease-out infinite;
}

@keyframes sparkle-float {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) scale(0) rotate(0deg);
  }
  35% {
    opacity: 1;
    transform: translate(-50%, -10px) scale(1) rotate(30deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50px) scale(0.4) rotate(80deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .twinkle,
  .intro-title,
  .intro-pulse,
  .sparkle,
  .avatar-float,
  .reveal-pop,
  .reveal-in,
  .badge-pop,
  .burst-star,
  .card-glow {
    animation: none;
  }

  .twinkle,
  .sparkle {
    opacity: 0.7;
    transform: none;
  }

  .result-card,
  .bar-fill {
    transition: none;
  }
}
</style>

<template>
  <div class="mt-6 flex w-full flex-col gap-4 rounded-[24px] border border-moon-pink-soft bg-white px-5 py-5">
    <!-- ขั้น 1: ดูผลของรอบนี้ -->
    <template v-if="step === 'result'">
      <div>
        <h2 class="font-['Anuphan'] text-[18px] font-semibold text-moon-ink">ครบ {{ CYCLE_LENGTH_DAYS }} วันแล้ว!</h2>
        <p class="mt-1 font-['Anuphan'] text-[13px] font-normal text-moon-muted">มาดูผลของรอบนี้กัน</p>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="item in items"
          :key="item.rule.goalCode"
          class="flex items-center justify-between gap-3 rounded-xl bg-moon-pink-soft/50 px-4 py-3"
        >
          <span class="flex flex-col gap-0.5">
            <span class="font-['Anuphan'] text-[14px] font-medium text-moon-ink">{{ titleOf(item.rule.goalCode) }}</span>
            <span class="font-['Anuphan'] text-[12px] font-normal text-moon-muted">
              {{ item.days }}/{{ CYCLE_LENGTH_DAYS }} วัน (ต้องได้ {{ item.rule.minDays }} วันขึ้นไป)
            </span>
          </span>
          <span
            class="shrink-0 rounded-full px-3 py-1 font-['Anuphan'] text-[12px] font-medium"
            :class="item.passed ? 'bg-moon-ink text-white' : 'bg-moon-chip text-moon-muted'"
          >
            {{ item.passed ? 'ผ่าน' : 'ยังไม่ถึง' }}
          </span>
        </div>
      </div>

      <!-- มีชิ้นส่วนอวตารที่จะเปลี่ยน: โชว์ก่อน -> หลัง -->
      <div v-if="changes.length" class="flex flex-col gap-3">
        <p class="font-['Anuphan'] text-[13px] font-medium text-moon-ink">
          อวตารของเธอจะเปลี่ยน: {{ changes.map(c => `${c.rule.slotLabel}เป็น${c.rule.upgradedLabel}`).join(' · ') }}
        </p>
        <div class="flex items-center justify-center gap-2">
          <div class="flex flex-col items-center gap-1">
            <div class="relative h-28 w-28">
              <img v-for="layer in layersOf(currentAvatar)" :key="layer.slot" :src="`/avatar/${layer.code}.png`" alt="" class="absolute inset-0 h-full w-full object-contain">
            </div>
            <span class="font-['Anuphan'] text-[11px] font-normal text-moon-muted">ตอนนี้</span>
          </div>
          <FaIcon name="chevron-right" class="h-4 w-4 text-moon-muted/60" />
          <div class="flex flex-col items-center gap-1">
            <div class="relative h-28 w-28">
              <img v-for="layer in layersOf(upgradedAvatar)" :key="layer.slot" :src="`/avatar/${layer.code}.png`" alt="" class="absolute inset-0 h-full w-full object-contain">
            </div>
            <span class="font-['Anuphan'] text-[11px] font-normal text-moon-muted">หลังรับผล</span>
          </div>
        </div>
      </div>
      <p v-else-if="items.some(i => i.passed)" class="font-['Anuphan'] text-[13px] font-normal text-moon-muted">
        ข้อที่ผ่านอวตารสดใสอยู่แล้ว รักษาไว้ได้ดีมากเลย
      </p>
      <p v-else class="font-['Anuphan'] text-[13px] font-normal text-moon-muted">
        รอบนี้ยังไม่ถึงเกณฑ์ ไม่เป็นไรนะ แต่ละช่วงชีวิตไม่เหมือนกัน เริ่มรอบใหม่ไปด้วยกันได้เลย
      </p>

      <button
        type="button"
        class="w-full rounded-full bg-moon-ink py-3 text-center font-['Anuphan'] text-sm font-medium text-white transition active:scale-95"
        @click="step = 'pick'"
      >
        ถัดไป: เลือกเป้าหมายรอบใหม่
      </button>
    </template>

    <!-- ขั้น 2: เลือกเป้าหมายรอบถัดไป -->
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
          class="flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition active:scale-95"
          :class="selectedIds.includes(goal.id) ? 'border-moon-period bg-moon-pink-soft' : 'border-moon-pink-soft bg-white'"
          @click="toggleGoal(goal.id)"
        >
          <span class="font-['Anuphan'] text-[14px] font-medium text-moon-ink">{{ goal.title }}</span>
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
        class="w-full rounded-full bg-moon-ink py-3 text-center font-['Anuphan'] text-sm font-medium text-white transition active:scale-95 disabled:opacity-40"
        @click="claim"
      >
        {{ saving ? 'กำลังบันทึก...' : 'รับผลและเริ่มรอบใหม่' }}
      </button>
      <button
        type="button"
        :disabled="saving"
        class="inline-flex items-center gap-1 self-center font-['Anuphan'] text-[12px] font-medium text-moon-muted"
        @click="step = 'result'"
      >
        <FaIcon name="chevron-left" class="h-3 w-3" /> ย้อนกลับ
      </button>
    </template>

    <!-- ขั้น 3: รับผลเรียบร้อย -->
    <template v-else>
      <div class="flex flex-col items-center gap-3 text-center">
        <h2 class="font-['Anuphan'] text-[18px] font-semibold text-moon-ink">เริ่มรอบใหม่แล้ว</h2>
        <div class="relative h-40 w-40">
          <img v-for="layer in layersOf(finalAvatar)" :key="layer.slot" :src="`/avatar/${layer.code}.png`" alt="" class="absolute inset-0 h-full w-full object-contain">
        </div>
        <p class="font-['Anuphan'] text-[13px] font-normal text-moon-muted">
          {{ changes.length ? 'อวตารอัปเดตเรียบร้อย' : 'บันทึกผลรอบที่แล้วเรียบร้อย' }} วันนี้เป็นวันแรกของรอบใหม่
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

const step = ref<'result' | 'pick' | 'done'>('result')
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

function titleOf(goalCode: string) {
  return goalTypes.value.find(g => g.goal_code === goalCode)?.title ?? goalCode
}

// ลำดับชั้นเดียวกับหน้าแรก: ตัวแรกอยู่ล่างสุด
const LAYER_ORDER = ['fx_overlay', 'ears', 'eyes', 'body_color']
function layersOf(avatar: Record<string, string | null>) {
  return LAYER_ORDER.map(slot => ({ slot, code: avatar[slot] })).filter(l => !!l.code)
}

function toggleGoal(id: number) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(g => g !== id)
    : [...selectedIds.value, id]
}

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
  // เริ่มต้นเลือกเป้าหมายเดิมไว้ให้ก่อน
  selectedIds.value = (goalsRes.data ?? []).filter(g => g.is_active).map(g => g.goal_type_id as number)
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
      current_asset_code: c.rule.upgradedCode,
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

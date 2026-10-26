<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
    loading?: boolean // true = กำลังทำงาน: โชว์กระต่ายโผล่ขึ้น-หุบลงหน้าข้อความ และกดซ้ำไม่ได้
    type?: 'button' | 'submit'
  }>(),
  {
    label: 'ถัดไป',
    disabled: false,
    loading: false,
    type: 'button'
  }
)

const emit = defineEmits<{ click: [] }>()

// กดปุ่มแล้วต้องรอเปลี่ยนหน้า (เช่น หน้าถัดไปกำลังโหลด) -> ให้กระต่ายหมุนอยู่ที่ปุ่มนี้จนกว่าจะเปลี่ยนหน้าเสร็จ
// (ใช้ในช่วงหน้าคำถามของ onboarding ที่ไม่ขึ้นหน้ารอโหลดเต็มจอ ดู app.vue) ถ้าเปลี่ยนหน้าทันที ปุ่มก็หายไปพร้อมหน้าเก่า จึงไม่เห็นกะพริบ
const nuxtApp = useNuxtApp()
let lastClickAt = 0
const navPending = ref(false)
// ใช้สัญญาณเริ่ม/จบการเปลี่ยนหน้าของ router (มาทุกครั้ง) ไม่ใช้ page:start ซึ่งมาเฉพาะหน้าที่ต้องรอโหลด จะทำให้บางครั้งกระต่ายไม่ขึ้น
const stopStart = nuxtApp.hook('page:loading:start', () => {
  if (Date.now() - lastClickAt < 2000) navPending.value = true
})
const stopFinish = nuxtApp.hook('page:loading:end', () => { navPending.value = false })
onBeforeUnmount(() => {
  stopStart()
  stopFinish()
})

const isLoading = computed(() => props.loading || navPending.value)

function onClick() {
  lastClickAt = Date.now()
  emit('click')
}
</script>

<template>
  <!-- ปุ่มหลัก: รูปทรง/สีมาจาก .btn-primary (assets/css/buttons.css) ค่าขนาดอยู่ที่ tokens.css -->
  <button
    :type="type"
    :disabled="disabled || isLoading"
    class="btn-primary w-full"
    :class="isLoading ? '!bg-moon-ink' : ''"
    @click="onClick"
  >
    <!-- ตอนกำลังโหลด: โลโก้กระต่ายตัวจิ๋ว (ตัวเดียวกับหน้ารอโหลด) -->
    <BrandLogoMark v-if="isLoading" :size="34" stage="bob" />
    {{ label }}
  </button>
</template>

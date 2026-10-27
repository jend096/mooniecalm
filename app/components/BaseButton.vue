<script setup lang="ts">
// ===== ปุ่มหลักของแอป =====
// ไม่มีตัวโหลดที่ปุ่ม: ตอนกำลังทำงาน/เปลี่ยนหน้า ให้หน้านั้นขึ้นหน้ารอโหลดกระต่ายเต็มจอ (LoadingOverlay) แทน
// loading = true แค่ทำให้ปุ่มกดซ้ำไม่ได้ (ปุ่มไม่เปลี่ยนหน้าตา)
const props = withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
    loading?: boolean // true = กำลังทำงาน: กดซ้ำไม่ได้
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
</script>

<template>
  <!-- ปุ่มหลัก: รูปทรง/สีมาจาก .btn-primary (assets/css/buttons.css) ค่าขนาดอยู่ที่ tokens.css -->
  <button
    :type="type"
    :disabled="props.disabled || props.loading"
    class="btn-primary w-full"
    @click="emit('click')"
  >
    {{ label }}
  </button>
</template>

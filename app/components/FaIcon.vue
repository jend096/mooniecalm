<script setup lang="ts">
import { FA_ICONS, type FaIconName } from '~/utils/fa-icons'

// ไอคอน Font Awesome Free (ข้อมูลรูปอยู่ใน app/utils/fa-icons.ts)
// ใช้: <FaIcon name="house" class="h-5 w-5" />  สีตามตัวอักษรรอบข้าง (text-moon-ink ฯลฯ)
const props = defineProps<{ name: FaIconName }>()
const icon = computed(() => FA_ICONS[props.name])
</script>

<template>
  <svg
    :viewBox="icon.viewBox"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="icon.d" />
  </svg>
</template>

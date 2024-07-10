<template>
  <a>
    {{ '不错哟' }}

    <span> 这是一段文本 </span>

    {{ `中${a}文` }}

    {{ '不错12312哟' }}
  </a>
</template>

<script lang="ts" setup>
const a = 'hello'

let w = '中文'

w = 'x1中文11'

w = `中${a}文${a}`
</script>

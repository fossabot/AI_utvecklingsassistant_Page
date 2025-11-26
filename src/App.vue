<template>
  <div id="app" class="full-page">
    <div  :class="themeClass" class="grid-chat-sidebar min-h-screen transition-colors duration-300">  
      <Side_bar @room-selected="handleRoomSelected" />
      <Chat_page  v-if="roomData" 
                    :room_name="roomData.name" 
                    :room_history="roomData.history" 
                    />
    </div>
  </div>
</template>

<script setup>
import { reactive, provide, computed, ref } from 'vue'
import Chat_page from './components/chat_page.vue';
import Side_bar from './components/side_bar.vue';

const roomData = ref(null)

function handleRoomSelected(payload) {
  // payload contains { name, history }
  roomData.value = payload
}

// reactive theme state
const theme = reactive({
  dark: false
})

// toggle function
function toggleTheme() {
  theme.dark = !theme.dark
}

// computed class for body
const themeClass = computed(() => (theme.dark ? 'dark' : 'light'))

// provide theme to child components
provide('theme', theme)
provide('toggleTheme', toggleTheme)
</script>

<style scoped>

html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  box-sizing: border-box;
}

/* Make all elements inherit box-sizing (recommended) */
*, *::before, *::after {
  box-sizing: inherit;
}

/* Page background and default typography */
body {
  /* keep background neutral or set to transparent so the app can fill the viewport */
  background: transparent;
  color: #111;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  line-height: 1.4;
}

/* Expand the app wrapper to true fullscreen */
.full-page {
  position: fixed; /* fill the viewport exactly */
  inset: 0;        /* top:0; right:0; bottom:0; left:0 */
  width: 100%;
  height: 100%;
  display: block;  /* container only — inner grid handles columns */
  background: transparent; /* remove any white border/edge */
}

/* Two-column layout that fills the full height, with no gap so they sit flush */
.grid-chat-sidebar {
  display: grid;
  grid-template-columns: 20% 80%; /* sidebar and main (adjust percentages or use px) */
  grid-template-rows: 1fr;        /* single row */
  gap: 0;                         /* remove space between columns */
  height: 100%;                   /* ensure children stretch full height */
}

/* Utility: ensure children fill their grid cells */
.grid-chat-sidebar > * {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* base light theme */
.light {
  background-color: #ffffff;
  color: #1a1a1a;
}

/* dark theme */
.dark {
  background-color: #1a1a1a;
  color: #f5f5f5;
}

/* smooth transition for color changes */
body, .min-h-screen {
  transition: background-color 0.3s, color 0.3s;
}

</style>




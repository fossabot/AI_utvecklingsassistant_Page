<template>
    <aside class="sidebar flex justify-end p-4">
      <div>
        <h2 class="logo">My App</h2>
        <div class="logo">
          <button
            @click="toggleTheme"
            class=" px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-black dark:text-white transition-colors dl-mode"
          >
            {{ theme.dark ? 'Light Mode' : 'Dark Mode' }}
          </button>
        </div>

        <!-- Quickmode: checkboxes for Test and Document -->
        <nav class="mode-section" style="margin-top:20px;">
            <h3>Tags</h3>

            <div class="mode-options" style="display:flex;gap:12px;margin:8px 0;flex-direction:column;">
                <label class="mode-checkbox">
                    <input type="checkbox" v-model="selectedModes" value="Test" />
                    <span>Test</span>
                </label>

                <label class="mode-checkbox">
                    <input type="checkbox" v-model="selectedModes" value="Document" />
                    <span>Document</span>
                </label>
            </div>

            <div style="margin-top:12px;">
                <button class="open-popup-btn" @click="applyToChat">Apply to Chat</button>
            </div>
        </nav>

      </div>
    </aside>
</template>

<script setup>
import { ref, inject } from 'vue';

const selectedModes = ref([])

// inject theme and toggle function
const theme = inject('theme')
const toggleTheme = inject('toggleTheme')

// apply modes to chat: dispatch custom event with selected modes as tags
function applyToChat() {
  window.dispatchEvent(new CustomEvent('mode-applied', {
    detail: {
      tags: [...selectedModes.value]
    }
  }))
}
</script>

<style scoped>

.sidebar {
  background-color: #1f2937;
  color: white;
  padding: 20px;
  height: 100%;
  width: 100%;
}

.logo {
  margin-bottom: 30px;
  font-size: 20px;
  text-align: center;
}

.sidebar a {
  color: white;
  text-decoration: none;
  display: block;
  padding: 10px;
  border-radius: 6px;
  transition: background 0.3s;
}

.sidebar a:hover {
  background-color: #374151;
}

.mode-section {
  padding: 20px;
  border-top: 1px solid #555;
}

.mode-options {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.mode-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border: 1px solid #666;
  border-radius: 4px;
  transition: all 0.2s;
}

.mode-checkbox:hover {
  background-color: #374151;
}

.mode-checkbox input[type="checkbox"] {
  cursor: pointer;
}

.mode-checkbox input[type="checkbox"]:checked + span {
  font-weight: bold;
  color: #42b883;
}

.open-popup-btn {
  width: 100%;
  padding: 10px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.open-popup-btn:hover {
  background-color: #36a372;
}

.open-popup-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.dl-mode {
  cursor: pointer;
}
</style>

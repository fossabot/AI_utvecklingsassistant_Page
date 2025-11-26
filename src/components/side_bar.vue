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
        <nav>
            <label for="nameBar"></label>
            <input type="text" id="nameBar" v-model="get_room_name_input" placeholder="room name here..."/>
            <button type="button" @click="create_new_room"> + Create new</button>
            <ul class="button-container">
            <li v-for="item in room_lists" :key="item"><button class="room-btn" type="button" @click="fetch_room_page(event, item)">{{ item }}</button></li>
            </ul>
        </nav>
      </div>
      <div class="mode-selection-box">
        <h2 class="logo">Quickmode</h2>
        <div class="mode-options">
            <div class="option" 
                :class="{ active: selectedMode === 'Test' }"
                @click="selectMode('Test')">
            <input type="radio" 
                    name="mode" 
                    :checked="selectedMode === 'Test'" 
                    class="visually-hidden" />
            <span>Test</span>
            </div>
            <div class="option" 
                :class="{ active: selectedMode === 'Document' }"
                @click="selectMode('Document')">
            <input type="radio" 
                    name="mode" 
                    :checked="selectedMode === 'Document'" 
                    class="visually-hidden" />
            <span>Document</span>
            </div>
        </div>
        
        <button 
            class="open-popup-btn"
            @click="openCodePopup"
            :disabled="!selectedMode"
        >
            Open Code Editor
        </button>
        
        <!-- Code Input Popup -->
        <div v-if="showPopup" class="popup-overlay">
            <div class="popup-content">
                <div class="popup-header">
                    <h3>Code Input</h3>
                    <p>mode: {{ selectedMode }}</p>
                    <button class="close-btn" @click="closePopup">×</button>
                </div>

                <div class="chat-box">
                    <div v-for="(message, mIdx) in messages" :key="mIdx" :class="['message', message.sender]">

                    <div class="message-body">
                        <div v-for="(block, bIdx) in message.blocks" :key="bIdx" class="block">

                        <!-- Code block -->
                        <div v-if="block.type === 'code'" class="code-card">
                            <div class="card-header">
                            <div class="meta">
                                <span class="lang">{{ (block.lang || 'text').toUpperCase() }}</span>
                                <span class="title">{{ block.title }}</span>
                            </div>
                            <button class="copy-btn" @click="copyWrapped(block)">Copy</button>
                            </div>

                            <pre class="code-block"><code v-html="block.highlighted"></code></pre>

                            <details class="raw-toggle">
                            <summary>Show raw / wrapped</summary>
                            <pre class="raw"><code>{{ block.wrapped }}</code></pre>
                            </details>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>

                
                <textarea 
                    v-model="codeInput" 
                    placeholder="Paste your code here..."
                    rows="10"
                ></textarea>
                
                <div class="popup-actions">
                    <button @click="submitCode">Send</button>
                    <button @click="closePopup">Cancel</button>
                </div>
            </div>
        </div>
      </div>    
    </aside>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { fetch_rooms, fetch_room, create_room, send_prompts_selected_mode } from '@/api/requests';
import { buildMessageFromLLM, copyWrapped } from '@/functions/code_block_handler';

const room_lists = ref([])
const get_room_name_input = ref('')
const emit = defineEmits(['room-selected'])

// State management
const selectedMode = ref(null);
const showPopup = ref(false);
const codeInput = ref('');
const messages = ref([]);

async function get_list() {
    const rooms = await fetch_rooms();
    room_lists.value = rooms
}

async function fetch_room_page(event, room_name) {

    const history = await fetch_room(room_name);

    emit('room-selected', {name: room_name, history: history})
}

async function create_new_room() {
    if (get_room_name_input.value !== undefined || get_room_name_input.value !== ''){
        const create = await create_room(get_room_name_input.value);

        alert('Messsage: ' + create.message)

        if (create.status == 'true') {
          emit('room-selected', {name: get_room_name_input, history: []})
        }
        
    } else {
        alert('Write room name to create a room')
    }
}

// Mode selection handler
const selectMode = (mode) => {
  selectedMode.value = mode;
};

// Popup control
const openCodePopup = () => {
  if (selectedMode.value) {
    showPopup.value = true;
  }
};

const closePopup = () => {
  showPopup.value = false;
  codeInput.value = '';
};

// Code submission
const submitCode = async () => {
  // Send code to backend with selected mode
  messages.value.push('')
  const response = await send_prompts_selected_mode(codeInput.value, selectedMode.value);
  const textResponse = typeof response === 'string' ? response : (response.text || JSON.stringify(response))
  const llmMessage = buildMessageFromLLM(textResponse)
  messages.value.push(llmMessage)

  
  console.log(`Sending code for ${selectedMode.value} mode:`, codeInput.value);
  codeInput.value = '';
};



// inject theme and toggle function
const theme = inject('theme')
const toggleTheme = inject('toggleTheme')

onMounted(() => {
    get_list()
})
</script>

<style scoped>

.sidebar {
  background-color: #1f2937;
  color: white;
  padding: 20px;
  /*display: grid;
  grid-template-rows: 1fr 1fr;*/
  height: 100%;
  width: 100%;
  
}

.logo {
  margin-bottom: 30px;
  font-size: 20px;
  text-align: center;
}

.sidebar ul {
  list-style: none;
  padding: 0;
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

.button-container {
    max-height: 30vh;
    overflow-y: auto;
    scrollbar-color: #6b7280 transparent; /* thumb and track colors */
    scrollbar-width: thin;
    margin-top: 20px;
    padding-right: 5px;
}

.room-btn {
    width: 100%;
    padding: 5%;
    display: block;
    background-color: #1f2937;
    color: white;
    border: none;
    border-radius: 10%;
    justify-items: left;
    outline: none;
    cursor: pointer;
}

.room-btn:hover {
    box-shadow: 0 8px 16px 0 rgba(0,0,0,0.6);
    background-color: #374151;
}

/* Mode selection box styling */
.mode-selection-box {
  padding: 20px;
  border-top: 1px solid #ccc;
}

.mode-options {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.option {
  padding: 10px 15px;
  border: 2px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.option.active {
  border-color: #42b883;
  background-color: #e6fffb;
  color: black;
}

/* Button styling */
.open-popup-btn {
  width: 100%;
  padding: 10px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.open-popup-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Popup styles */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.popup-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  color: black;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

textarea {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 14px;
}

.popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.popup-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.popup-actions button:first-child {
  background-color: #42b883;
  color: white;
}

.popup-actions button:last-child {
  background-color: #f0f0f0;
}

/* Visually hidden radio inputs */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.chat-box {
  background: #fafafa;
  border: 1px solid #eee;
  padding: 12px;
  border-radius: 8px;
  max-height: 60vh;
  overflow: auto;
  margin-bottom: 12px;
  color: black;
}

/* Code card */
.code-card {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  background: #fff;
  margin-top: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.card-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:8px 12px;
  border-bottom:1px solid #f1f1f1;
}
.meta { display:flex; gap:8px; align-items:center; }
.lang { font-weight:600; font-size:12px; padding:4px 8px; background:#f3f3f3; border-radius:6px; }
.copy-btn { border:none; background:transparent; cursor:pointer; padding:6px 8px; }

.code-block {
  margin:0;
  padding:12px;
  overflow:auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace;
  font-size:13px;
  line-height:1.45;
  max-height:420px;
}

/* raw toggle */
.raw-toggle { padding:8px 12px; border-top:1px solid #f6f6f6; background:#fcfcfc; }
.raw { margin:0; padding:8px; background:#f8f8f8; border-radius:4px; overflow:auto; font-family: monospace; }
.dl-mode {
  cursor: pointer;
}
</style>

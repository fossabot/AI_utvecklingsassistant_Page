<template>
    <main class="main-content">
        <div class="chat-container p-4 rounded border dark:border-gray-600 transition-colors">
        <h2>AI assistant</h2>
        <h3>Room: {{ props.room_name }}</h3>

        <div class="chat-box p-4 rounded space-y-4 transition-colors"  :class="theme.dark ? 'dark-chatbox' : 'light-chatbox'">
            <div v-for="(message, mIdx) in messages" :key="mIdx" :class="['message', message.sender, 'p-2 rounded text-message transition-colors']">
            <strong>{{ message.sender === 'user' ? 'User' : 'Chatbot' }}:</strong>

            <div class="message-body">
                <div v-for="(block, bIdx) in message.blocks" :key="bIdx" class="block">
                <!-- Text block: render as HTML (or use plain text if you prefer) -->
                <div v-if="block.type === 'text'" class="text-block">{{ block.text }}</div>

                <!-- Code block -->
                <div v-else-if="block.type === 'code'" class="code-card">
                    <div class="card-header p-2 rounded text-message transition-colors">
                    <div class="meta p-2 rounded text-message transition-colors">
                        <span class="lang">{{ (block.lang || 'text').toUpperCase() }}</span>
                        <span class="title">{{ block.title }}</span>
                    </div>
                    <button class="copy-btn" @click="copyWrapped(block)">Copy</button>
                    </div>

                    <pre class="code-block p-2 rounded code-message transition-colors" >
                      <code v-html="block.highlighted"></code>
                    </pre>

                    <details class="raw-toggle p-2 rounded code-message transition-colors">
                    <summary>Show raw / wrapped</summary>
                    <pre class="raw"><code>{{ block.wrapped }}</code></pre>
                    </details>
                </div>
                </div>
            </div>
            </div>
        </div>

        <form @submit.prevent="sendMessage" class="input-form">
            <input v-model="userInput" type="text" placeholder="Type your message..." required />
            <button type="submit">Send</button>
        </form>
        </div>
    </main>
</template>

<script setup>
import { ref, watch, inject } from 'vue'

import { send_prompts } from '@/api/requests'
import { buildMessageFromLLM, copyWrapped } from '@/functions/code_block_handler.js'

const messages = ref([])
const userInput = ref('')
const props = defineProps({
  room_name: String,
  room_history: Array
})

// sendMessage integrates with your existing send_prompts function
async function sendMessage() {
  //
  const original_text = userInput.value

  if (!original_text || !original_text.trim()) {
    return
  }

  const userMsg = { 
    sender: 'user', 
    blocks: [{ 
      type: 'text',
      text: original_text, 
    }] 
  }
  messages.value.push(userMsg)
  userInput.value = ''

  try {
    const response = await send_prompts([original_text], props.room_name)
    // assume send_prompts returns a string; if it returns structured data adapt accordingly
    if (response.error) {
      alert('Error from server: ' + response.error)
    } else {
      const textResponse = typeof response.message === 'string' ? response.message : (response.message.text || JSON.stringify(response.message))
      const llmMessage = buildMessageFromLLM(textResponse)
      messages.value.push(llmMessage)
    }
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({ sender: 'groq', text: 'Error: could not send message' })
  }


}

/**
 * Sends user input as a message to the chat and processes the LLM's response.
 * - Validates input to prevent empty messages.
 * - Constructs and stores user message in chat history.
 * - Sends input to an external API via send_prompts().
 * - Handles API errors and formats LLM response for display.
 * - Assumes send_prompts() returns a string or structured data with 'text' field.
 * - Requires reactive 'messages' array and 'userInput' reference to chat input field.
 */
/*async function sendMessage() {
  // Get raw user input and trim whitespace
  const original_text = userInput.value

  // Early return if input is empty or whitespace-only
  if (!original_text || !original_text.trim()) {
    return
  }

  // Create user message object with sender: 'user'
  const userMsg = { 
    sender: 'user', 
    blocks: [{ 
      type: 'text',
      text: original_text, 
    }] 
  }

  // Add user message to chat history and clear input field
  messages.value.push(userMsg)
  userInput.value = ''

  try {
    // Send user message to LLM API (assumes send_prompts is a defined async function)
    const response = await send_prompts([original_text], props.room_name)

    // Handle server errors
    if (response.error) {
      alert('Error from server: ' + response.error)
    } else {
      // Extract text from response (string or nested object)
      const textResponse = typeof response.message === 'string' 
        ? response.message 
        : (response.message.text || JSON.stringify(response.message))

      // Format LLM response using helper function and add to chat
      const llmMessage = buildMessageFromLLM(textResponse)
      messages.value.push(llmMessage)
    }
  } catch (error) {
    // Handle network/API errors
    console.error('Error sending message:', error)
    messages.value.push({ 
      sender: 'groq', 
      text: 'Error: could not send message' 
    })
  }
}*/

function loadHistory(history) {
  messages.value = []
  if (!Array.isArray(history)) return
  history.forEach(element => {
    const role = element.role || 'user'
    if (role === 'user') {
      messages.value.push({
        sender: 'user',
        blocks: [{ type: 'text', text: element.content || '' }]
      })
    } else {
      // use buildMessageFromLLM to parse code blocks for assistant messages
      const llmMsg = buildMessageFromLLM(element.content || '')
      llmMsg.sender = role
      messages.value.push(llmMsg)
    }
  })
}

// inject the theme to respond to changes
const theme = inject('theme')

// watch for changes to room_history and load immediately when component mounts / prop arrives
watch(() => props.room_history, (newVal) => {
  loadHistory(newVal)
}, { immediate: true })

// optional: clear messages when room_name changes (if you want)
watch(() => props.room_name, () => {
  // keep behavior: if new history arrives it will be loaded by the other watcher
  messages.value = []
})

</script>

<style scoped>
/* Main content */

.page-layout {
  display: flex;
  min-height: 100vh;
  font-family: Arial, sans-serif;
}

.main-content {
  width: 100%;
  flex: 1;
  padding: 30px;
  background: #f3f4f6;
}

.chat-container {
  /*max-width: 900px;*/
  height: 100%;
  margin: 0 auto;
  padding: 16px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}
.chat-box {
  background-color: #f0f0f0;
  color: #1a1a1a;
  border: 1px solid #eee;
  padding: 12px;
  border-radius: 8px;
  max-height: 60vh;
  overflow: auto;
  margin-bottom: 12px;
}

.dark .chat-container {
  background-color: #2a2a2a;
  color: #f5f5f5;
}
.message {
  margin-bottom: 12px;
}
.message.user { text-align: right; }
.message.groq { text-align: left; }
.text-only { display: inline-block; margin-left: 8px; }

/* Code card */
.code-card {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
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

.light-chatbox {
  background-color: #f0f0f0;
  color: #1a1a1a;
}

.dark-chatbox {
  background-color: #1a1a1a;
  color: #f5f5f5;
}

/* Text messages inside chatbox */
.text-message {
  background-color: inherit;
  color: inherit;
}

/* Code messages inside chatbox */
.code-message {
  background-color: rgba(0,0,0,0.05);
  color: #1a1a1a;
}

.dark-chatbox .message-body .code-card .code-message {
  background-color: rgba(255,255,255,0.1);
  color: #f5f5f5;
}

/* Smooth transition for all elements */
.chat-box,
.text-message,
.code-message {
  transition: background-color 0.3s, color 0.3s;
}
.meta { display:flex; gap:8px; align-items:center; }
.lang { font-weight:600; font-size:12px; padding:4px 8px; border-radius:6px; }
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
.raw-toggle { padding:8px 12px; border-top:1px solid #f6f6f6; }
.raw { margin:0; padding:8px; border-radius:4px; overflow:auto; font-family: monospace; }

/* Input */
.input-form { display:flex; gap:8px; }
.input-form input[type="text"] { flex:1; padding:8px 10px; border-radius:6px; border:1px solid #ddd; }
.input-form button { padding:8px 12px; border-radius:6px; border:none; background:#2b6cb0; color:white; cursor:pointer; }
</style>


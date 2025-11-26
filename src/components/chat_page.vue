<template>
    <main class="main-content">
        <div class="chat-container p-4 rounded border dark:border-gray-600 transition-colors">
        <h2>AI assistant</h2>

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
                    <button class="copy-btn p-2 rounded text-message transition-colors" @click="copyWrapped(block)">Copy</button>
                    </div>

                    <pre class="code-block p-2 rounded code-message transition-colors" ><code v-html="block.highlighted"></code></pre>

                    <details class="raw-toggle p-2 rounded code-message transition-colors">
                    <summary>Show raw / wrapped</summary>
                    <pre class="raw"><code>{{ block.wrapped }}</code></pre>
                    </details>
                </div>
                </div>
            </div>
            </div>
        </div>

        <!-- Tag area above input -->
        <div class="tag-area p-2 mb-3">
          <div class="tag-list" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
            <span v-for="(t, idx) in tags" :key="t + idx" class="tag-pill" style="padding:6px 8px;background:#eef2ff;border-radius:12px;display:flex;align-items:center;gap:8px;">
              <span>{{ t }}</span>
              <button type="button" @click="removeTag(idx)" style="background:transparent;border:none;cursor:pointer;padding:0;font-size:16px;">✕</button>
            </span>
          </div>
        </div>

        <form @submit.prevent="sendMessage" class="input-form">
            <input v-model="userInput" type="text" placeholder="Type your message..." required />
            <button type="submit">Send</button>
        </form>
        <p class="reminder">AI chatbot can assist with coding, answer code related questions, and provide explanations. Please remember that AI can sometimes make mistakes.</p>
        </div>
    </main>
</template>

<script setup>
import { ref, inject, onMounted, onBeforeUnmount } from 'vue'

import { send_prompts } from '@/api/requests'
import { buildMessageFromLLM, copyWrapped } from '@/functions/code_block_handler.js'

const messages = ref([])
const userInput = ref('')
const tags = ref([])

// sendMessage integrates with your existing send_prompts function
async function sendMessage() {
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
    // send message with explicit tags array to backend
    const response = await send_prompts(original_text, tags.value)

    if (response.error) {
      alert('Error from server: ' + response.error)
    } else {
      const textResponse = typeof response.message === 'string' ? response.message : (response.message.text || JSON.stringify(response.message))
      const llmMessage = buildMessageFromLLM(textResponse)
      messages.value.push(llmMessage)
    }
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({ sender: 'groq', blocks: [{ type: 'text', text: 'Error: could not send message' }] })
  }
}

function removeTag(idx) {
  tags.value.splice(idx, 1)
}

// listen for Quickmode + tags from sidebar via custom event
function onModeApplied(e) {
  const { tags: incomingTags } = e.detail || {}
  if (Array.isArray(incomingTags)) {
    tags.value = [...incomingTags]
  }
}

const theme = inject('theme')

// mount/unmount event listener
onMounted(() => {
  window.addEventListener('mode-applied', onModeApplied)
})

onBeforeUnmount(() => {
  window.removeEventListener('mode-applied', onModeApplied)
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

.reminder {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  text-align: center;
  font-style: italic;
}

.tag-pill { font-size:14px; }
.mode-badge { margin-left:8px; padding:6px 10px; background:#e6f7ff; border-radius:12px; font-weight:600; }
</style>


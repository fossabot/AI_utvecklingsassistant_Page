<template>
    <main class="main-content">
        <div class="chat-container">
        <h2>AI assistant</h2>
        <h3>Room: {{ props.room_name }}</h3>

        <div class="chat-box">
            <div v-for="(message, mIdx) in messages" :key="mIdx" :class="['message', message.sender]">
            <strong>{{ message.sender === 'user' ? 'User' : 'Chatbot' }}:</strong>

            <div class="message-body">
                <div v-for="(block, bIdx) in message.blocks" :key="bIdx" class="block">
                <!-- Text block: render as HTML (or use plain text if you prefer) -->
                <div v-if="block.type === 'text'" class="text-block">{{ block.text }}</div>

                <!-- Code block -->
                <div v-else-if="block.type === 'code'" class="code-card">
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

        <form @submit.prevent="sendMessage" class="input-form">
            <input v-model="userInput" type="text" placeholder="Type your message..." required />
            <button type="submit">Send</button>
        </form>
        </div>
    </main>
</template>

<script setup>
import { ref, watch } from 'vue'
import Prism from 'prismjs'

// import the languages you need. add more as required:
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-java'

import { send_prompts } from '@/api/requests'

const messages = ref([])
const userInput = ref('')
const props = defineProps({
  room_name: String,
  room_history: Array
})

function guessLanguage(sample) {
  const s = (sample || '').slice(0, 1000)
  if (/^\s*<\w+/.test(s) || /<\/?html>/.test(s)) return 'html'
  if (/\b(def |import |from |print\(|self\b)/.test(s)) return 'python'
  if (/\b(function |const |let |var |=>)\b/.test(s)) return 'javascript'
  if (/\b(public |class |System\.|void )\b/.test(s)) return 'java'
  if (/\{[^}]*\}/.test(s) && /:\s*\w+/.test(s)) return 'json'
  return 'text'
}

function indentLines(text, spaces) {
  const pad = ' '.repeat(spaces)
  return text.split('\n').map(l => pad + l).join('\n')
}

function wrapCodeInTemplate(langId, src) {
  const raw = (src || '').replace(/^\n+|\n+$/g, '')
  switch ((langId || '').toLowerCase()) {
    case 'html':
    case 'markup':
      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Snippet</title>
  </head>
  <body>
${indentLines(raw, 4)}
  </body>
</html>`
    case 'css':
      return `/* CSS snippet */\n${raw}`
    case 'javascript':
    case 'js':
      if (/\b(function|class|const |let |var |export |import )\b/.test(raw)) return raw
      return `(function(){
${indentLines(raw, 2)}
})()`
    case 'vue':
        // keep existing full SFC if the user provided it
        if (/^<template[\s\S]*<\/template>/.test(raw)) return raw

        // Avoid embedding SFC tag sequences directly in the source file (split them so the SFC parser doesn't see full tags)
        return (
          '<template>\n' +
          '  <div>\n' +
          indentLines(raw, 4) + '\n' +
          '  </div>\n' +
          '</' + 'template>\n\n' +
          '<' + 'script setup>\n' +
          '// add your logic here\n' +
          '</' + 'script>\n\n' +
          '<' + 'style scoped>\n' +
          '/* styles */\n' +
          '</' + 'style>'
        )
    case 'python':
      if (/^\s*(def |class )/m.test(raw)) return raw
      return `def main():
${indentLines(raw, 4)}

if __name__ == '__main__':
    main()`
    case 'java':
      if (/\bclass\b/.test(raw)) return raw
      return `public class Snippet {
${indentLines(raw, 4)}
}`
    case 'json':
      try {
        return JSON.stringify(JSON.parse(raw), null, 2)
      } catch (e) {
        return raw
      }
    default:
      return raw
  }
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightForLanguage(lang, code) {
  const p = lang === 'text' ? 'markup' : lang
  try {
    const grammar = Prism.languages[p] || Prism.languages['markup']
    return Prism.highlight(code, grammar, p)
  } catch (e) {
    return escapeHtml(code)
  }
}

async function copyWrapped(block) {
  const payload = block.wrapped || block.code || block.text || ''
  try {
    await navigator.clipboard.writeText(payload)
    // show toast / feedback
    alert('Copied')
  } catch (e) {
    // fallback copy
    const ta = document.createElement('textarea')
    ta.value = payload
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
    alert('Copied')
  }
}

// parseMessageIntoBlocks(text) -> returns ordered blocks (text/code)
function parseMessageIntoBlocks(text) {
  if (!text || typeof text !== 'string') return [{ type: 'text', text: '' }]

  // Regex that matches either a fenced block (group 1=lang, group 2=code)
  // OR an inline backtick code block (group 3)
  const globalRe = /```\s*([a-zA-Z0-9+\-_.]*)\s*\n([\s\S]*?)```|`([^`]+)`/gm

  const blocks = []
  let lastIndex = 0
  let m

  while ((m = globalRe.exec(text)) !== null) {
    const matchIndex = m.index

    // Text between lastIndex and current match -> push as text block (if non-empty)
    if (matchIndex > lastIndex) {
      const inter = text.slice(lastIndex, matchIndex)
      blocks.push({ type: 'text', text: inter })
    }

    if (m[0].startsWith('```')) {
      // fenced code block
      const rawLang = m[1] || 'text'
      const rawCode = m[2] || ''
      blocks.push({
        type: 'code',
        style: 'fenced',
        lang: rawLang,
        code: rawCode
      })
    } else {
      // inline `...` capture in group 3
      const rawCode = m[3] || ''
      blocks.push({
        type: 'code',
        style: 'inline',
        lang: guessLanguage(rawCode),
        code: rawCode
      })
    }

    lastIndex = globalRe.lastIndex
  }

  // trailing text after last match
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', text: text.slice(lastIndex) })
  }

  // If no matches at all and the entire message looks like code, return single code block
  if (blocks.length === 1 && blocks[0].type === 'text') {
    const whole = blocks[0].text
    const lines = whole.split('\n')
    if (lines.length > 1 && /[;{}()=<>:]/.test(whole)) {
      // treat as code
      return [{
        type: 'code',
        style: 'detected',
        lang: guessLanguage(whole),
        code: whole
      }]
    }
  }

  // Normalize: merge consecutive text blocks (optional, keeps cleaner)
  const normalized = []
  for (const b of blocks) {
    if (b.type === 'text') {
      const prev = normalized[normalized.length - 1]
      if (prev && prev.type === 'text') {
        prev.text += b.text
      } else {
        normalized.push({ type: 'text', text: b.text })
      }
    } else {
      normalized.push(b)
    }
  }

  return normalized
}

// New buildMessageFromLLM that returns ordered blocks with processed code metadata
function buildMessageFromLLM(text) {
  if (!text || typeof text !== 'string') {
    return { sender: 'groq', blocks: [{ type: 'text', text: '' }] }
  }

  const rawBlocks = parseMessageIntoBlocks(text)

  // For each code block, create wrapped + highlighted fields
  const blocks = rawBlocks.map((b) => {
    if (b.type === 'code') {
      const lang = (b.lang || 'text').toLowerCase()
      const wrapped = wrapCodeInTemplate(lang, b.code)
      const highlighted = highlightForLanguage(lang, wrapped)
      const title = b.style === 'inline' ? `Inline code (${lang})` :
                    b.style === 'fenced' ? `Code snippet (${lang})` :
                    `Detected code (${lang})`
      return {
        type: 'code',
        lang,
        code: b.code,
        wrapped,
        highlighted,
        title
      }
    } else {
      // text block
      return {
        type: 'text',
        text: b.text
      }
    }
  })

  return {
    sender: 'groq',
    blocks
  }
}


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
    const textResponse = typeof response === 'string' ? response : (response.text || JSON.stringify(response))
    const llmMessage = buildMessageFromLLM(textResponse)
    messages.value.push(llmMessage)
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({ sender: 'groq', text: 'Error: could not send message' })
  }


}

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
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}
.chat-box {
  background: #fafafa;
  border: 1px solid #eee;
  padding: 12px;
  border-radius: 8px;
  max-height: 60vh;
  overflow: auto;
  margin-bottom: 12px;
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

/* Input */
.input-form { display:flex; gap:8px; }
.input-form input[type="text"] { flex:1; padding:8px 10px; border-radius:6px; border:1px solid #ddd; }
.input-form button { padding:8px 12px; border-radius:6px; border:none; background:#2b6cb0; color:white; cursor:pointer; }
</style>


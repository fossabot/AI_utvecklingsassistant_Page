<template>
  <div class="chat-container">
    <h2>AI assistant</h2>

    <div class="chat-box">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.sender]"
      >
        <strong>{{ message.sender === 'user' ? 'User' : 'Chatbot' }}:</strong>
        <!-- If this message is an LLM code result, render the code card -->
        <div v-if="message.isCode" class="code-card">
          <div class="card-header">
            <div class="meta">
              <span class="lang">{{ (message.lang || 'text').toUpperCase() }}</span>
              <span class="title">{{ message.title || 'Code snippet' }}</span>
            </div>
            <button class="copy-btn" @click="copyWrapped(message)" :aria-label="`Copy ${message.lang} code`">Copy</button>
          </div>

          <pre class="code-block" :style="{ maxHeight: '420px' }"><code v-html="message.highlighted"></code></pre>

          <details class="raw-toggle">
            <summary>Show raw / wrapped</summary>
            <pre class="raw"><code>{{ message.wrapped }}</code></pre>
          </details>
        </div>

        <!-- otherwise render plain text -->
        <div v-else class="text-only">{{ message.text }}</div>
      </div>
    </div>

    <form @submit.prevent="sendMessage" class="input-form">
      <input v-model="userInput" type="text" placeholder="Type your message..." required />
      <button type="submit">Send</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Prism from 'prismjs'
// import the languages you need. add more as required:
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-java'

import { send_prompts } from './api/requests' // your existing request util

const messages = ref([])
const userInput = ref('')

// Helper: extract code from message (fenced blocks, inline, or heuristic)
function extractCodeFromMessage(msg) {
  if (!msg || typeof msg !== 'string') return null

  // fenced blocks: ```lang\n...\n```
  const fenceRe = /```\s*([a-zA-Z0-9+\-_.]*)\s*\n([\s\S]*?)```/m
  const fenceMatch = msg.match(fenceRe)
  if (fenceMatch) {
    return { lang: fenceMatch[1] || 'text', code: fenceMatch[2] }
  }

  // inline backticks
  const inlineRe = /`([^`]+)`/m
  const inlineMatch = msg.match(inlineRe)
  if (inlineMatch) {
    return { lang: 'text', code: inlineMatch[1] }
  }

  // heuristic: multi-line with code-like tokens
  const lines = msg.split('\n')
  if (lines.length > 1 && /[;{}()=<>:]/.test(msg)) {
    const guess = guessLanguage(msg)
    return { lang: guess, code: msg }
  }

  return null
}

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

// Copy to clipboard for a message object
async function copyWrapped(message) {
  try {
    await navigator.clipboard.writeText(message.wrapped || message.text || '')
    // replace alert with your toast in production
    alert('Code copied to clipboard')
  } catch (e) {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = message.wrapped || message.text || ''
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
    alert('Code copied to clipboard')
  }
}

// Called after receiving the LLM response text: builds message object, possibly with wrapped code + highlighted HTML
function buildMessageFromLLM(text) {
  const extracted = extractCodeFromMessage(text)
  if (!extracted) {
    // plain text message
    return { sender: 'groq', text }
  }

  const lang = extracted.lang || guessLanguage(extracted.code || text)
  const wrapped = wrapCodeInTemplate(lang, extracted.code || text)
  const highlighted = highlightForLanguage(lang, wrapped)
  return {
    sender: 'groq',
    text, // original text
    isCode: true,
    lang,
    code: extracted.code,
    wrapped,
    highlighted,
    title: 'Code snippet'
  }
}

// sendMessage integrates with your existing send_prompts function
async function sendMessage() {
  const userMsg = { sender: 'user', text: userInput.value }
  messages.value.push(userMsg)
  const prompt = userInput.value
  userInput.value = ''

  try {
    const response = await send_prompts([prompt])
    // assume send_prompts returns a string; if it returns structured data adapt accordingly
    const textResponse = typeof response === 'string' ? response : (response.text || JSON.stringify(response))
    const llmMessage = buildMessageFromLLM(textResponse)
    messages.value.push(llmMessage)
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({ sender: 'groq', text: 'Error: could not send message' })
  }
}

/* -------- Optional: If you prefer server-side extraction (Flask) --------
Replace the buildMessageFromLLM/text handling by calling your backend:
const res = await fetch('/extract', { method: 'POST', body: JSON.stringify({ message: textResponse }), headers: {'Content-Type':'application/json'} })
const j = await res.json()
if (j.ok) {
  messages.value.push({ sender: 'groq', isCode:true, lang:j.lang, code:j.code, wrapped:j.wrapped, highlighted: highlightForLanguage(j.lang, j.wrapped) })
} else { ... }
------------------------------------------------------------------------- */
</script>

<style scoped>
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
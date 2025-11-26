import Prism from 'prismjs'

// import the languages you need. add more as required:
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-java'

/**
 * Guesses the programming language or data format of a given code sample.
 * 
 * @param {string} sample - The code or text sample to analyze.
 * @returns {string} - The guessed language or format (html, python, javascript, java, json, text).
 * 
 * This function uses heuristic pattern matching to identify common syntax elements:
 * - HTML by opening tags or HTML-specific elements
 * - Python by keywords like def, import, or print
 * - JavaScript by const/let/arrow functions
 * - Java by public/class/System keywords
 * - JSON by object syntax with colons
 * - Defaulting to text if no patterns match
 */
function guessLanguage(sample) {
  // Limit analysis to first 1000 characters for efficiency
  const s = (sample || '').slice(0, 1000);
  
  // HTML detection: HTML tags or html element
  if (/^\s*<\w+/.test(s) || /<\/?html>/.test(s)) return 'html';
  
  // Python detection: Python-specific keywords
  if (/\b(def |import |from |print\(|self\b)/.test(s)) return 'python';
  
  // JavaScript detection: Modern JS keywords and arrow functions
  if (/\b(function |const |let |var |=>)\b/.test(s)) return 'javascript';
  
  // Java detection: Java-specific keywords and syntax
  if (/\b(public |class |System\.|void )\b/.test(s)) return 'java';
  
  // JSON detection: Object syntax with colons
  if (/\{[^}]*\}/.test(s) && /:\s*\w+/.test(s)) return 'json';
  
  // Default fallback for plain text
  return 'text';
}

/*function guessLanguage(sample) {
  const s = (sample || '').slice(0, 1000)
  if (/^\s*<\w+/.test(s) || /<\/?html>/.test(s)) return 'html'
  if (/\b(def |import |from |print\(|self\b)/.test(s)) return 'python'
  if (/\b(function |const |let |var |=>)\b/.test(s)) return 'javascript'
  if (/\b(public |class |System\.|void )\b/.test(s)) return 'java'
  if (/\{[^}]*\}/.test(s) && /:\s*\w+/.test(s)) return 'json'
  return 'text'
}*/

/**
 * Indents each line of the input text by the specified number of spaces.
 * @param {string} text - The text to be indented.
 * @param {number} spaces - The number of spaces to add as indentation for each line.
 * @returns {string} - The text with each line indented by the specified number of spaces.
 */
function indentLines(text, spaces) {
  // Create a string of spaces equal to the specified number of spaces
  const pad = ' '.repeat(spaces);
  
  // Split the input text into an array of lines
  return text.split('\n')
    // Prepend the padding spaces to each line
    .map(line => pad + line)
    // Join the indented lines back into a single string with newlines
    .join('\n');
}

/*function indentLines(text, spaces) {
  const pad = ' '.repeat(spaces)
  return text.split('\n').map(l => pad + l).join('\n')
}*/

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

export {
    buildMessageFromLLM,
    copyWrapped,
}
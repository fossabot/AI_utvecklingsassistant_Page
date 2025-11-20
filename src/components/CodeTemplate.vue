<template>
    <div class="code-template">
        <div class="header">
            <span class="lang">{{ language || 'code' }}</span>
            <button class="copy-btn" @click="copyAdjusted">{{ copied ? 'Copied' : 'Copy' }}</button>
        </div>
        <pre class="code-block"><code>{{ displayText }}</code></pre>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
const props = defineProps({
    raw: { type: String, required: true },
    language: { type: String, default: '' },
    adjusted: { type: String, default: '' }
});

const copied = ref(false);

const displayText = computed(() => {
    // Prefer adjusted code (template-applied). If not provided, fall back to raw.
    return props.adjusted && props.adjusted.length ? props.adjusted : props.raw;
});

async function copyAdjusted() {
    try {
        await navigator.clipboard.writeText(displayText.value);
        copied.value = true;
        setTimeout(() => (copied.value = false), 1500);
    } catch (e) {
        // fallback for older browsers: create textarea
        const ta = document.createElement('textarea');
        ta.value = displayText.value;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copied.value = true; } catch {
            throw Error(e);
        }
        document.body.removeChild(ta);
        setTimeout(() => (copied.value = false), 1500);
    }
}
</script>

<style scoped>
.code-template {
    position: relative;
    margin-top: 0.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #1e1e1e;
    color: #dcdcdc;
    overflow: hidden;
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: rgba(0,0,0,0.2);
    font-size: 12px;
    color: #fff;
}
.lang {
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.85;
}
.copy-btn {
    background: #007bff;
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}
.copy-btn:hover { background: #0056b3; }
.code-block {
    margin: 0;
    padding: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #dcdcdc;
    background: transparent;
}
</style>
<template>
    <div class="chat-container">
        <h2>AI assistant</h2>
        <div class="chat-box">
        <div v-for="(message, index) in messages" :key="index" :class="['message', message.sender]">
            <strong>{{ message.sender === 'user' ? 'User' : 'Chatbot' }}:</strong> {{ message.text }}
        </div>
        </div>
        <form @submit.prevent="sendMessage" class="input-form">
        <input v-model="userInput" type="text" placeholder="Type your message..." required />
        <button type="submit">Send</button>
        </form>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { send_prompts } from './api/requests';        

const messages = ref([]);
const userInput = ref('');

async function sendMessage() {
    const userMsg = { sender: 'user', text: userInput.value };
    messages.value.push(userMsg); 
    const prompt = userInput.value;
    userInput.value = '';

    try {
        const response = await send_prompts([prompt]);
        messages.value.push({ sender: 'groq', text: response });
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

</script>

<style scoped>
.chat-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
}
.chat-box {
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: 1rem;
    border: 1px solid #eee;
    padding: 1rem;
    border-radius: 4px;
    background-color: #f9f9f9;
}   
.message {
    margin-bottom: 0.5rem;
    color: black;
}   
.message.user {
    text-align: right;
}   
.input-form {
    display: flex;
}
.input-form input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-right: 0.5rem;
}   
.input-form button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background-color: #007bff;
    color: white;
    cursor: pointer;
}
.input-form button:hover {
    background-color: #0056b3;
}
</style>

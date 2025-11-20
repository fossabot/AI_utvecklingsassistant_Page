import { createApp } from 'vue'
import App from './App.vue'
import { get_health } from './api/requests'


async function initApp() {
  try {
    const response = await get_health()

    if (response.status === 200) {
      createApp(App).mount('#app')
    } else {
      console.error('Backend health check failed:', response.status)
      document.body.innerHTML = '<h1>Server unavailable</h1>'
    }
  } catch (error) {
    console.error('Health check error:', error)
    document.body.innerHTML = '<h1>Cannot connect to the server</h1>'
  }
}

initApp()

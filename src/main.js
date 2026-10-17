import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'

// Hide pictures whose link no longer works instead of showing a broken-image icon.
document.addEventListener(
  'error',
  (e) => e.target instanceof HTMLImageElement && e.target.classList.add('broken'),
  true,
)

createApp(App).use(router).mount('#app')

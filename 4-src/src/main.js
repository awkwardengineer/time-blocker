import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import SortableJSPrototype from './prototypes/dnd-prototype/SortableJSPrototype.svelte'
import { seedDatabase } from './lib/seed.js'

// Check if we're on the prototype route
// Use hash-based routing for static site compatibility
const isPrototypeRoute = window.location.hash === '#/prototype/sortablejs' ||
                         window.location.pathname.includes('/prototype/sortablejs')

// Seed database with mock data on app initialization, then mount app
(async () => {
  await seedDatabase().catch(console.error)
  
  // Function to mount the correct component based on route
  const mountComponent = () => {
    const currentRoute = window.location.hash === '#/prototype/sortablejs' ||
                        window.location.pathname.includes('/prototype/sortablejs')
    
    if (currentRoute) {
      // Mount prototype component
      mount(SortableJSPrototype, {
        target: document.getElementById('app'),
      })
    } else {
      // Mount main app
      mount(App, {
        target: document.getElementById('app'),
      })
    }
  }
  
  // Initial mount
  mountComponent()
  
  // Listen for hash changes (for hash-based routing)
  window.addEventListener('hashchange', () => {
    // Reload to remount (simple approach for prototype)
    window.location.reload()
  })
})()

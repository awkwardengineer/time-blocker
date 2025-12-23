import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import SortableJSPrototype from './prototypes/dnd-prototype/SortableJSPrototype.svelte'
import { seedDatabase } from './lib/seed.js'

// Seed database with mock data on app initialization, then mount app
(async () => {
  await seedDatabase().catch(console.error)
  
  // Check if we're on the prototype route
  // Use hash-based routing for static site compatibility
  const hash = window.location.hash
  const pathname = window.location.pathname
  const isPrototypeRoute = hash === '#/prototype/sortablejs' || 
                          hash === '#prototype/sortablejs' ||
                          pathname.includes('/prototype/sortablejs')
  
  console.log('Route check:', { hash, pathname, isPrototypeRoute })
  
  const appElement = document.getElementById('app')
  if (!appElement) {
    console.error('App element not found!')
    return
  }
  
  if (isPrototypeRoute) {
    console.log('Mounting SortableJS Prototype')
    // Mount prototype component
    mount(SortableJSPrototype, {
      target: appElement,
    })
  } else {
    console.log('Mounting main App')
    // Mount main app
    mount(App, {
      target: appElement,
    })
  }
  
  // Listen for hash changes (for hash-based routing)
  window.addEventListener('hashchange', () => {
    // Reload to remount (simple approach for prototype)
    window.location.reload()
  })
})()

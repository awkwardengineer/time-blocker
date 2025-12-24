import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import SortableJSPrototype from './prototypes/dnd-prototype/SortableJSPrototype.svelte'
import SortableJSNestedPrototype from './prototypes/dnd-prototype/SortableJSNestedPrototype.svelte'
import { seedDatabase } from './lib/seed.js'

// Seed database with mock data on app initialization, then mount app
(async () => {
  await seedDatabase().catch(console.error)
  
  // Check if we're on the prototype route
  // Use hash-based routing for static site compatibility
  const hash = window.location.hash
  const pathname = window.location.pathname
  const searchParams = new URLSearchParams(window.location.search)
  
  // Check for prototype route in hash, pathname, or query param (for easy testing)
  const prototypeType = searchParams.get('prototype') || 
                       (hash.includes('nested') ? 'nested' : 
                        hash.includes('sortablejs') ? 'sortablejs' : null)
  
  const isPrototypeRoute = hash === '#/prototype/sortablejs' || 
                          hash === '#prototype/sortablejs' ||
                          hash === '#/prototype/nested' ||
                          hash === '#prototype/nested' ||
                          hash.includes('prototype/sortablejs') ||
                          hash.includes('prototype/nested') ||
                          pathname.includes('/prototype/sortablejs') ||
                          pathname.includes('/prototype/nested') ||
                          prototypeType === 'sortablejs' ||
                          prototypeType === 'nested'
  
  console.log('Route check:', { 
    hash, 
    pathname, 
    search: window.location.search,
    isPrototypeRoute,
    fullUrl: window.location.href
  })
  
  const appElement = document.getElementById('app')
  if (!appElement) {
    console.error('App element not found!')
    return
  }
  
  console.log('App element found:', appElement)
  
  if (isPrototypeRoute) {
    const Component = prototypeType === 'nested' ? SortableJSNestedPrototype : SortableJSPrototype
    console.log(`Mounting SortableJS Prototype (${prototypeType || 'basic'})`)
    try {
      mount(Component, {
        target: appElement,
      })
      console.log('Prototype mounted successfully')
    } catch (error) {
      console.error('Error mounting prototype:', error)
    }
  } else {
    console.log('Mounting main App')
    try {
      mount(App, {
        target: appElement,
      })
      console.log('Main app mounted successfully')
    } catch (error) {
      console.error('Error mounting main app:', error)
    }
  }
  
  // Listen for hash changes (for hash-based routing)
  window.addEventListener('hashchange', () => {
    // Reload to remount (simple approach for prototype)
    window.location.reload()
  })
})()

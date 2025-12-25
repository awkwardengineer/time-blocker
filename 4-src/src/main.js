import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { seedDatabase } from './lib/seed.js'
import { initializeTheme } from './lib/theme.js'

// Seed database with mock data on app initialization, then mount app
(async () => {
  try {
    // Initialize theme before mounting app
    initializeTheme()
    
    await seedDatabase().catch(console.error)
    
    const appElement = document.getElementById('app')
    if (!appElement) {
      console.error('App element not found!')
      return
    }
    
    mount(App, {
      target: appElement,
    })
  } catch (error) {
    console.error('Error initializing app:', error)
  }
})()

import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { seedDatabase } from './lib/seed.js'

// Seed database with mock data on app initialization, then mount app
(async () => {
  await seedDatabase().catch(console.error)
  
  const appElement = document.getElementById('app')
  if (!appElement) {
    console.error('App element not found!')
    return
  }
  
  mount(App, {
    target: appElement,
  })
})()

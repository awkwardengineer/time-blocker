import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { seedDatabase } from './lib/seed.js'

// Seed database with mock data on app initialization, then mount app
(async () => {
  await seedDatabase().catch(console.error)
  
  mount(App, {
    target: document.getElementById('app'),
  })
})()

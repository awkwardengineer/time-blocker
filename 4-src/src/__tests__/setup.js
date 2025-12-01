import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/svelte'
import 'fake-indexeddb/auto'

// Cleanup after each test
afterEach(() => {
  cleanup()
})


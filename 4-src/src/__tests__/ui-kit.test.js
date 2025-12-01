import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('UI Kit', () => {
  // Get paths relative to the test file location
  // Test file is at: 4-src/src/__tests__/ui-kit.test.js
  // Source dir is: 4-src/
  // Build dir is: 5-dist/
  const sourceDir = resolve(__dirname, '../..')
  const buildDir = resolve(__dirname, '../../../5-dist')
  const uiKitPath = resolve(sourceDir, 'ui-kit.html')
  const uiKitInBuildPath = resolve(buildDir, 'ui-kit.html')

  it('should exist in source directory (4-src/)', () => {
    expect(existsSync(uiKitPath)).toBe(true)
  })

  it('should be excluded from build output (5-dist/)', () => {
    expect(existsSync(uiKitInBuildPath)).toBe(false)
  })

  it('should be accessible in development mode', () => {
    // In development, Vite serves files from the root of 4-src/
    // ui-kit.html should be accessible at /ui-kit.html
    // This test verifies the file exists and can be served
    expect(existsSync(uiKitPath)).toBe(true)
    
    // Verify it's an HTML file with expected content
    const fileContent = readFileSync(uiKitPath, 'utf-8')
    expect(fileContent).toContain('<!DOCTYPE html>')
    expect(fileContent).toContain('UI Kit')
  })
})


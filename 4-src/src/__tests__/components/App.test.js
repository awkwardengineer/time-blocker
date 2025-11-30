import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'

describe('App', () => {
  beforeEach(() => {
    // Mock window.print() before each test
    window.print = vi.fn()
  })

  it('should call window.print() when print button is clicked', async () => {
    // Render the component using @testing-library/svelte
    render(App)
    
    const user = userEvent.setup()
    
    // Find the print button by its text
    const printButton = screen.getByRole('button', { name: /print/i })
    
    // Click the button
    await user.click(printButton)
    
    // Verify window.print() was called
    expect(window.print).toHaveBeenCalledTimes(1)
  })
})

// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'

describe('App - Header and Settings Flyout', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('displays header with MERINI text and Settings button', async () => {
    render(App)
    
    // Wait for header to appear
    await waitFor(() => {
      expect(screen.getByText('MERINI')).toBeInTheDocument()
    })
    
    // Find Settings button by text content (Button component may not expose aria-label correctly)
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    expect(settingsButton).toBeInTheDocument()
    
    // Verify header structure
    const header = screen.getByText('MERINI').closest('header')
    expect(header).toBeInTheDocument()
  })

  it('opens settings flyout when Settings button is clicked', async () => {
    const user = userEvent.setup()
    const { component } = render(App)
    
    // Wait for Settings button by text content
    const settingsButton = await screen.findByRole('button', { name: /settings/i })
    
    // Wait for button to be ready (ensure it's not disabled)
    await waitFor(() => {
      expect(settingsButton).not.toHaveAttribute('disabled')
    }, { timeout: 3000 })
    
    // Click Settings button - try fireEvent first
    fireEvent.click(settingsButton)
    
    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Wait for flyout to appear (positive assertion)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Verify flyout has Settings heading (more specific than just "Settings" text)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Settings')).toBeInTheDocument()
    
    // Verify flyout has close button
    expect(screen.getByRole('button', { name: /close settings/i })).toBeInTheDocument()
  }, 15000)

  it('opens settings flyout when Settings button is activated via keyboard', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for Settings button by text content
    const settingsButton = await screen.findByRole('button', { name: /settings/i })
    
    // Wait for button to be ready
    await waitFor(() => {
      expect(settingsButton).not.toHaveAttribute('disabled')
    }, { timeout: 3000 })
    
    // Focus and press Enter
    settingsButton.focus()
    await user.keyboard('{Enter}')
    
    // Wait for flyout to appear (positive assertion)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Verify flyout has Settings heading (more specific than just "Settings" text)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Settings')).toBeInTheDocument()
  }, 15000)

  it('closes settings flyout when X button is clicked', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Open flyout
    const settingsButton = await screen.findByRole('button', { name: /settings/i })
    await user.click(settingsButton)
    
    // Wait for flyout to appear (positive assertion)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Click close button
    const closeButton = screen.getByRole('button', { name: /close settings/i })
    await user.click(closeButton)
    
    // Wait for flyout to close (negative assertion after positive succeeded)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }, { timeout: 5000 })
  }, 15000)

  it('closes settings flyout when clicking outside (on backdrop)', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Open flyout
    const settingsButton = await screen.findByRole('button', { name: /settings/i })
    await user.click(settingsButton)
    
    // Wait for flyout to appear (positive assertion)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Find backdrop and click it
    const backdrop = screen.getByRole('dialog')
    // Click on the backdrop itself (not the flyout content)
    await user.click(backdrop)
    
    // Wait for flyout to close (negative assertion after positive succeeded)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }, { timeout: 5000 })
  }, 15000)

  it('closes settings flyout when Escape key is pressed', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Open flyout
    const settingsButton = await screen.findByRole('button', { name: /settings/i })
    await user.click(settingsButton)
    
    // Wait for flyout to appear (positive assertion)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Press Escape
    await user.keyboard('{Escape}')
    
    // Wait for flyout to close (negative assertion after positive succeeded)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }, { timeout: 5000 })
  }, 15000)

  it('traps focus within settings flyout when Tab is pressed', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Open flyout
    const settingsButton = await screen.findByRole('button', { name: /settings/i })
    await user.click(settingsButton)
    
    // Wait for flyout to appear (positive assertion)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Focus should be on close button initially
    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close settings/i })
      expect(closeButton).toHaveFocus()
    }, { timeout: 3000 })
    
    // Press Tab - focus should stay within flyout
    await user.keyboard('{Tab}')
    
    // Focus should still be within the flyout (either close button or other focusable elements)
    await waitFor(() => {
      const dialog = screen.getByRole('dialog')
      expect(dialog.contains(document.activeElement)).toBe(true)
    }, { timeout: 3000 })
  }, 15000)

  it('displays placeholder content in settings flyout', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Open flyout
    const settingsButton = await screen.findByRole('button', { name: /settings/i })
    await user.click(settingsButton)
    
    // Wait for flyout to appear (positive assertion)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Verify placeholder content (positive assertion)
    await waitFor(() => {
      expect(screen.getByText('Settings content will go here.')).toBeInTheDocument()
    }, { timeout: 3000 })
  }, 15000)

  it('header is hidden during print', async () => {
    render(App)
    
    // Header should be in the document
    const header = screen.getByText('MERINI').closest('header')
    expect(header).toBeInTheDocument()
    
    // Header should have print:hidden class
    expect(header).toHaveClass('print:hidden')
  })
})


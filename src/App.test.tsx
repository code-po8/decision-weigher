import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the app header and the first wizard step', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Decision Weigher' })).toBeInTheDocument()
    expect(screen.getByTestId('step-decision')).toBeInTheDocument()
  })
})

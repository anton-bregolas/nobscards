import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders without errors', () => {
    const { container } = render(<App />)
    const header = container.querySelector('header')
    const footer = container.querySelector('footer')
    expect(header).toBeInTheDocument()
    expect(footer).toBeInTheDocument()
  })
})

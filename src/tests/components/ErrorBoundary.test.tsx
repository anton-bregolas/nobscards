import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import ErrorBoundary from '../../components/ErrorBoundary'

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <I18nProvider lang="en">
        <ErrorBoundary>
          <div>Safe content</div>
        </ErrorBoundary>
      </I18nProvider>,
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('renders fallback on error', () => {
    const Throw = () => { throw new Error('test') }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <I18nProvider lang="en">
        <ErrorBoundary>
          <Throw />
        </ErrorBoundary>
      </I18nProvider>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const Throw = () => { throw new Error('test') }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <I18nProvider lang="en">
        <ErrorBoundary fallback={<div>Custom error</div>}>
          <Throw />
        </ErrorBoundary>
      </I18nProvider>,
    )

    expect(screen.getByText('Custom error')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})

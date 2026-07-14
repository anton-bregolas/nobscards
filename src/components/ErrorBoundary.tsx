import { Component, type ReactNode } from 'react'
import { useTranslation } from '../i18n'

function Fallback() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-text opacity-60">
      <i className="bi bi-exclamation-triangle text-6xl" />
      <p className="text-lg">{t('error.somethingWrong')}</p>
    </div>
  )
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <Fallback />
    }
    return this.props.children
  }
}

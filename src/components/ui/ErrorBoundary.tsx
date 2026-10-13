import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** What to show in place of the part that failed. */
  fallback: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/**
 * Keeps one failing part from taking the whole page with it.
 *
 * Without a boundary, an error thrown during render unmounts the entire React
 * tree and the visitor is left with a blank window. Wrapped around a section
 * that can fail on its own (the 3D scenes, for one), the rest of the page stays
 * up and the section shows its `fallback`.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left in the console for whoever is debugging; the visitor sees the fallback.
    console.error('Section failed to render, showing its fallback.', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

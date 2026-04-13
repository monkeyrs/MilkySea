import { Component, type ErrorInfo, type ReactNode } from 'react';

import i18n from '../../i18n';

interface RenderErrorBoundaryProps {
  children: ReactNode;
}

interface RenderErrorBoundaryState {
  error: Error | null;
}

export class RenderErrorBoundary extends Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  state: RenderErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RenderErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Renderer crashed:', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="render-error">
        <div className="render-error__card">
          <h1>{i18n.t('errors.renderCrashedTitle')}</h1>
          <p>{i18n.t('errors.renderCrashedBody')}</p>
          <pre>{this.state.error.message}</pre>
        </div>
      </main>
    );
  }
}

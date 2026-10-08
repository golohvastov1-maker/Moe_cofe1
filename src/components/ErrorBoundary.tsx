import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Ошибка интерфейса приложения:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-dvh place-items-center bg-pine-950 px-5 text-center text-cream">
          <div>
            <h1 className="font-display text-2xl">Не удалось показать этот экран</h1>
            <p className="mt-2 text-sm text-sage">Попробуйте перезагрузить приложение. Несохранённые изменения могут быть потеряны.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tap mt-5 rounded-[12px] bg-saffron px-4 py-2.5 font-semibold text-pine-950"
            >
              Перезагрузить
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

// App root: provides the decision store and a browser router around the wizard.
// The router basename follows the build's base URL (import.meta.env.BASE_URL),
// so the same source deploys at the domain root or under any subpath (see
// vite.config.ts / routerBase.ts).
import { BrowserRouter } from 'react-router-dom'
import { DecisionStoreProvider } from './store/DecisionStoreContext'
import { WizardRoutes } from './wizard/WizardRoutes'
import { routerBasename } from './routerBase'

export function App() {
  return (
    <DecisionStoreProvider>
      <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
        <header className="border-b border-line bg-surface px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Decision <span className="text-accent">Weigher</span>
          </h1>
        </header>
        <WizardRoutes />
      </BrowserRouter>
    </DecisionStoreProvider>
  )
}

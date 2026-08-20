// App root: provides the decision store and a browser router around the wizard.
import { BrowserRouter } from 'react-router-dom'
import { DecisionStoreProvider } from './store/DecisionStoreContext'
import { WizardRoutes } from './wizard/WizardRoutes'

export function App() {
  return (
    <DecisionStoreProvider>
      <BrowserRouter>
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

// React binding for the decision store.
//
// The store is a vanilla zustand store created by createDecisionStore(). A
// context provides one instance to the tree; `useDecisionStore` subscribes a
// component to a slice of it (re-rendering only when that slice changes). Tests
// can inject a pre-seeded store via the provider's `store` prop.

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { StoreApi } from 'zustand'
import { createDecisionStore, type DecisionStore } from './decisionStore'

const DecisionStoreContext = createContext<StoreApi<DecisionStore> | null>(null)

export interface DecisionStoreProviderProps {
  children: ReactNode
  /** Inject a store (e.g. pre-seeded in tests). Defaults to a fresh empty store. */
  store?: StoreApi<DecisionStore>
}

export function DecisionStoreProvider({ children, store }: DecisionStoreProviderProps) {
  // Create a single default store instance for this provider if none injected.
  // useState's lazy initializer runs the factory exactly once, never on
  // re-render (and never reads a ref during render).
  const [fallback] = useState(() => createDecisionStore())
  const value = store ?? fallback

  return <DecisionStoreContext.Provider value={value}>{children}</DecisionStoreContext.Provider>
}

/** Access the raw store API (for actions/imperative reads outside render). */
export function useDecisionStoreApi(): StoreApi<DecisionStore> {
  const store = useContext(DecisionStoreContext)
  if (!store) throw new Error('useDecisionStore must be used within a DecisionStoreProvider')
  return store
}

/** Subscribe to a slice of the store; re-renders when the selected value changes. */
export function useDecisionStore<T>(selector: (state: DecisionStore) => T): T {
  return useStore(useDecisionStoreApi(), selector)
}

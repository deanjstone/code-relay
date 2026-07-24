import { useState } from 'react'
import { LaunchForm } from './components/LaunchForm'
import { RunPrompt } from './components/RunPrompt'
import { SearchVault } from './components/SearchVault'

type Tab = 'launch' | 'run' | 'search'

const TABS: { id: Tab; label: string }[] = [
  { id: 'launch', label: 'Launch' },
  { id: 'run', label: 'Run' },
  { id: 'search', label: 'Search' },
]

function App() {
  const [tab, setTab] = useState<Tab>('launch')

  return (
    <div className="mx-auto flex max-w-md flex-col">
      <nav className="flex gap-1 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              tab === id ? 'bg-violet-600 text-white' : 'bg-indigo-900 text-indigo-300'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'launch' && <LaunchForm />}
      {tab === 'run' && (
        <main className="flex flex-col gap-4 p-6 pt-0">
          <h1 className="text-xl font-semibold">Run Prompt</h1>
          <RunPrompt />
        </main>
      )}
      {tab === 'search' && (
        <main className="flex flex-col gap-4 p-6 pt-0">
          <h1 className="text-xl font-semibold">Search Vault</h1>
          <SearchVault />
        </main>
      )}
    </div>
  )
}

export default App

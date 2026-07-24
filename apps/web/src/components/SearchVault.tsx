import { useState, type FormEvent } from 'react'
import { searchVault, type SearchResult } from '../lib/api'
import { EngineStatus } from './EngineStatus'

type Status = { kind: 'idle' } | { kind: 'searching' } | { kind: 'ok'; results: SearchResult[] } | { kind: 'error'; message: string }

function messageForReason(reason?: string): string {
  if (reason === 'engine_unreachable') {
    return "agent-engine is unreachable — check the homelab service is running."
  }
  return 'Search failed. Please try again.'
}

export function SearchVault() {
  const [query, setQuery] = useState('')
  const [k, setK] = useState(5)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!query.trim()) return
    setStatus({ kind: 'searching' })

    try {
      const result = await searchVault(query.trim(), k)
      if (result.results) {
        setStatus({ kind: 'ok', results: result.results })
      } else {
        setStatus({ kind: 'error', message: messageForReason(result.reason) })
      }
    } catch {
      setStatus({ kind: 'error', message: "Network error — check you're on Tailscale." })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <EngineStatus />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-indigo-300">Query</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="rounded-md bg-indigo-900 px-3 py-2 text-base text-indigo-50 outline-none ring-1 ring-indigo-700 placeholder-indigo-400 focus:ring-violet-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-indigo-300">Results (k)</span>
          <input
            type="number"
            min={1}
            max={20}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="w-20 rounded-md bg-indigo-900 px-3 py-2 text-base text-indigo-50 outline-none ring-1 ring-indigo-700 focus:ring-violet-400"
          />
        </label>

        <button
          type="submit"
          disabled={status.kind === 'searching' || !query.trim()}
          className="rounded-md bg-violet-600 px-4 py-3 text-base font-semibold text-white active:bg-violet-500 disabled:opacity-60"
        >
          {status.kind === 'searching' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {status.kind === 'error' && <p className="text-sm text-red-400">{status.message}</p>}
      {status.kind === 'ok' && (
        <ul className="flex flex-col gap-2">
          {status.results.map((result, i) => (
            <li key={`${result.fileName}-${i}`} className="rounded-md bg-indigo-900 p-3 text-sm text-indigo-50">
              <div className="flex items-center justify-between text-indigo-300">
                <span className="font-medium">{result.fileName}</span>
                <span>{result.score.toFixed(3)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{result.chunk}</p>
            </li>
          ))}
          {status.results.length === 0 && <li className="text-indigo-400">No results.</li>}
        </ul>
      )}
    </div>
  )
}

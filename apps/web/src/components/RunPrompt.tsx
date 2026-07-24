import { useState, type FormEvent } from 'react'
import { runPrompt } from '../lib/api'
import { EngineStatus } from './EngineStatus'

type Status = { kind: 'idle' } | { kind: 'running' } | { kind: 'ok'; text: string } | { kind: 'error'; message: string }

function messageForReason(reason?: string): string {
  if (reason === 'engine_unreachable') {
    return "agent-engine is unreachable — check the homelab service is running."
  }
  return 'Could not run prompt. Please try again.'
}

export function RunPrompt() {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!prompt.trim()) return
    setStatus({ kind: 'running' })

    try {
      const result = await runPrompt(prompt.trim())
      if (result.text !== undefined) {
        setStatus({ kind: 'ok', text: result.text })
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
          <span className="text-sm text-indigo-300">Prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            autoFocus
            className="rounded-md bg-indigo-900 px-3 py-2 text-base text-indigo-50 outline-none ring-1 ring-indigo-700 placeholder-indigo-400 focus:ring-violet-400"
          />
        </label>

        <button
          type="submit"
          disabled={status.kind === 'running' || !prompt.trim()}
          className="rounded-md bg-violet-600 px-4 py-3 text-base font-semibold text-white active:bg-violet-500 disabled:opacity-60"
        >
          {status.kind === 'running' ? 'Running…' : 'Run'}
        </button>
      </form>

      {status.kind === 'error' && <p className="text-sm text-red-400">{status.message}</p>}
      {status.kind === 'ok' && (
        <pre className="whitespace-pre-wrap rounded-md bg-indigo-900 p-3 text-sm text-indigo-50">{status.text}</pre>
      )}
    </div>
  )
}

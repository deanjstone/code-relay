import { useState, type FormEvent } from 'react'
import { launchSession } from '../lib/api'

type Status = { kind: 'idle' } | { kind: 'launching' } | { kind: 'ok'; name: string } | { kind: 'error'; message: string }

function messageForReason(reason?: string): string {
  if (reason === 'lgn5_unreachable') {
    return "LGN5 is unreachable — check it's online and the listener is running."
  }
  return 'Could not launch session. Please try again.'
}

export function LaunchForm() {
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus({ kind: 'launching' })

    try {
      const result = await launchSession({
        name: name.trim() || undefined,
        prompt: prompt.trim() || undefined,
      })

      if (result.ok) {
        setStatus({ kind: 'ok', name: result.name ?? 'AGENT' })
        setName('')
        setPrompt('')
      } else {
        setStatus({ kind: 'error', message: messageForReason(result.reason) })
      }
    } catch {
      setStatus({ kind: 'error', message: "Network error — check you're on Tailscale." })
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="text-xl font-semibold">Launch Agent</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-indigo-300">Session name (optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AGENT"
            autoFocus
            className="rounded-md bg-indigo-900 px-3 py-2 text-base text-indigo-50 outline-none ring-1 ring-indigo-700 placeholder-indigo-400 focus:ring-violet-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-indigo-300">First prompt (optional)</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="rounded-md bg-indigo-900 px-3 py-2 text-base text-indigo-50 outline-none ring-1 ring-indigo-700 placeholder-indigo-400 focus:ring-violet-400"
          />
        </label>

        <button
          type="submit"
          disabled={status.kind === 'launching'}
          className="rounded-md bg-violet-600 px-4 py-3 text-base font-semibold text-white active:bg-violet-500 disabled:opacity-60"
        >
          {status.kind === 'launching' ? 'Launching…' : 'Launch'}
        </button>

        <p className="min-h-[1.5rem] text-sm" role="status">
          {status.kind === 'ok' && <span className="text-emerald-400">Launched "{status.name}" on LGN5.</span>}
          {status.kind === 'error' && <span className="text-red-400">{status.message}</span>}
        </p>
      </form>
    </main>
  )
}

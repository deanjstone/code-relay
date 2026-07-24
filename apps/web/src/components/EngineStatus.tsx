import { useEffect, useState } from 'react'
import { getEngineStatus } from '../lib/api'

export function EngineStatus() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const result = await getEngineStatus()
        if (!cancelled) setOk(result.ok)
      } catch {
        if (!cancelled) setOk(false)
      }
    }

    poll()
    const interval = setInterval(poll, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const label = ok === null ? 'Checking…' : ok ? 'Engine online' : 'Engine offline'
  const dotColor = ok === null ? 'bg-indigo-400' : ok ? 'bg-emerald-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-2 text-sm text-indigo-300">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </div>
  )
}

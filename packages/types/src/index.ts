export type RelayEvent =
  | { type: 'SessionStarted';        sessionId: string; provider: string }
  | { type: 'MessageReceived';       role: 'user' | 'assistant'; content: string }
  | { type: 'ToolInvoked';           id: string; name: string; input: unknown }
  | { type: 'ToolFinished';          id: string; output: unknown }
  | { type: 'ApprovalRequested';     id: string; summary: string; detail: string }
  | { type: 'ApprovalResolved';      id: string; approved: boolean }
  | { type: 'DiffGenerated';         path: string; diff: string }
  | { type: 'CommandStarted';        id: string; command: string }
  | { type: 'CommandCompleted';      id: string; exitCode: number }
  | { type: 'TaskCompleted';         sessionId: string }
  | { type: 'TaskFailed';            sessionId: string; error: string }
  | { type: 'ProviderStatusChanged'; provider: string; status: 'online' | 'offline' }

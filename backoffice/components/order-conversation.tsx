'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { watchConversation, CONVERSATION_STATUSES, CONVERSATION_TEAMS, type ConversationMessage, type ConversationThread } from '@/lib/order-conversation'
type Thread = Pick<ConversationThread,'status' | 'revision' | 'last_message_id'> & Partial<ConversationThread>
type Payload = { thread: Thread; unread: boolean; messages?: ConversationMessage[]; moreBefore?: boolean; moreAfter?: boolean; assignees?: { id: string; full_name: string; role: string }[]; hasPrint?: boolean; error?: string }

export function OrderConversation({ identifier, customer = false }: { identifier: string; customer?: boolean }) {
  const endpoint = customer ? `/api/public/orders/${encodeURIComponent(identifier)}/conversation` : `/api/orders/${encodeURIComponent(identifier)}/conversation`
  const [open, setOpen] = useState(false)
  const [thread, setThread] = useState<Thread | null>(null)
  const [unread, setUnread] = useState(false)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [moreBefore, setMoreBefore] = useState(false)
  const [moreAfter, setMoreAfter] = useState(false)
  const [assignees, setAssignees] = useState<NonNullable<Payload['assignees']>>([])
  const [hasPrint, setHasPrint] = useState(false)
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [status, setStatus] = useState('open')
  const [team, setTeam] = useState('store')
  const [assigned, setAssigned] = useState('')
  const rows = useRef<ConversationMessage[]>([])
  const initialized = useRef(false)
  const fetchLock = useRef(false)
  const fetchCompletion = useRef<Promise<void> | null>(null)
  const activeSignal = useRef<AbortSignal | undefined>(undefined)
  const submitLock = useRef(false)
  const dirtyAssignment = useRef(false)
  const draftRevision = useRef(0)
  const attempt = useRef<{ body: string; nonce: string } | null>(null)
  const readCursor = useRef(0)

  const load: (signal?: AbortSignal, older?: boolean) => Promise<void> = useCallback(async (signal?: AbortSignal, older = false): Promise<void> => {
    if (fetchLock.current) {
      if (signal && !activeSignal.current?.aborted) return
      await fetchCompletion.current
      if (signal?.aborted) return
      return load(signal,older)
    }
    let complete: () => void = () => undefined
    fetchCompletion.current = new Promise<void>(resolve => { complete = resolve })
    activeSignal.current = signal
    fetchLock.current = true; setLoading(true)
    try {
      const after = initialized.current && !older ? rows.current.at(-1)?.id ?? 0 : null
      const before = older ? rows.current[0]?.id : null
      const query = before ? `?before=${before}` : after !== null ? `?after=${after}` : ''
      const response = await fetch(endpoint + query,{ cache: 'no-store', signal })
      const data = await response.json() as Payload
      if (!response.ok) throw new Error(data.error || 'Gesprek kon niet worden geladen.')
      if (signal?.aborted) return
      setThread(data.thread); setUnread(data.unread)
      if (data.assignees) { setAssignees(data.assignees); setHasPrint(!!data.hasPrint) }
      if (!customer && !dirtyAssignment.current) {
        setStatus(data.thread.status); setTeam(data.thread.team || 'store'); setAssigned(data.thread.assigned_user || ''); draftRevision.current = data.thread.revision
      }
      const combined = [...rows.current,...(data.messages ?? [])]
      rows.current = [...new Map(combined.map(m => [m.id,m])).values()].sort((a,b) => a.id - b.id)
      setMessages(rows.current)
      if (older || !initialized.current) setMoreBefore(!!data.moreBefore)
      if (!older) setMoreAfter(!!data.moreAfter)
      initialized.current = true
      const highest = rows.current.at(-1)?.id ?? 0
      if (highest > readCursor.current && document.visibilityState === 'visible') {
        const read = await fetch(endpoint,{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', through: highest }), signal })
        if (read.ok) { readCursor.current = highest; setUnread(!!data.moreAfter) }
      }
      setError(null)
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Verbinding mislukt.') }
    finally { fetchLock.current = false; complete(); if (!signal?.aborted) setLoading(false) }
  },[endpoint,customer])

  useEffect(() => {
    const controller = new AbortController()
    const hash = () => { if (window.location.hash === '#order-conversation') setOpen(true) }
    hash(); window.addEventListener('hashchange',hash)
    // Closed conversations request metadata once; they never download messages.
    fetch(endpoint + '?summary=1',{ cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json() as Payload
      if (response.ok && !controller.signal.aborted && !initialized.current) { setUnread(data.unread); setThread(data.thread) }
    }).catch(() => undefined)
    return () => { controller.abort(); window.removeEventListener('hashchange',hash) }
  },[endpoint])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const stop = watchConversation(() => { void load(controller.signal) },document,{
      setInterval: (callback,ms) => window.setInterval(callback,ms),
      clearInterval: id => window.clearInterval(id),
    })
    return () => { controller.abort(); stop() }
  },[open,load])

  async function mutate(payload: Record<string,unknown>) {
    const response = await fetch(endpoint,{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json() as { error?: string; emailFailed?: boolean }
    if (!response.ok) throw new Error(data.error || 'Opslaan mislukt.')
    return data
  }
  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (submitLock.current || !body.trim()) return
    submitLock.current = true; setPending(true); setError(null); setNotice(null)
    if (!attempt.current || attempt.current.body !== body.trim()) attempt.current = { body: body.trim(), nonce: crypto.randomUUID() }
    try {
      const data = await mutate({ action: 'send', ...attempt.current })
      setBody(''); attempt.current = null
      setNotice(data.emailFailed ? 'Bericht opgeslagen; de e-mailmelding kon niet worden verstuurd.' : 'Bericht verstuurd.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Versturen mislukt.') }
    finally { submitLock.current = false; setPending(false) }
  }
  async function manage() {
    if (submitLock.current) return
    submitLock.current = true; setPending(true); setError(null); setNotice(null)
    try {
      const data = await mutate({ action: 'manage', status, team, assigned_user: assigned || null, revision: draftRevision.current })
      dirtyAssignment.current = false
      initialized.current = false
      await load()
      setNotice(data.emailFailed ? 'Toewijzing opgeslagen; de e-mailmelding kon niet worden verstuurd.' : 'Toewijzing en status opgeslagen.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Opslaan mislukt.') }
    finally { submitLock.current = false; setPending(false) }
  }
  return <section id="order-conversation" className="ui-card order-conversation">
    <div className="personalisation-actions"><h2>Vraag over deze bestelling</h2><button type="button" aria-expanded={open} aria-controls="order-conversation-panel" onClick={() => setOpen(v => !v)}>{open ? 'Gesprek sluiten' : 'Gesprek openen'}{unread ? ' • Nieuw bericht' : ''}</button></div>
    {thread ? <p>Status: {CONVERSATION_STATUSES[thread.status]}</p> : null}
    {open ? <div id="order-conversation-panel">
      {!customer && thread ? <div className="conversation-assignment">
        <label>Team<select value={team} onChange={e => { dirtyAssignment.current = true; setTeam(e.target.value) }}>{Object.entries(CONVERSATION_TEAMS).filter(([key]) => key !== 'print' || hasPrint).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Medewerker<select value={assigned} onChange={e => { dirtyAssignment.current = true; setAssigned(e.target.value) }}><option value="">Niemand — team behandelt de vraag</option>{assignees.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
        <label>Status<select value={status} onChange={e => { dirtyAssignment.current = true; setStatus(e.target.value) }}>{Object.entries(CONVERSATION_STATUSES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button type="button" disabled={pending || loading} onClick={manage}>Toewijzing opslaan</button>
        <button type="button" disabled={pending || loading} onClick={() => { dirtyAssignment.current = false; initialized.current = false; void load() }}>Actuele toewijzing ophalen</button>
      </div> : null}
      {moreBefore ? <button type="button" disabled={loading} onClick={() => void load(undefined,true)}>Oudere berichten laden</button> : null}
      <div className="conversation-messages" role="log" aria-label="Berichten over deze order" aria-live="polite">
        {!messages.length ? <p>{loading ? 'Gesprek laden…' : 'Nog geen berichten. Stel hieronder uw vraag.'}</p> : messages.map(m => <article key={m.id} className={`conversation-message conversation-message--${m.sender_kind}`}><div><strong>{m.sender_kind === 'customer' ? 'Klant' : 'Medewerker'}</strong> <time dateTime={m.created_at}>{new Intl.DateTimeFormat('nl-NL',{ dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Amsterdam' }).format(new Date(m.created_at))}</time></div><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</p></article>)}
      </div>
      {moreAfter ? <button type="button" disabled={loading} onClick={() => void load()}>Meer nieuwe berichten laden</button> : null}
      <form onSubmit={send} style={{ display: 'grid', gap: 12 }}><label htmlFor="order-message">{customer ? 'Uw vraag of reactie' : 'Antwoord aan klant'}</label><textarea id="order-message" maxLength={4000} rows={4} value={body} onChange={e => setBody(e.target.value)} required disabled={pending} /><p className="ui-text-muted">{customer ? 'Uw winkel ontvangt de vraag. Een nieuw bericht heropent een gesloten gesprek.' : 'Dit bericht is zichtbaar voor de klant.'}</p><button type="submit" disabled={pending || !body.trim()}>{pending ? 'Versturen…' : 'Bericht versturen'}</button></form>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert" style={{ color: 'var(--error-text)' }}>{error}</p> : null}
    </div> : null}
  </section>
}

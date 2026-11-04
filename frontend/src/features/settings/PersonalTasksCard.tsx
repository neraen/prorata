import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '../../components/ui'
import { PlusIcon, CloseIcon, ListIcon } from '../../components/icons'
import { apiFetch } from '../../lib/api'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'

interface Task { id: string; title: string; completed: boolean; archived: boolean; createdAt: string }
interface TaskList { items: Task[] }
type Command = { type: 'task.add'; payload: { id: string; title: string } } | { type: 'task.set'; payload: { id: string; title?: string; completed?: boolean } } | { type: 'task.archive'; payload: { id: string; archived: boolean } }

export function PersonalTasksCard() {
  const userId = useAuthStore((state) => state.user?.id)
  const coupleId = useCoupleStore((state) => state.couple?.id)
  const toast = useToastStore((state) => state.show)
  const client = useQueryClient()
  const key = ['personalTasks', coupleId, userId]
  const tasks = useQuery({ queryKey: key, queryFn: () => apiFetch<TaskList>('/tasks', { cache: 'no-store' }), enabled: !!userId && !!coupleId, refetchInterval: 15000 })
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [lastRemoved, setLastRemoved] = useState<Task | null>(null)
  const [error, setError] = useState('')
  const nextId = useRef(crypto.randomUUID())
  const input = useRef<HTMLInputElement>(null)
  const mutation = useMutation({
    mutationFn: (command: Command) => apiFetch<TaskList>('/tasks/commands', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), ...command }) }),
    onMutate: async (command) => {
      setError(''); await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<TaskList>(key)
      if (previous) client.setQueryData<TaskList>(key, { items: command.type === 'task.add' ? [...previous.items, { ...command.payload, completed: false, archived: false, createdAt: new Date().toISOString() }] : previous.items.map((task) => task.id === command.payload.id ? { ...task, ...command.payload } : task) })
      return { previous }
    },
    onSuccess: (data) => { client.setQueryData(key, data) },
    onError: (cause, _command, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      const message = cause instanceof Error ? cause.message : 'Enregistrement impossible. Réessaie sans quitter ta liste.'
      setError(message); toast(message, 'error')
    },
  })
  const busy = mutation.isPending
  const items = tasks.data?.items ?? []
  const active = items.filter((task) => !task.archived)
  const remaining = active.filter((task) => !task.completed)
  const completed = active.filter((task) => task.completed)
  const archived = items.filter((task) => task.archived)
  async function add(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || busy) return
    try {
      await mutation.mutateAsync({ type: 'task.add', payload: { id: nextId.current, title: title.trim() } })
      nextId.current = crypto.randomUUID(); setTitle(''); requestAnimationFrame(() => input.current?.focus())
    } catch { /* Keep the typed task. */ }
  }
  async function remove(task: Task) {
    try { await mutation.mutateAsync({ type: 'task.archive', payload: { id: task.id, archived: true } }); setLastRemoved(task); if (editing === task.id) setEditing(null) } catch { /* Inline error. */ }
  }
  async function restore(task: Task) {
    try { await mutation.mutateAsync({ type: 'task.archive', payload: { id: task.id, archived: false } }); if (lastRemoved?.id === task.id) setLastRemoved(null) } catch { /* Inline error. */ }
  }
  function row(task: Task) {
    return <li key={task.id} className="border-b border-border last:border-0">{editing === task.id ? <form className="grid gap-2 py-3" onSubmit={async (event) => { event.preventDefault(); if (!editTitle.trim() || busy) return; try { await mutation.mutateAsync({ type: 'task.set', payload: { id: task.id, title: editTitle.trim() } }); setEditing(null) } catch { /* Keep editing. */ } }}>
      <label className="sr-only" htmlFor={`edit-task-${task.id}`}>Modifier la tâche</label><input id={`edit-task-${task.id}`} autoFocus maxLength={200} required value={editTitle} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setEditing(null) }} disabled={busy} className="min-h-12 rounded-xl border bg-surface px-3 text-base" />
      <div className="grid grid-cols-2 gap-2"><Button type="submit" disabled={busy || !editTitle.trim()}>Enregistrer</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Annuler</Button></div>
    </form> : <div className="flex min-h-16 items-center gap-1 py-1">
      <label className="flex min-h-12 cursor-pointer items-center px-2"><span className="sr-only">{task.completed ? 'Remettre à faire' : 'Terminer'} : {task.title}</span><input type="checkbox" checked={task.completed} disabled={busy} onChange={() => mutation.mutate({ type: 'task.set', payload: { id: task.id, completed: !task.completed } })} className="h-6 w-6 accent-positive" /></label>
      <button type="button" disabled={busy} onClick={() => { setEditing(task.id); setEditTitle(task.title) }} aria-label={`Modifier ${task.title}`} className={`min-h-12 min-w-0 flex-1 py-2 text-left text-sm font-semibold break-words ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</button>
      <button type="button" disabled={busy} aria-label={`Retirer ${task.title} de la liste`} onClick={() => void remove(task)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-pastel-peach"><CloseIcon size={17} /></button>
    </div>}</li>
  }
  return <Card className="grid gap-4" radius="xl">
    <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pastel-lilac text-ink"><ListIcon size={24} /></span><div><h2 className="text-lg font-extrabold">Mes petites tâches</h2><p className="mt-1 text-xs leading-relaxed text-muted">Ta liste personnelle, retrouvée sur tes appareils.</p></div></div>
    {tasks.isPending ? <p role="status" className="py-3 text-sm text-muted">On retrouve ta liste…</p> : tasks.isError && !tasks.data ? <div className="grid gap-3"><p role="alert" className="text-sm text-negative">Impossible de charger ta liste.</p><Button variant="secondary" onClick={() => void tasks.refetch()}>Réessayer</Button></div> : <>
      <div className="rounded-2xl bg-pastel-sage px-4 py-3"><p className="text-sm font-bold">{remaining.length ? `${remaining.length} petite${remaining.length > 1 ? 's' : ''} chose${remaining.length > 1 ? 's' : ''} à faire` : completed.length ? 'Tout est coché. Une chose de moins en tête.' : 'Une chose en tête ? Pose-la ici.'}</p>{active.length > 0 && <progress aria-label="Avancement de mes tâches" max={active.length} value={completed.length} className="mt-3 h-1.5 w-full" />}</div>
      {tasks.isError && <p role="status" className="text-xs text-negative">La mise à jour est indisponible. <button className="min-h-11 font-bold underline" onClick={() => void tasks.refetch()}>Réessayer</button></p>}
      <form onSubmit={add} className="flex items-center gap-2"><label className="sr-only" htmlFor="new-personal-task">Nouvelle tâche</label><input ref={input} id="new-personal-task" maxLength={200} required autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} placeholder="Ex. Prendre un rendez-vous…" className="min-h-12 min-w-0 flex-1 rounded-[14px] border bg-bg px-3 text-base" /><Button type="submit" disabled={busy || !title.trim()} aria-label="Ajouter la tâche" className="h-12! w-12 shrink-0 px-0!"><PlusIcon size={22} /></Button></form>
      {error && <p role="alert" className="text-xs text-negative">{error}</p>}
      {remaining.length > 0 && <ul aria-label="Tâches à faire">{remaining.map(row)}</ul>}
      {!active.length && <p className="text-xs leading-relaxed text-muted">Une idée, un appel, un petit rappel… Ajoute ce qui compte pour toi.</p>}
      {completed.length > 0 && <details className="rounded-2xl bg-bg px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Terminées · {completed.length}</summary><ul aria-label="Tâches terminées">{completed.map(row)}</ul><p className="pb-3 text-xs text-muted">Décoche pour remettre à faire, ou touche × pour ranger.</p></details>}
      {lastRemoved && archived.some((task) => task.id === lastRemoved.id) && <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-pastel-peach px-3 text-xs"><span>Tâche retirée de la liste.</span><button type="button" disabled={busy} className="min-h-11 font-bold underline" onClick={() => void restore(lastRemoved)}>Annuler</button></div>}
      {archived.length > 0 && <details><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-muted">Retirées de la liste · {archived.length}</summary><ul className="grid gap-2 pb-2" aria-label="Tâches retirées">{archived.map((task) => <li key={task.id} className="flex items-center gap-3 rounded-xl bg-bg px-3"><span className="min-w-0 flex-1 text-xs break-words">{task.title}</span><button type="button" disabled={busy} onClick={() => void restore(task)} aria-label={`Remettre ${task.title} dans la liste`} className="min-h-11 shrink-0 text-xs font-bold text-positive">Remettre</button></li>)}</ul></details>}
    </>}
  </Card>
}

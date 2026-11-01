import type { FoodProfile, MealCategory } from './assistant'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import { useAuthStore, useCoupleStore, useToastStore } from '../../lib/stores'

export const AISLES = { produce: 'Fruits & légumes', meat: 'Viande & poisson', dairy: 'Frais & crémerie', pantry: 'Épicerie', frozen: 'Surgelés', other: 'Autres' } as const
export const UNITS = { g: 'g', kg: 'kg', ml: 'ml', l: 'l', piece: 'pièce(s)' } as const
export interface FoodReference { source: 'openfoodfacts'; type: 'ingredient' | 'product'; id: string }
export interface Ingredient { name: string; quantity: number; unit: keyof typeof UNITS; aisle: keyof typeof AISLES; reference?: FoodReference | null }
export interface Recipe { id: string; title: string; servings: number; minutes: number; instructions: string; authorId: number; source: 'personal' | 'app'; ingredients: Ingredient[]; category?: MealCategory | null; categorySource?: 'user' | 'ai' | null; categoryReason?: string | null; origin?: 'ai' | null; equipment?: string[] }
export interface Meal { date: string; slot: 'lunch' | 'dinner'; recipeId: string; servings: number; category?: MealCategory | null }
export interface ShoppingItem extends Ingredient { id: string; checked: boolean; week: string | null }
export interface Household { recipes: Recipe[]; meals: Record<string, Meal>; shopping: ShoppingItem[]; revision: number; foodProfile?: FoodProfile }
interface Command { id: string; type: string; payload: Record<string, unknown> }
const listeners = new Set<() => void>()
const flushing = new Set<string>()
const subscribe = (listener: () => void) => { listeners.add(listener); window.addEventListener('storage', listener); return () => { listeners.delete(listener); window.removeEventListener('storage', listener) } }
function readCache(key: string): Household | undefined {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : undefined } catch { return undefined }
}
function saveCache(key: string, value: Household) {
  if (value.revision >= (readCache(key)?.revision ?? -1)) localStorage.setItem(key, JSON.stringify(value))
}
function readQueue(key: string): Command[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}
function writeQueue(key: string, value: Command[]) {
  localStorage.setItem(key, JSON.stringify(value)); listeners.forEach((listener) => listener())
}
export function useHousehold() {
  const coupleId = useCoupleStore((s) => s.couple?.id)
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const key = `prorata-household-${coupleId}-${userId}`
  const queueKey = `${key}-pending`
  const rawPending = useSyncExternalStore(subscribe, () => localStorage.getItem(queueKey) ?? '[]')
  const pending = useMemo<Command[]>(() => { try { return JSON.parse(rawPending) } catch { return [] } }, [rawPending])
  const queryKey = ['household', coupleId, userId]
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = readCache(key)
        if (cached) return cached
      }
      const data = await apiFetch<Household>('/household', { cache: 'no-store' })
      saveCache(key, data)
      return data
    },
    initialData: () => readCache(key),
    initialDataUpdatedAt: 0,
    enabled: !!coupleId && !!userId,
    refetchInterval: 10000,
    structuralSharing: (old, next) => {
      const previous = old as Household | undefined
      const incoming = next as Household
      return previous && previous.revision > incoming.revision ? previous : incoming
    },
  })
  useEffect(() => {
    async function flush() {
      if (flushing.has(key) || !navigator.onLine || !coupleId || !userId) return
      flushing.add(key)
      try {
        for (const command of readQueue(queueKey)) {
          const data = await apiFetch<Household>('/household/commands', { method: 'POST', body: JSON.stringify(command) })
          saveCache(key, data)
          queryClient.setQueryData(['household', coupleId, userId], data)
          writeQueue(queueKey, readQueue(queueKey).filter((c) => c.id !== command.id))
        }
      } catch { /* Keep the outbox intact; retry after connectivity returns. */ }
      finally { flushing.delete(key) }
    }
    void flush()
    const timer = window.setInterval(() => void flush(), 10000)
    window.addEventListener('online', flush)
    return () => { clearInterval(timer); window.removeEventListener('online', flush) }
  }, [key, queueKey, coupleId, userId, queryClient, rawPending])

  async function send(type: string, payload: Record<string, unknown>) {
    try {
      if (!navigator.onLine) throw new Error('Reconnectez-vous pour enregistrer cette modification. Les cases des courses restent disponibles hors connexion.')
      const data = await apiFetch<Household>('/household/commands', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), type, payload }) })
      saveCache(key, data)
      queryClient.setQueryData(queryKey, data)
      return data
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Enregistrement impossible', 'error')
      throw error
    }
  }
  function check(item: ShoppingItem) {
    try {
      writeQueue(queueKey, [...readQueue(queueKey), { id: crypto.randomUUID(), type: 'shopping.check', payload: { id: item.id, checked: !item.checked } }])
    } catch { showToast('Impossible de conserver la modification sur cet appareil.', 'error') }
  }
  const data = useMemo(() => {
    if (!query.data) return undefined
    const shopping = query.data.shopping.map((item) => {
      const update = pending.filter((c) => c.payload.id === item.id).at(-1)
      return update ? { ...item, checked: update.payload.checked as boolean } : item
    })
    return { ...query.data, shopping }
  }, [query.data, pending])
  return { ...query, data, send, check, pendingCount: pending.length }
}

export function weekDates(offset = 0) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - (date.getDay() + 6) % 7 + offset * 7)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date); day.setDate(date.getDate() + index)
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  })
}
export function displayDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric' }) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', options)
}
export function quantityLabel(item: Ingredient) { return `${Number(item.quantity.toFixed(3)).toLocaleString('fr-FR')} ${UNITS[item.unit]}` }

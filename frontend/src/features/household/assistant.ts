import { apiFetch } from '../../lib/api'
import type { Household, Ingredient, Meal, Recipe } from './household'

export const MEAL_CATEGORIES = { everyday: 'Quotidien', balanced: 'Équilibré', pleasure: 'Plaisir', joker: 'Joker' } as const
export type MealCategory = keyof typeof MEAL_CATEGORIES
export interface PantryItem extends Ingredient { id?: string; expiresOn: string | null }
export interface FoodProfile {
  servings: number; maxMinutes: number; weeklyBudgetCents: number | null
  diet: 'omnivore' | 'vegetarian' | 'pescatarian' | 'vegan'
  allergies: string[]; dislikes: string[]; favorites: string[]; equipment: string[]
  habits: string; jokerIdeas: string[]; pantry: PantryItem[]
}
export const DEFAULT_PROFILE: FoodProfile = { servings: 2, maxMinutes: 30, weeklyBudgetCents: null, diet: 'omnivore', allergies: [], dislikes: [], favorites: [], equipment: [], habits: '', jokerIdeas: ['Raviolis en conserve', 'Pizza surgelée'], pantry: [] }
export const DIETS = { omnivore: 'Omnivore', vegetarian: 'Végétarien', pescatarian: 'Pescétarien', vegan: 'Végétalien' } as const
export const EQUIPMENT = ['Plaques de cuisson', 'Four', 'Micro-ondes', 'Air fryer', 'Mixeur', 'Autocuiseur']
export interface SuggestedMeal extends Omit<Recipe, 'id' | 'authorId' | 'source'> {
  date: string; slot: Meal['slot']; category: MealCategory; existingRecipeId: string | null
  equipment: string[]; pantryAllocations?: { name: string; quantity: number; unit: Ingredient['unit'] }[]; reason: string; pantryUsed: string[]; estimatedCostCents: number | null
}
export interface Proposal {
  summary: string; warnings: string[]; assumptions: string[]; optimizationTips: string[]; questions: string[]
  meals: SuggestedMeal[]
  context: { retrievedRecipes: { id: string; title: string }[]; recentMealsCount: number; pantryItemsCount: number; profileUsed: boolean }
}
export interface AssistantDraft { id: string; proposal: Proposal; model: string; createdAt: string }
export interface AssistantStatus { enabled: boolean; model: string; dailyLimit: number; remaining: number; draft: AssistantDraft | null }
export interface AssistantRequest { id: string; slots: { date: string; slot: Meal['slot'] }[]; mix: Record<MealCategory, number>; instructions: string; budgetCents: number | null; servings?: number }
export const assistantApi = {
  classify: (request: { id: string; recipe: { title: string; servings: number; minutes: number; instructions: string; ingredients: Ingredient[] } }) => apiFetch<{ id: string; category: MealCategory | null; reason: string; confidence: 'low' | 'medium' | 'high' }>('/household/assistant/classify', { method: 'POST', body: JSON.stringify(request) }),
  status: () => apiFetch<AssistantStatus>('/household/assistant', { cache: 'no-store' }),
  generate: (request: AssistantRequest) => apiFetch<AssistantDraft>('/household/assistant/proposals', { method: 'POST', body: JSON.stringify(request) }),
  replace: (id: string, request: { date: string; slot: Meal['slot']; recipeId: string }) => apiFetch<AssistantDraft>(`/household/assistant/proposals/${encodeURIComponent(id)}/replace`, { method: 'POST', body: JSON.stringify(request) }),
  accept: (id: string, createShoppingList = false) => apiFetch<Household>(`/household/assistant/proposals/${encodeURIComponent(id)}/accept`, { method: 'POST', body: JSON.stringify({ createShoppingList }) }),
}
export function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function datesFrom(start: string) { return Array.from({ length: 7 }, (_, i) => { const d = new Date(`${start}T12:00:00`); d.setDate(d.getDate() + i); return dateKey(d) }) }
export function defaultMix(count: number): Record<MealCategory, number> {
  const joker = count >= 4 ? 1 : 0
  const pleasure = count >= 3 ? 1 : 0
  const balanced = Math.floor((count - joker - pleasure) / 2)
  return { everyday: count - joker - pleasure - balanced, balanced, pleasure, joker }
}

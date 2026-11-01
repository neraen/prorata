import { apiFetch } from '../../lib/api'
import type { Ingredient } from './household'

export interface PhotoFood extends Omit<Ingredient, 'quantity'> { quantity: number | null; confidence: 'low' | 'medium' | 'high'; note: string }
export interface PantryPhotoResult { id: string; items: PhotoFood[]; warnings: string[]; model: string }
export function inspectPantryPhoto(id: string, image: string) {
  return apiFetch<PantryPhotoResult>('/household/assistant/pantry-photo', { method: 'POST', body: JSON.stringify({ id, image }) })
}

// Resize and re-encode locally: no EXIF/location metadata or original file is sent.
export async function preparePantryPhoto(file: File): Promise<string> {
  if (file.size > 20000000) throw new Error('Cette photo dépasse 20 Mo. Choisis une image plus petite.')
  if (!file.type.startsWith('image/')) throw new Error('Choisis une photo.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Impossible de préparer la photo sur cet appareil.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    let data = canvas.toDataURL('image/jpeg', 0.82)
    if (data.length > 2400000) data = canvas.toDataURL('image/jpeg', 0.55)
    if (data.length > 2400000) throw new Error('Cette photo reste trop volumineuse. Essaie un cadrage plus serré.')
    return data
  } catch (error) {
    if (error instanceof Error && error.name !== 'EncodingError') throw error
    throw new Error('Photo illisible sur cet appareil. Essaie un fichier JPEG ou PNG.')
  } finally { URL.revokeObjectURL(url) }
}

import type { Day } from '../lib/schedule'
import { request } from './client'

export type ItemType = 'lecture' | 'lab'

export interface ScheduleItemInput {
  title: string
  color: string
  days: Day[]
  /** 24-hour "HH:MM" or "HH:MM:SS" */
  start_time: string
  end_time: string
  types: ItemType[]
  instructor?: string | null
  location?: string | null
}

export interface ScheduleItem extends ScheduleItemInput {
  id: number
}

export function listItems() {
  return request<ScheduleItem[]>('/items')
}

export function createItem(input: ScheduleItemInput) {
  return request<ScheduleItem>('/items', { method: 'POST', body: JSON.stringify(input) })
}

export function updateItem(id: number, input: ScheduleItemInput) {
  return request<ScheduleItem>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteItem(id: number) {
  return request<void>(`/items/${id}`, { method: 'DELETE' })
}

export function deleteAllItems() {
  return request<void>('/items', { method: 'DELETE' })
}

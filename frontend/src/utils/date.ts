import { format, parseISO, formatDistanceToNow, addMinutes, isAfter, isBefore } from 'date-fns'
import { id } from 'date-fns/locale'

export function formatDate(dateString: string, pattern = 'dd MMM yyyy'): string {
  return format(parseISO(dateString), pattern, { locale: id })
}

export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), 'dd MMM yyyy HH:mm', { locale: id })
}

export function formatTime(dateString: string): string {
  return format(parseISO(dateString), 'HH:mm', { locale: id })
}

export function timeAgo(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true, locale: id })
}

export function addMinutesToDate(dateString: string, minutes: number): string {
  return addMinutes(parseISO(dateString), minutes).toISOString()
}

export function isDateAfter(date1: string, date2: string): boolean {
  return isAfter(parseISO(date1), parseISO(date2))
}

export function isDateBefore(date1: string, date2: string): boolean {
  return isBefore(parseISO(date1), parseISO(date2))
}

export function getCurrentISOString(): string {
  return new Date().toISOString()
}

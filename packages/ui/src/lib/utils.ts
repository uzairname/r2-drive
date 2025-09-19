import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates a string to a specified maximum length, showing both start and end with ellipsis in the middle
 * @param str - The string to truncate
 * @param maxLength - Maximum length of the string (default: 50)
 * @returns The truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str
  }

  const ellipsis = '...'
  const availableLength = maxLength - ellipsis.length
  const startLength = Math.ceil(availableLength * 0.6) // Show more of the beginning
  const endLength = Math.floor(availableLength * 0.4) // Show less of the end

  return str.slice(0, startLength) + ellipsis + str.slice(-endLength)
}

/**
 * Result type for consistent error handling across the application.
 * Provides a standardized way to handle success and failure cases.
 */
export type Result<T = void, E = Error> =
  | (T extends void ? { success: true; data?: void } : { success: true; data: T })
  | { success: false; error: E }

/**
 * Creates a successful result
 */
export function ok(): Result<void, never>
export function ok<T>(data: T): Result<T, never>
export function ok<T>(data?: T): Result<T, never> {
  return { success: true, data } as Result<T, never>
}

/**
 * Creates a failed result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error: error }
}

export function makeError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

/**
 * Safely executes an async function and wraps the result
 */
export async function safeAsync<T>(fn: () => Promise<T>, log = true): Promise<Result<T, Error>> {
  try {
    const data = await fn()
    return ok(data)
  } catch (error) {
    if (log) {
      console.error(error)
    }
    return err(makeError(error))
  }
}

/**
 * Safely executes a synchronous function and wraps the result
 */
export function safe<T>(fn: () => T): Result<T, Error> {
  try {
    const data = fn()
    return ok(data)
  } catch (error) {
    return err(makeError(error))
  }
}

/**
 * Ensures that a value is not `null` or `undefined`.
 * Throws an error if the value is `null` or `undefined`.
 *
 * @typeParam T - The type of the value to check.
 * @param value - The value to check for non-nullability.
 * @param description - Optional description to include in the error message.
 * @returns The non-nullable value.
 * @throws {Error} If the value is `null` or `undefined`.
 */
export function nonNullable<T>(value: T, description?: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`${description ?? 'Value'} is null or undefined`)
  }
  return value
}
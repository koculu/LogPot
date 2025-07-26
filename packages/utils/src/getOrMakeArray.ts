/**
 * Normalize a value into an array.
 *
 * - If the input is `null` or `undefined`, returns an empty array.
 * - If the input is already an array, returns it unchanged.
 * - Otherwise, returns a new array containing the input as its sole element.
 *
 * @typeParam T - The type of the input value.
 * @param value - The value to normalize.
 * @returns An array representation of the input value.
 *
 * @example
 * getOrMakeArray(5);        // [5]
 * getOrMakeArray([1, 2]);   // [1, 2]
 * getOrMakeArray(null);     // []
 * getOrMakeArray(undefined);     // []
 */
export function getOrMakeArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == undefined) return []
  if (Array.isArray(value)) return value
  return [value]
}

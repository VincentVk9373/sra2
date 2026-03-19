/**
 * Damage Box Utilities for SRA2
 *
 * Pure functions for operating on damage box arrays (light[] and severe[]).
 * Extracted from combat-helpers.ts to eliminate triple duplication across
 * ICE / vehicle / character damage application.
 *
 * These functions mutate the array in-place and return a boolean indicating
 * whether the application succeeded, so callers can handle overflow.
 */

/**
 * Fill the first empty (false) slot in a damage box array.
 * Mutates the array in place.
 *
 * @returns true if a slot was found and filled, false if all slots are already full (overflow)
 */
export function fillFirstEmptyBox(boxes: boolean[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    if (!boxes[i]) {
      boxes[i] = true;
      return true;
    }
  }
  return false;
}

/**
 * Check whether all boxes in an array are filled.
 */
export function allBoxesFull(boxes: boolean[]): boolean {
  return boxes.length > 0 && boxes.every((b) => b === true);
}

/**
 * Count the number of filled (true) boxes.
 */
export function countFilledBoxes(boxes: boolean[]): number {
  return boxes.filter(Boolean).length;
}

/**
 * Reset all boxes in an array to false (clear all damage of a severity).
 * Returns a new array, does not mutate.
 */
export function clearBoxes(boxes: boolean[]): boolean[] {
  return boxes.map(() => false);
}

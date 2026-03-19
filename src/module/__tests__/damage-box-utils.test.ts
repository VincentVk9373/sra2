import { describe, it, expect } from 'vitest';
import {
  fillFirstEmptyBox,
  allBoxesFull,
  countFilledBoxes,
  clearBoxes,
} from '../helpers/damage-box-utils.js';

// ─────────────────────────────────────────────────────────
// fillFirstEmptyBox
// ─────────────────────────────────────────────────────────
describe('fillFirstEmptyBox', () => {
  it('fills the first false slot and returns true', () => {
    const boxes = [false, false];
    const result = fillFirstEmptyBox(boxes);
    expect(result).toBe(true);
    expect(boxes[0]).toBe(true);
    expect(boxes[1]).toBe(false); // only first slot touched
  });

  it('skips already-filled (true) slots', () => {
    const boxes = [true, false, false];
    fillFirstEmptyBox(boxes);
    expect(boxes[0]).toBe(true);
    expect(boxes[1]).toBe(true); // second slot filled
    expect(boxes[2]).toBe(false);
  });

  it('returns false when all slots are full (overflow)', () => {
    const boxes = [true, true, true];
    const result = fillFirstEmptyBox(boxes);
    expect(result).toBe(false);
    expect(boxes).toEqual([true, true, true]); // unchanged
  });

  it('returns false for an empty array', () => {
    expect(fillFirstEmptyBox([])).toBe(false);
  });

  it('mutates the original array in place', () => {
    const boxes = [false];
    fillFirstEmptyBox(boxes);
    expect(boxes[0]).toBe(true);
  });

  it('fills sequentially when called multiple times', () => {
    const boxes = [false, false, false];
    fillFirstEmptyBox(boxes);
    fillFirstEmptyBox(boxes);
    expect(boxes[0]).toBe(true);
    expect(boxes[1]).toBe(true);
    expect(boxes[2]).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
// allBoxesFull
// ─────────────────────────────────────────────────────────
describe('allBoxesFull', () => {
  it('returns true when every slot is true', () => {
    expect(allBoxesFull([true, true, true])).toBe(true);
  });

  it('returns false when at least one slot is false', () => {
    expect(allBoxesFull([true, false, true])).toBe(false);
  });

  it('returns false for an all-false array', () => {
    expect(allBoxesFull([false, false])).toBe(false);
  });

  it('returns false for an empty array', () => {
    expect(allBoxesFull([])).toBe(false);
  });

  it('returns true for a single-element full array', () => {
    expect(allBoxesFull([true])).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// countFilledBoxes
// ─────────────────────────────────────────────────────────
describe('countFilledBoxes', () => {
  it('returns 0 for an all-false array', () => {
    expect(countFilledBoxes([false, false, false])).toBe(0);
  });

  it('returns the count of true slots', () => {
    expect(countFilledBoxes([true, false, true])).toBe(2);
  });

  it('returns array length when all slots are true', () => {
    expect(countFilledBoxes([true, true, true])).toBe(3);
  });

  it('returns 0 for an empty array', () => {
    expect(countFilledBoxes([])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// clearBoxes
// ─────────────────────────────────────────────────────────
describe('clearBoxes', () => {
  it('returns a new array of all false values', () => {
    const result = clearBoxes([true, true, false]);
    expect(result).toEqual([false, false, false]);
  });

  it('does not mutate the original array', () => {
    const original = [true, true];
    clearBoxes(original);
    expect(original).toEqual([true, true]);
  });

  it('returns an empty array when input is empty', () => {
    expect(clearBoxes([])).toEqual([]);
  });

  it('preserves the array length', () => {
    const result = clearBoxes([true, false, true, false]);
    expect(result).toHaveLength(4);
  });
});

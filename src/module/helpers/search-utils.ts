/**
 * Shared search input utilities for character sheets.
 * Provides debounced input handling and focus/blur visibility management
 * shared between character-sheet.ts and character-sheet-v2.ts.
 */

/**
 * Applies debounced search logic for a search input event.
 * - If `searchTerm` is empty, hides `resultsDiv` and returns immediately.
 * - Otherwise, clears any previous pending timeout and schedules `perform`
 *   after `delay` ms, storing the new timeout id in `timeoutRef.current`.
 *
 * Usage:
 *   this.searchTimeout = debounceSearchInput(
 *     this.searchTimeout, searchTerm, resultsDiv, DELAYS.SEARCH_DEBOUNCE,
 *     async () => this._performSearch(searchTerm, resultsDiv)
 *   );
 */
export function debounceSearchInput(
  currentTimeout: ReturnType<typeof setTimeout> | null,
  searchTerm: string,
  resultsDiv: HTMLElement,
  delay: number,
  perform: () => Promise<void>
): ReturnType<typeof setTimeout> | null {
  if (currentTimeout) clearTimeout(currentTimeout);
  if (searchTerm.length === 0) {
    resultsDiv.style.display = 'none';
    return null;
  }
  return setTimeout(perform, delay);
}

/**
 * Shows the results div on focus if the input already has content and
 * the results div already has rendered HTML.
 */
export function handleSearchFocus(input: HTMLInputElement, resultsDiv: HTMLElement): void {
  if (input.value.trim().length > 0 && resultsDiv && resultsDiv.innerHTML.trim().length > 0) {
    resultsDiv.style.display = 'block';
  }
}

/**
 * Hides the results div after `hideDelay` ms, unless focus has moved into
 * the results div (checked via `relatedTarget` and `document.activeElement`).
 */
export function handleSearchBlur(
  relatedTarget: HTMLElement | null,
  resultsDiv: HTMLElement,
  hideDelay: number
): void {
  setTimeout(() => {
    if (!resultsDiv) return;
    if (relatedTarget && resultsDiv.contains(relatedTarget)) return;
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && resultsDiv.contains(activeElement)) return;
    resultsDiv.style.display = 'none';
  }, hideDelay);
}

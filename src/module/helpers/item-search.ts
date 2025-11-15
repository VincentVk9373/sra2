/**
 * Shared Item Search Utilities for SRA2
 * This module contains common item search functions used across character sheets, NPC sheets, and item sheets.
 */

/**
 * Normalize text for search: lowercase and remove accents/special characters
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Search result interface
 */
export interface SearchResult {
  name: string;
  uuid: string;
  source: string;
  type: string;
  id?: string;
  alreadyExists?: boolean;
}

/**
 * Search for items in world items
 */
export function searchItemsInWorld(
  itemType: string,
  searchTerm: string,
  existingItemsCheck?: (itemName: string) => boolean
): SearchResult[] {
  const results: SearchResult[] = [];
  
  if (!game.items) return results;
  
  for (const item of game.items as any) {
    if (item.type === itemType && normalizeSearchText(item.name).includes(searchTerm)) {
      const alreadyExists = existingItemsCheck ? existingItemsCheck(item.name) : false;
      
      results.push({
        name: item.name,
        uuid: item.uuid,
        id: item.id,
        source: game.i18n!.localize('SRA2.SKILLS.WORLD_ITEMS'),
        type: itemType,
        alreadyExists
      });
    }
  }
  
  return results;
}

/**
 * Search for items in actor's items
 */
export function searchItemsOnActor(
  actor: any,
  itemType: string,
  searchTerm: string
): SearchResult[] {
  const results: SearchResult[] = [];
  
  if (!actor) return results;
  
  for (const item of actor.items as any) {
    if (item.type === itemType && normalizeSearchText(item.name).includes(searchTerm)) {
      results.push({
        name: item.name,
        uuid: item.uuid,
        id: item.id,
        source: game.i18n!.localize('SRA2.FEATS.FROM_ACTOR'),
        type: itemType
      });
    }
  }
  
  return results;
}

/**
 * Search for items in all compendiums
 */
export async function searchItemsInCompendiums(
  itemType: string,
  searchTerm: string,
  existingItemsCheck?: (itemName: string) => boolean
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const seenNames = new Set<string>();
  
  // Search in all compendiums
  for (const pack of game.packs as any) {
    // Only search in Item compendiums
    if (pack.documentName !== 'Item') continue;
    
    // Get all documents from the pack
    const documents = await pack.getDocuments();
    
    // Filter for items that match the search term and type
    for (const doc of documents) {
      if (doc.type === itemType && normalizeSearchText(doc.name).includes(searchTerm)) {
        // Check if not already in results (by name)
        if (seenNames.has(doc.name)) continue;
        seenNames.add(doc.name);
        
        const alreadyExists = existingItemsCheck ? existingItemsCheck(doc.name) : false;
        
        results.push({
          name: doc.name,
          uuid: doc.uuid,
          source: pack.title,
          type: itemType,
          alreadyExists
        });
      }
    }
  }
  
  return results;
}

/**
 * Perform a complete search across actor, world, and compendiums
 */
export async function searchItemsEverywhere(
  itemType: string,
  searchTerm: string,
  actor?: any,
  existingItemsCheck?: (itemName: string) => boolean
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const seenNames = new Set<string>();
  
  // 1. Search in actor items if provided
  if (actor) {
    const actorResults = searchItemsOnActor(actor, itemType, searchTerm);
    actorResults.forEach(result => {
      results.push(result);
      seenNames.add(result.name);
    });
  }
  
  // 2. Search in world items
  const worldResults = searchItemsInWorld(itemType, searchTerm, existingItemsCheck);
  worldResults.forEach(result => {
    if (!seenNames.has(result.name)) {
      results.push(result);
      seenNames.add(result.name);
    }
  });
  
  // 3. Search in compendiums
  const compendiumResults = await searchItemsInCompendiums(itemType, searchTerm, existingItemsCheck);
  compendiumResults.forEach(result => {
    if (!seenNames.has(result.name)) {
      results.push(result);
      seenNames.add(result.name);
    }
  });
  
  return results;
}

/**
 * Build HTML for search results display
 */
export interface DisplaySearchResultsOptions {
  results: SearchResult[];
  lastSearchTerm: string;
  noResultsMessage: string;
  typeLabel: string;
  onAddCallback?: (result: SearchResult) => void;
}

export function buildSearchResultsHtml(options: DisplaySearchResultsOptions): string {
  const { results, lastSearchTerm, noResultsMessage, typeLabel } = options;
  
  // Check if there's a perfect match (case-insensitive and accent-insensitive)
  const normalizedLastSearch = normalizeSearchText(lastSearchTerm);
  const exactMatch = results.find(r => normalizeSearchText(r.name) === normalizedLastSearch);
  
  let html = '';
  
  if (results.length === 0) {
    html = `
      <div class="search-result-item no-results">
        <div class="no-results-text">
          ${noResultsMessage}
        </div>
      </div>
    `;
  } else {
    // If we have an exact match, highlight it at the top
    if (exactMatch) {
      html += buildSingleResultHtml(exactMatch, typeLabel, true);
    }
    
    // Display other search results
    const otherResults = exactMatch 
      ? results.filter(r => r.name !== exactMatch.name)
      : results;
    
    for (const result of otherResults) {
      html += buildSingleResultHtml(result, typeLabel, false);
    }
  }
  
  return html;
}

/**
 * Build HTML for a single search result
 */
function buildSingleResultHtml(result: SearchResult, typeLabel: string, isExactMatch: boolean): string {
  const alreadyExistsClass = result.alreadyExists ? 'already-exists' : '';
  const exactMatchClass = isExactMatch ? 'exact-match' : '';
  
  let html = `
    <div class="search-result-item ${alreadyExistsClass} ${exactMatchClass}" 
         data-result-name="${result.name}" 
         data-result-uuid="${result.uuid}">
      <div class="result-info">
        <span class="result-name">${result.name}</span>
        <span class="result-pack">${result.source} - ${typeLabel}</span>
      </div>
  `;
  
  if (result.alreadyExists) {
    html += `
      <span class="already-exists-label">
        ${game.i18n!.localize('SRA2.SKILLS.ALREADY_EXISTS')}
      </span>
    `;
  } else {
    html += `
      <button class="add-item-btn" 
              data-item-name="${result.name}" 
              data-item-uuid="${result.uuid}">
        ${game.i18n!.localize('SRA2.SKILLS.ADD')}
      </button>
    `;
  }
  
  html += `</div>`;
  
  return html;
}

/**
 * Create a debounced search function
 */
export function createDebouncedSearch(
  searchFunction: (searchTerm: string) => Promise<void>,
  delay: number = 300
): (searchTerm: string) => void {
  let timeoutId: any = null;
  
  return (searchTerm: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(async () => {
      await searchFunction(searchTerm);
    }, delay);
  };
}

/**
 * Show or hide search results container
 */
export function toggleSearchResults(resultsDiv: HTMLElement, show: boolean): void {
  if (show) {
    resultsDiv.style.display = 'block';
  } else {
    resultsDiv.style.display = 'none';
  }
}

/**
 * Check if an item already exists on an actor
 */
export function itemExistsOnActor(actor: any, itemType: string, itemName: string): boolean {
  if (!actor) return false;
  
  return actor.items.some((item: any) => 
    item.type === itemType && item.name === itemName
  );
}

/**
 * Add an item to an actor from UUID
 */
export async function addItemToActorFromUuid(actor: any, itemUuid: string): Promise<boolean> {
  try {
    const item = await fromUuid(itemUuid as any);
    if (!item) {
      ui.notifications?.error(game.i18n!.localize('SRA2.SKILLS.ITEM_NOT_FOUND'));
      return false;
    }
    
    // Check if item already exists
    if (itemExistsOnActor(actor, (item as any).type, (item as any).name)) {
      ui.notifications?.warn(game.i18n!.format('SRA2.ALREADY_EXISTS', { name: (item as any).name }));
      return false;
    }
    
    // Add the item to the actor
    await actor.createEmbeddedDocuments('Item', [(item as any).toObject()]);
    ui.notifications?.info(game.i18n!.format('SRA2.SKILLS.ADDED', { name: (item as any).name }));
    
    return true;
  } catch (error) {
    console.error('SRA2 | Error adding item to actor:', error);
    ui.notifications?.error(game.i18n!.localize('SRA2.SKILLS.ERROR_ADDING'));
    return false;
  }
}


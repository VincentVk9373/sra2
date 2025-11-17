/**
 * Shared Dice Rolling Utilities for SRA2
 * This module contains common dice rolling functions used across character sheets, NPC sheets, and item sheets.
 */

/**
 * RR source information
 */
export interface RRSource {
  featName: string;
  rrValue: number;
}

/**
 * Risk reduction constants
 */
export const RISK_DICE_BY_RR = [2, 5, 8, 12];

export const RISK_THRESHOLDS = {
  0: { normal: 2, fort: 4, extreme: 6 },
  1: { normal: 5, fort: 7, extreme: 9 },
  2: { normal: 8, fort: 11, extreme: 13 },
  3: { normal: 12, fort: 15, extreme: 999 }
};

/**
 * Get risk dice count based on RR level
 */
export function getRiskDiceByRR(rr: number): number {
  return RISK_DICE_BY_RR[Math.min(3, Math.max(0, rr))] || 2;
}

/**
 * Get RR sources from an actor for a specific item type and name
 * This is the main function used by most sheets for their own actor
 */
export function getRRSources(
  actor: any,
  itemType: 'skill' | 'specialization' | 'attribute',
  itemName: string
): RRSource[] {
  const sources: RRSource[] = [];
  
  // Get all active feats from the actor
  const feats = actor.items.filter((item: any) => 
    item.type === 'feat' && 
    item.system.active === true
  );
  
  // Calculate RR from feats that target this item
  for (const feat of feats) {
    const featSystem = feat.system as any;
    const rrList = featSystem.rrList || [];
    
    // Loop through all RR entries in this feat
    for (const rrEntry of rrList) {
      const rrType = rrEntry.rrType;
      const rrValue = rrEntry.rrValue || 0;
      const rrTarget = rrEntry.rrTarget || '';
      
      // Check if this RR entry provides RR for the given item
      if (rrType === itemType && rrTarget === itemName && rrValue > 0) {
        sources.push({
          featName: feat.name,
          rrValue: rrValue
        });
      }
    }
  }
  
  return sources;
}

/**
 * Get RR sources from any actor for a specific item type and name
 * This is useful for defense rolls where we need to check another actor's RR
 * (identical to getRRSources but kept separate for clarity in combat scenarios)
 */
export function getRRSourcesForActor(
  actor: any,
  itemType: 'skill' | 'specialization' | 'attribute',
  itemName: string
): RRSource[] {
  return getRRSources(actor, itemType, itemName);
}

/**
 * Get success threshold based on roll mode
 */
export function getSuccessThreshold(mode: string): number {
  switch (mode) {
    case 'advantage': return 4;  // 4, 5, 6 = success
    case 'disadvantage': return 6; // only 6 = success
    default: return 5;  // 5, 6 = success
  }
}

/**
 * Build RR sources HTML for dialog
 */
export function buildRRSourcesHtml(rrSources: RRSource[]): string {
  if (rrSources.length === 0) return '';
  
  let html = '<div class="rr-sources"><strong>Sources RR:</strong>';
  rrSources.forEach((source) => {
    html += `
      <label class="rr-source-item">
        <input type="checkbox" class="rr-source-checkbox" data-rr-value="${source.rrValue}" checked />
        <span>${source.featName} (+${source.rrValue})</span>
      </label>`;
  });
  html += '</div>';
  
  return html;
}

/**
 * REMOVED: Roll dialog script generation
 */

/**
 * REMOVED: Roll dialog content creation
 */

/**
 * REMOVED: Dice rolling logic
 * All dice rolling and chat message functions have been removed.
 * Only UI triggers and threshold calculations remain.
 */

/**
 * REMOVED: HTML building for dice results
 */

/**
 * REMOVED: Chat message posting
 */

/**
 * REMOVED: Dialog creation for rolls
 * Dialogs and callbacks have been removed as they trigger dice rolls.
 */


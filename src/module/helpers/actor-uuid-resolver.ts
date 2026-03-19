/**
 * Actor / Token UUID resolution helpers for SRA2
 *
 * Wraps `foundry.utils.fromUuidSync` with error handling and consolidates
 * the repeated attacker/defender loading pattern used in the defense and
 * counter-attack chat-button handlers.
 */

/**
 * Safely resolve a Foundry UUID string to a document (actor or token).
 * Returns null if the UUID is empty, invalid, or resolution throws.
 */
export function resolveUuidSync(uuid: string | undefined, label?: string): any | null {
  if (!uuid) return null;
  try {
    return (foundry.utils as any)?.fromUuidSync?.(uuid) ?? null;
  } catch (e) {
    console.warn(`SRA2 | Failed to resolve UUID${label ? ` (${label})` : ''}:`, uuid, e);
    return null;
  }
}

/**
 * Resolve the UUID of a token document.
 * Handles both plain token placeables and token documents that expose `.document.uuid`.
 */
export function resolveTokenUuid(token: any, fallback?: string): string | undefined {
  if (token) return token.uuid ?? token.document?.uuid ?? undefined;
  return fallback;
}

/**
 * Determine the "canonical" actor UUID for a combatant.
 * Prefers the token's embedded actor UUID (stable across compendium imports)
 * over the bare actor UUID.
 */
export function resolveActorUuid(token: any, actor: any): string | undefined {
  return token?.actor?.uuid ?? actor?.uuid ?? undefined;
}

export interface CombatantResult {
  actor: any | null;
  token: any | null;
}

/**
 * Load actor and token from message flag UUIDs, with a canvas-search fallback.
 *
 * Resolution priority:
 *   1. `actorUuid` flag → actor via `fromUuidSync`
 *   2. `tokenUuid` flag → token via `fromUuidSync`; token.actor used as actor if missing
 *   3. `actorId` flag  → `game.actors.get(id)` + canvas token search
 *
 * @param flags.actorUuid   UUID of the actor stored in the message flags
 * @param flags.tokenUuid   UUID of the token stored in the message flags
 * @param flags.actorId     Legacy ID-based fallback
 * @param label             Label for debug logging (e.g. 'Attacker', 'Defender')
 */
export function loadCombatantFromFlags(
  flags: { actorUuid?: string; tokenUuid?: string; actorId?: string },
  label: string
): CombatantResult {
  let actor: any | null = null;
  let token: any | null = null;

  // Step 1: load actor from UUID flag
  if (flags.actorUuid) {
    actor = resolveUuidSync(flags.actorUuid, `${label} actor`);
    if (actor) {
      console.log(`SRA2 | ${label} loaded from actorUuid:`, flags.actorUuid);
    }
  }

  // Step 2: load token from UUID flag; derive actor if still missing
  if (flags.tokenUuid) {
    token = resolveUuidSync(flags.tokenUuid, `${label} token`);
    if (token?.actor && !actor) {
      actor = token.actor;
      console.log(`SRA2 | ${label} actor derived from token:`, flags.tokenUuid);
    }
  }

  // Step 3: ID-based fallback (legacy)
  if (!actor && flags.actorId) {
    actor = (game as any).actors?.get(flags.actorId) ?? null;
  }
  if (actor && !token) {
    token =
      (canvas as any)?.tokens?.placeables?.find(
        (t: any) => t.actor?.id === actor.id || t.actor?.uuid === actor.uuid
      ) ?? null;
  }

  return { actor, token };
}

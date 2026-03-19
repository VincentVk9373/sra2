import { SYSTEM } from '../config/system.js';

const SYSTEM_NAME = SYSTEM.id;
const SYSTEM_DESCRIPTION = 'Shadowrun Anarchy 2';

export const DICE_GLITCH  = `${SYSTEM.PATH.STYLE}/danger-point.webp`;
export const DICE_PROWESS = `${SYSTEM.PATH.STYLE}/anarchy-point.webp`;
export const DICE_LABELS  = [DICE_GLITCH, '2', '3', '4', DICE_PROWESS, DICE_PROWESS];

export const SRA2_NORMAL_COLORSET = 'sra2-normal';
export const SRA2_RISK_COLORSET   = 'sra2-risk';

/**
 * Register Dice So Nice custom colorsets and dice presets for SRA2.
 * Called from the diceSoNiceReady hook.
 */
export function registerDiceSoNice(dice3d: any): void {
  dice3d.addSystem({ id: SYSTEM_NAME, name: SYSTEM_DESCRIPTION }, 'preferred');

  // Normal dice: dark purple
  dice3d.addColorset({
    name: SRA2_NORMAL_COLORSET,
    description: 'SRA2 - Normal dice',
    category: SYSTEM_DESCRIPTION,
    foreground: '#faecd1',
    background: '#2a0a3a',
    outline: 'none',
    edge: '#1a0628',
    texture: 'stars',
    material: 'metal',
  });

  // Risk dice: black/fire
  dice3d.addColorset({
    name: SRA2_RISK_COLORSET,
    description: 'SRA2 - Risk dice',
    category: SYSTEM_DESCRIPTION,
    foreground: '#faecd1',
    background: '#040101',
    outline: 'none',
    edge: 'none',
    texture: 'fire',
    material: 'metal',
  });

  // Register d6 preset for the system (applies when SRA2 system is selected in DSN settings)
  dice3d.addDicePreset({
    type: 'd6',
    labels: DICE_LABELS,
    colorset: SRA2_NORMAL_COLORSET,
    system: SYSTEM_NAME,
  });
}

/**
 * Build the appearance object to pass on dice[0].options.appearance.
 * Includes labels so DSN shows custom faces regardless of the user's DSN system setting.
 */
export function buildAppearance(colorset: string): object {
  return {
    colorset,
    labels: DICE_LABELS,
  };
}

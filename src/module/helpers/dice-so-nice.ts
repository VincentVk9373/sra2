import { SYSTEM } from '../config/system.js';

const SYSTEM_NAME = SYSTEM.id;
const SYSTEM_DESCRIPTION = 'Shadowrun Anarchy 2';

const DICE_GLITCH  = `${SYSTEM.PATH.STYLE}/danger-point.webp`;
const DICE_PROWESS = `${SYSTEM.PATH.STYLE}/anarchy-point.webp`;

export const SRA2_NORMAL_COLORSET = 'sra2-normal';
export const SRA2_RISK_COLORSET   = 'sra2-risk';

/**
 * Register Dice So Nice custom colorsets and dice presets for SRA2.
 * Called from the diceSoNiceReady hook.
 */
export function registerDiceSoNice(dice3d: any): void {
  dice3d.addSystem({ id: SYSTEM_NAME, name: SYSTEM_DESCRIPTION }, 'preferred');

  // Normal dice: dark teal, 5+6 = prowess, 1 = glitch
  dice3d.addColorset({
    name: SRA2_NORMAL_COLORSET,
    description: 'SRA2 - Normal dice',
    category: SYSTEM_DESCRIPTION,
    foreground: '#faecd1',
    background: '#0a2a2a',
    outline: 'none',
    edge: 'none',
    texture: 'ice',
    material: 'metal',
  });

  // Risk dice: black/fire, 5+6 = prowess, 1 = glitch
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

  // d6 preset for normal dice: 1=glitch, 2-4=number, 5-6=prowess
  dice3d.addDicePreset({
    type: 'd6',
    labels: [DICE_GLITCH, '2', '3', '4', DICE_PROWESS, DICE_PROWESS],
    colorset: SRA2_NORMAL_COLORSET,
    system: SYSTEM_NAME,
  });

  // d6 preset for risk dice: same faces, different colorset
  dice3d.addDicePreset({
    type: 'd6',
    labels: [DICE_GLITCH, '2', '3', '4', DICE_PROWESS, DICE_PROWESS],
    colorset: SRA2_RISK_COLORSET,
    system: SYSTEM_NAME,
  });
}

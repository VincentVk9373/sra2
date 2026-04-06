/**
 * Dialog for configuring and generating random NPCs.
 * Follows the FeatChoiceDialog pattern: extends Dialog, builds HTML programmatically.
 */

import { ARCHETYPES, METATYPES, POWER_LEVELS } from '../config/npc-generator-data.js';
import { generateNPCs, type NPCGeneratorOptions } from '../helpers/npc-generator.js';

export class NPCGeneratorDialog extends Dialog {
  constructor(callback: (options: NPCGeneratorOptions) => void) {
    const content = NPCGeneratorDialog.buildContent();

    super({
      title: game.i18n!.localize('SRA2.NPC_GENERATOR.TITLE'),
      content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('SRA2.CANCEL'),
        },
        generate: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: game.i18n!.localize('SRA2.NPC_GENERATOR.GENERATE'),
          callback: (html: JQuery) => {
            const options = NPCGeneratorDialog.getOptions(html);
            callback(options);
          },
        },
      },
      default: 'generate',
    }, {
      classes: ['sra2', 'dialog', 'npc-generator-dialog'],
      width: 540,
    });
  }

  private static buildContent(): string {
    const i18n = game.i18n!;

    // Power levels
    let powerOptions = '';
    for (const [key, pl] of Object.entries(POWER_LEVELS)) {
      const selected = key === 'runner' ? 'selected' : '';
      powerOptions += `<option value="${key}" ${selected}>${pl.labelFr} (${pl.budget.toLocaleString('fr-FR')} ¥)</option>`;
    }

    // Archetypes
    let archetypeOptions = `<option value="random">${i18n.localize('SRA2.NPC_GENERATOR.RANDOM')}</option>`;
    for (const [key, arch] of Object.entries(ARCHETYPES)) {
      archetypeOptions += `<option value="${key}">${arch.labelFr}</option>`;
    }

    // Metatypes
    let metatypeOptions = `<option value="random">${i18n.localize('SRA2.NPC_GENERATOR.RANDOM')}</option>`;
    for (const [key, mt] of Object.entries(METATYPES)) {
      metatypeOptions += `<option value="${key}">${mt.nameFr}</option>`;
    }

    return `
      <form class="npc-gen-form">
        <div class="npc-gen-field">
          <label>${i18n.localize('SRA2.NPC_GENERATOR.POWER_LEVEL')}</label>
          <select name="powerLevel">${powerOptions}</select>
        </div>
        <div class="npc-gen-field">
          <label>${i18n.localize('SRA2.NPC_GENERATOR.ARCHETYPE')}</label>
          <select name="archetype">${archetypeOptions}</select>
        </div>
        <div class="npc-gen-field">
          <label>${i18n.localize('SRA2.NPC_GENERATOR.METATYPE')}</label>
          <select name="metatype">${metatypeOptions}</select>
        </div>
        <div class="npc-gen-field">
          <label>${i18n.localize('SRA2.NPC_GENERATOR.GENDER')}</label>
          <select name="gender">
            <option value="male">${i18n.localize('SRA2.NPC_GENERATOR.MALE')}</option>
            <option value="female">${i18n.localize('SRA2.NPC_GENERATOR.FEMALE')}</option>
            <option value="neutral">${i18n.localize('SRA2.NPC_GENERATOR.NEUTRAL')}</option>
          </select>
        </div>
        <div class="npc-gen-field">
          <label>${i18n.localize('SRA2.NPC_GENERATOR.COUNT')}</label>
          <input type="number" name="count" value="1" min="1" max="10" />
        </div>
      </form>
    `;
  }

  private static getOptions(html: JQuery): NPCGeneratorOptions {
    const el = html[0] as HTMLElement;
    return {
      powerLevel: (el.querySelector('[name="powerLevel"]') as HTMLSelectElement)?.value || '',
      archetype: (el.querySelector('[name="archetype"]') as HTMLSelectElement)?.value || '',
      metatype: (el.querySelector('[name="metatype"]') as HTMLSelectElement)?.value || '',
      gender: (el.querySelector('[name="gender"]') as HTMLSelectElement)?.value || '',
      count: parseInt((el.querySelector('[name="count"]') as HTMLInputElement)?.value || '1', 10) || 1,
    };
  }

  static async show(): Promise<void> {
    return new Promise((resolve) => {
      const dialog = new NPCGeneratorDialog(async (options) => {
        try {
          ui.notifications?.info(game.i18n!.localize('SRA2.NPC_GENERATOR.GENERATING'));
          const count = await generateNPCs(options);
          ui.notifications?.info(
            game.i18n!.format('SRA2.NPC_GENERATOR.SUCCESS', { count: String(count) })
          );
        } catch (err) {
          console.error('NPC Generator error:', err);
          ui.notifications?.error('Erreur lors de la génération du PNJ');
        }
        resolve();
      });

      const originalClose = dialog.close.bind(dialog);
      dialog.close = async (options?: Application.CloseOptions) => {
        resolve();
        return originalClose(options);
      };

      dialog.render(true);
    });
  }
}

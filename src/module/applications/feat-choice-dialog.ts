/**
 * Dialog for choosing which feats to activate when dropping a token with optional/choice feats
 */
export class FeatChoiceDialog extends Dialog {
  constructor(actor: Actor, optionalFeats: any[], choiceFeats: any[], numberOfChoice: number, callback: (selections: { optional: string[], choices: string[] }) => void) {
    const content = FeatChoiceDialog.buildContent(optionalFeats, choiceFeats, numberOfChoice);
    
    super({
      title: game.i18n!.localize('SRA2.FEATS.CHOICE_DIALOG_TITLE'),
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n!.localize('SRA2.CANCEL')
        },
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n!.localize('SRA2.CONFIRM'),
          callback: (html: JQuery) => {
            const selections = FeatChoiceDialog.getSelections(html, choiceFeats.length, numberOfChoice);
            if (selections) {
              callback(selections);
            }
          }
        }
      },
      default: 'confirm',
      render: (html: JQuery) => {
        FeatChoiceDialog.activateListeners(html, numberOfChoice, choiceFeats.length);
      }
    }, {
      classes: ['sra2', 'dialog', 'feat-choice-dialog'],
      width: 500,
    });

    void actor; void optionalFeats; void choiceFeats; void numberOfChoice; // constructor params received but not stored
  }

  /**
   * Build the HTML content for the dialog
   */
  private static buildContent(optionalFeats: any[], choiceFeats: any[], numberOfChoice: number): string {
    let html = '<form class="feat-choice-form">';
    
    // Optional feats section
    if (optionalFeats.length > 0) {
      html += `
        <div class="feat-choice-section optional-section">
          <h3><i class="fas fa-toggle-on"></i> ${game.i18n!.localize('SRA2.FEATS.CHOICE_DIALOG_OPTIONAL')}</h3>
          <p class="section-hint">${game.i18n!.localize('SRA2.FEATS.CHOICE_DIALOG_OPTIONAL_HINT')}</p>
          <div class="feat-list">
      `;
      
      for (const feat of optionalFeats) {
        const featTypeLabel = game.i18n!.localize(`SRA2.FEATS.FEAT_TYPE.${feat.system.featType.toUpperCase().replace('-', '_')}`);
        html += `
          <div class="feat-choice-item" data-feat-id="${feat._id}">
            <label class="feat-toggle">
              <input type="checkbox" name="optional-feat" value="${feat._id}" />
              <span class="feat-name">${feat.name}</span>
              <span class="feat-type">${featTypeLabel}</span>
            </label>
          </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    }
    
    // Choice feats section
    if (choiceFeats.length > 0) {
      const selectLabel = game.i18n!.format('SRA2.FEATS.CHOICE_DIALOG_SELECT_X', { count: String(numberOfChoice) });
      html += `
        <div class="feat-choice-section choice-section">
          <h3><i class="fas fa-list-check"></i> ${game.i18n!.localize('SRA2.FEATS.CHOICE_DIALOG_CHOICES')}</h3>
          <p class="section-hint">${selectLabel}</p>
          <p class="selection-counter">
            <span class="current-count">0</span> / <span class="max-count">${numberOfChoice}</span> ${game.i18n!.localize('SRA2.FEATS.SELECTED')}
          </p>
          <div class="feat-list">
      `;
      
      for (const feat of choiceFeats) {
        const featTypeLabel = game.i18n!.localize(`SRA2.FEATS.FEAT_TYPE.${feat.system.featType.toUpperCase().replace('-', '_')}`);
        html += `
          <div class="feat-choice-item" data-feat-id="${feat._id}">
            <label class="feat-toggle">
              <input type="checkbox" name="choice-feat" value="${feat._id}" />
              <span class="feat-name">${feat.name}</span>
              <span class="feat-type">${featTypeLabel}</span>
            </label>
          </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    }
    
    html += '</form>';
    return html;
  }

  /**
   * Activate listeners for the dialog
   */
  private static activateListeners(html: JQuery, numberOfChoice: number, choiceFeatsCount: number): void {
    const el = html[0] as HTMLElement;
    // Get the confirm button
    const dialogEl = el.closest('.dialog');
    const confirmButton = dialogEl?.querySelector('button[data-button="confirm"]') as HTMLButtonElement | null;

    // Function to update confirm button state
    const updateConfirmButton = () => {
      const checkedCount = el.querySelectorAll<HTMLInputElement>('input[name="choice-feat"]:checked').length;
      // Disable confirm if there are choices to make and not enough selected
      if (confirmButton) {
        confirmButton.disabled = (choiceFeatsCount > 0 && checkedCount !== numberOfChoice);
      }
    };

    // Initial state - disable confirm if choices are required
    if (choiceFeatsCount > 0 && numberOfChoice > 0 && confirmButton) {
      confirmButton.disabled = true;
    }

    // Update counter when choice checkboxes change
    el.querySelectorAll<HTMLInputElement>('input[name="choice-feat"]').forEach(elem => elem.addEventListener('change', () => {
      const checkedCount = el.querySelectorAll<HTMLInputElement>('input[name="choice-feat"]:checked').length;
      const currentCountEl = el.querySelector('.selection-counter .current-count');
      if (currentCountEl) currentCountEl.textContent = String(checkedCount);

      // Update visual state
      const selectionCounter = el.querySelector('.selection-counter');
      if (selectionCounter) {
        if (checkedCount === numberOfChoice) {
          selectionCounter.classList.add('complete');
        } else {
          selectionCounter.classList.remove('complete');
        }
      }

      // Disable unchecked checkboxes if max reached
      if (checkedCount >= numberOfChoice) {
        el.querySelectorAll<HTMLInputElement>('input[name="choice-feat"]:not(:checked)').forEach(cb => cb.disabled = true);
      } else {
        el.querySelectorAll<HTMLInputElement>('input[name="choice-feat"]').forEach(cb => cb.disabled = false);
      }

      // Update confirm button state
      updateConfirmButton();
    }));
  }

  /**
   * Get the selections from the dialog
   */
  private static getSelections(html: JQuery, choiceFeatsCount: number, numberOfChoice: number): { optional: string[], choices: string[] } | null {
    const el = html[0] as HTMLElement;
    const optionalSelections: string[] = [];
    const choiceSelections: string[] = [];

    // Get optional selections (checked means active)
    el.querySelectorAll<HTMLInputElement>('input[name="optional-feat"]:checked').forEach(input => {
      optionalSelections.push(input.value);
    });

    // Get choice selections
    el.querySelectorAll<HTMLInputElement>('input[name="choice-feat"]:checked').forEach(input => {
      choiceSelections.push(input.value);
    });
    
    // Validate choice count
    if (choiceFeatsCount > 0 && choiceSelections.length !== numberOfChoice) {
      ui.notifications?.warn(
        game.i18n!.format('SRA2.FEATS.CHOICE_DIALOG_WRONG_COUNT', {
          expected: String(numberOfChoice),
          actual: String(choiceSelections.length)
        })
      );
      return null;
    }
    
    return { optional: optionalSelections, choices: choiceSelections };
  }

  /**
   * Show the dialog and return a promise with the selections
   */
  static async show(actor: Actor, optionalFeats: any[], choiceFeats: any[], numberOfChoice: number): Promise<{ optional: string[], choices: string[] } | null> {
    return new Promise((resolve) => {
      const dialog = new FeatChoiceDialog(
        actor,
        optionalFeats,
        choiceFeats,
        numberOfChoice,
        (selections) => resolve(selections)
      );
      
      // Override close to resolve with null
      const originalClose = dialog.close.bind(dialog);
      dialog.close = async (options?: Application.CloseOptions) => {
        resolve(null);
        return originalClose(options);
      };
      
      dialog.render(true);
    });
  }
}




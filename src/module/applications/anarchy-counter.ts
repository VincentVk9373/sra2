import { SYSTEM } from "../config/system.ts";

/**
 * Floating popup for the Group Anarchy Counter
 * Visible to all players, controllable only by the GM
 */
export class AnarchyCounter extends Application {
  private static _instance: AnarchyCounter | null = null;
  private animationTimeout: number | null = null;
  private positionInitialized: boolean = false;

  constructor(options = {}) {
    super(options);
  }

  /**
   * Get the singleton instance
   */
  static get instance(): AnarchyCounter {
    if (!AnarchyCounter._instance) {
      AnarchyCounter._instance = new AnarchyCounter();
    }
    return AnarchyCounter._instance;
  }

  /**
   * Default application options
   */
  static get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "sra2-anarchy-counter",
      template: `systems/${SYSTEM.id}/templates/anarchy-counter.hbs`,
      popOut: true,
      minimizable: false,
      resizable: false,
      title: "SRA2.ANARCHY_COUNTER.TITLE",
      classes: ["sra2", "anarchy-counter"],
      width: 180,
      height: "auto",
    }) as ApplicationOptions;
  }

  /**
   * Get default position (bottom-left corner)
   */
  private static getDefaultPosition(): { left: number; top: number } {
    return {
      left: 20,
      top: window.innerHeight - 220,
    };
  }

  /**
   * Get saved position from localStorage or use default
   */
  private static getSavedPosition(): { left: number; top: number } {
    const saved = localStorage.getItem("sra2-anarchy-counter-position");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that we have valid numbers
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          return parsed;
        }
      } catch (e) {
        // Invalid JSON, use default
      }
    }
    return AnarchyCounter.getDefaultPosition();
  }

  /**
   * Override render to apply saved position only on first render
   */
  async _render(force?: boolean, options?: Application.RenderOptions): Promise<void> {
    await super._render(force, options);
    
    // Apply saved position only on first render
    if (!this.positionInitialized) {
      this.positionInitialized = true;
      const pos = AnarchyCounter.getSavedPosition();
      super.setPosition({ left: pos.left, top: pos.top });
    }
  }

  /**
   * Save position to localStorage (only if valid numbers)
   */
  private savePosition(): void {
    if (this.position && typeof this.position.left === 'number' && typeof this.position.top === 'number') {
      localStorage.setItem(
        "sra2-anarchy-counter-position",
        JSON.stringify({
          left: this.position.left,
          top: this.position.top,
        })
      );
    }
  }

  /**
   * Get the current group anarchy value
   */
  static getGroupAnarchy(): number {
    return (game.settings?.get(SYSTEM.id, "groupAnarchy") as number) || 0;
  }

  /**
   * Set the group anarchy value (GM only)
   */
  static async setGroupAnarchy(value: number): Promise<void> {
    if (!game.user?.isGM) {
      ui.notifications?.warn(
        game.i18n?.localize("SRA2.ANARCHY_COUNTER.GM_ONLY") || "Only the GM can modify the group Anarchy"
      );
      return;
    }

    const newValue = Math.max(0, value);
    await game.settings?.set(SYSTEM.id, "groupAnarchy", newValue);
  }

  /**
   * Prepare data for rendering
   */
  getData(options?: Partial<ApplicationOptions>): object {
    return {
      value: AnarchyCounter.getGroupAnarchy(),
      isGM: game.user?.isGM ?? false,
    };
  }

  /**
   * Set position and save to localStorage
   */
  setPosition(options?: Partial<Application.Position>): Application.Position | void {
    const result = super.setPosition(options);
    
    // Save position after move (only if already initialized)
    if (this.positionInitialized) {
      this.savePosition();
    }
    
    return result;
  }

  /**
   * Activate event listeners
   */
  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Add button (GM only)
    html.find(".anarchy-add").on("click", async (event) => {
      event.preventDefault();
      const current = AnarchyCounter.getGroupAnarchy();
      await AnarchyCounter.setGroupAnarchy(current + 1);
    });

    // Remove button (GM only)
    html.find(".anarchy-remove").on("click", async (event) => {
      event.preventDefault();
      const current = AnarchyCounter.getGroupAnarchy();
      await AnarchyCounter.setGroupAnarchy(current - 1);
    });

    // Make the window draggable and save position on drag end
    const header = html.closest(".app").find(".window-header");
    header.on("mouseup", () => {
      setTimeout(() => this.savePosition(), 100);
    });
  }

  /**
   * Trigger animation when value changes
   */
  triggerAnimation(direction: "increase" | "decrease"): void {
    const element = this.element;
    if (!element || !element.length) return;

    const valueEl = element.find(".anarchy-value");
    
    // Remove existing animation classes
    valueEl.removeClass("animate-increase animate-decrease");
    
    // Clear any existing timeout
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }

    // Add animation class
    valueEl.addClass(`animate-${direction}`);

    // Remove animation class after animation completes
    this.animationTimeout = window.setTimeout(() => {
      valueEl.removeClass("animate-increase animate-decrease");
    }, 500);
  }

  /**
   * Toggle visibility of the counter
   */
  static toggle(): void {
    const instance = AnarchyCounter.instance;
    if (instance.rendered) {
      instance.close();
    } else {
      instance.render(true);
    }
  }

  /**
   * Refresh the counter (called when setting changes)
   */
  static refresh(newValue?: number, oldValue?: number): void {
    const instance = AnarchyCounter.instance;
    if (instance.rendered) {
      // Trigger animation based on value change
      if (newValue !== undefined && oldValue !== undefined && newValue !== oldValue) {
        instance.triggerAnimation(newValue > oldValue ? "increase" : "decrease");
      }
      instance.render(false);
    }
  }

  /**
   * Override close to allow re-opening
   */
  async close(options?: Application.CloseOptions): Promise<void> {
    return super.close(options);
  }
}


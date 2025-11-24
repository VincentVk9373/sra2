import { SYSTEM } from './system.ts';

/**
 * Configure sidebar icons for Foundry VTT UI
 */
export function setSidebarIcons(): void {
  CONFIG.Actor.sidebarIcon = 'fas fa-user';
  CONFIG.Adventure.sidebarIcon = 'fas fa-tree';
  CONFIG.Cards.sidebarIcon = 'fa-solid fa-cards';
  CONFIG.ChatMessage.sidebarIcon = 'fas fa-comments';
  CONFIG.Combat.sidebarIcon = 'fas fa-gun';
  CONFIG.Folder.sidebarIcon = 'fas fa-folder';
  CONFIG.Item.sidebarIcon = 'fas fa-suitcase';
  CONFIG.JournalEntry.sidebarIcon = 'fas fa-book-open';
  CONFIG.JournalEntryPage.sidebarIcon = 'fas fa-book-open';
  CONFIG.Macro.sidebarIcon = 'fas fa-code';
  CONFIG.Playlist.sidebarIcon = 'fas fa-music';
  CONFIG.PlaylistSound.sidebarIcon = 'fas fa-music';
  CONFIG.RollTable.sidebarIcon = 'fas fa-th-list';
  CONFIG.Scene.sidebarIcon = 'fas fa-map';

  console.log(SYSTEM.LOG.HEAD + 'Configured sidebar icons');
}

/**
 * Configure control icons for Foundry VTT tokens
 */
export function setControlIcons(): void {
  CONFIG.controlIcons = {
    combat: 'icons/svg/combat.svg',
    visibility: 'icons/svg/cowled.svg',
    effects: 'icons/svg/aura.svg',
    lock: 'icons/svg/padlock.svg',
    up: 'icons/svg/up.svg',
    down: 'icons/svg/down.svg',
    defeated: 'icons/svg/skull.svg',
    light: 'icons/svg/light.svg',
    lightOff: 'icons/svg/light-off.svg',
    template: 'icons/svg/explosion.svg',
    sound: 'icons/svg/sound-off.svg',
    soundOff: 'icons/svg/combat.svg',
    doorClosed: 'icons/svg/door-closed-outline.svg',
    doorOpen: 'icons/svg/door-open-outline.svg',
    doorSecret: 'icons/svg/door-secret-outline.svg',
    doorLocked: 'icons/svg/door-locked-outline.svg'
  };

  console.log(SYSTEM.LOG.HEAD + 'Configured control icons');
}

/**
 * Configure compendium banners
 */
export function setCompendiumBanners(): void {
  // Note: If you have a banner image, uncomment and adjust the path
  // CONFIG.Actor.compendiumBanner = `${SYSTEM.PATH.ROOT}/img/interface/sra2/banner-actors.webp`;
  
  console.log(SYSTEM.LOG.HEAD + 'Configured compendium banners');
}


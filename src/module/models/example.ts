/**
 * Exemple de modèle TypeScript simple pour Foundry VTT
 * 
 * Ce fichier montre comment créer des classes et interfaces typées pour votre système.
 */

import { SYSTEM } from "../config/system.ts";

/**
 * Interface pour les données d'un personnage
 */
export interface CharacterData {
  name: string;
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
}

/**
 * Classe utilitaire pour gérer les personnages
 */
export class CharacterHelper {
  /**
   * Calcule le pourcentage de santé
   */
  static calculateHealthPercentage(data: CharacterData): number {
    if (data.maxHealth === 0) return 0;
    return Math.round((data.health / data.maxHealth) * 100);
  }

  /**
   * Vérifie si le personnage peut monter de niveau
   */
  static canLevelUp(data: CharacterData, experienceRequired: number): boolean {
    return data.experience >= experienceRequired;
  }

  /**
   * Applique des dégâts au personnage
   */
  static applyDamage(data: CharacterData, damage: number): CharacterData {
    const newHealth = Math.max(0, data.health - damage);
    console.log(`${SYSTEM.LOG.HEAD}${data.name} prend ${damage} dégâts`);
    
    return {
      ...data,
      health: newHealth
    };
  }

  /**
   * Soigne le personnage
   */
  static heal(data: CharacterData, amount: number): CharacterData {
    const newHealth = Math.min(data.maxHealth, data.health + amount);
    console.log(`${SYSTEM.LOG.HEAD}${data.name} récupère ${amount} points de vie`);
    
    return {
      ...data,
      health: newHealth
    };
  }
}

/**
 * Exemple de type union pour les états
 */
export type CharacterState = "healthy" | "wounded" | "dying" | "dead";

/**
 * Fonction utilitaire pour déterminer l'état d'un personnage
 */
export function getCharacterState(data: CharacterData): CharacterState {
  const healthPercent = CharacterHelper.calculateHealthPercentage(data);
  
  if (healthPercent === 0) return "dead";
  if (healthPercent < 25) return "dying";
  if (healthPercent < 75) return "wounded";
  return "healthy";
}

// Exemple d'utilisation (commenté)
/*
const character: CharacterData = {
  name: "Héros",
  health: 50,
  maxHealth: 100,
  level: 1,
  experience: 0
};

const healthPercent = CharacterHelper.calculateHealthPercentage(character);
const state = getCharacterState(character);
console.log(`${character.name}: ${healthPercent}% santé, état: ${state}`);
*/


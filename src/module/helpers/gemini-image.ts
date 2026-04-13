/**
 * Gemini Image Generation Helper
 * Calls the Gemini API to generate character portraits from text prompts.
 */

const GEMINI_SETTING = 'geminiApiKey';

/**
 * Check if the Gemini API key is configured
 */
export function isGeminiConfigured(): boolean {
  try {
    const key = (game.settings as any)?.get(SYSTEM.id, GEMINI_SETTING);
    return !!key && key.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the Gemini API key from settings
 */
function getApiKey(): string {
  return (game.settings as any).get(SYSTEM.id, GEMINI_SETTING) || '';
}

/**
 * Register the Gemini API key setting
 */
export function registerGeminiSetting(): void {
  (game.settings as any).register(SYSTEM.id, GEMINI_SETTING, {
    name: 'SRA2.SETTINGS.GEMINI.TITLE',
    hint: 'SRA2.SETTINGS.GEMINI.DESC',
    scope: 'world',
    config: true,
    type: String,
    default: '',
  });
}

/**
 * Generate an image for an actor using Gemini API
 * @param actor The actor to generate the image for
 * @param prompt The image generation prompt (from bio.notes)
 */
export async function generateActorImage(actor: any, onStatus?: (status: string) => void): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    ui.notifications?.error('Gemini API key not configured. Set it in System Settings.');
    return;
  }

  // Extract prompt from bio.notes if available, otherwise build from actor data
  let prompt: string;
  const notes = actor.system?.bio?.notes || '';
  const promptMatch = notes.match(/<em>([^<]+)<\/em>/);
  if (promptMatch) {
    prompt = promptMatch[1];
  } else {
    prompt = buildPromptFromActor(actor);
  }
  console.log('%c=== GEMINI IMAGE PROMPT ===', 'color: magenta; font-weight: bold;');
  console.log(prompt);

  onStatus?.('Generating portrait...');
  ui.notifications?.info(game.i18n?.localize('SRA2.NPC_GENERATOR.GENERATING_IMAGE') || 'Generating image...');

  try {
    const models = ['gemini-3.1-flash-image-preview'];

    let imageBase64: string | null = null;
    for (const model of models) {
      console.log(`Trying Gemini model: ${model}`);
      imageBase64 = await tryGeminiModel(apiKey, model, prompt);
      if (imageBase64) break;
    }

    if (!imageBase64) {
      console.log('Trying Imagen API fallback...');
      imageBase64 = await tryImagenApi(apiKey, prompt);
    }

    if (!imageBase64) {
      throw new Error('All Gemini/Imagen models failed to generate an image. Check your API key and that image generation is enabled on your Google AI project.');
    }

    await saveAndApplyImage(actor, imageBase64, 'portrait');

    // Generate a second image for the token using the portrait as seed
    onStatus?.('Generating token...');
    ui.notifications?.info('Generating token headshot...');
    const genderRaw = actor.system?.gender || 'random';
    const genderToken = genderRaw === 'female' ? 'female' : genderRaw === 'male' ? 'male' : (Math.random() < 0.5 ? 'female' : 'male');
    let tokenBase64: string | null = null;
    for (const model of models) {
      tokenBase64 = await tryGeminiModelWithSeed(apiKey, model, imageBase64,
        `Generate a close-up headshot portrait of this EXACT same ${genderToken} character. Face and shoulders only, centered on the face, square 1:1 crop. Keep the EXACT same face, hair, skin tone, scars, cyberware, and features. Photorealistic rendering. IMPORTANT: Do NOT include any text, writing, letters, words or captions in the image.`);
      if (tokenBase64) break;
    }
    if (tokenBase64) {
      await saveAndApplyImage(actor, tokenBase64, 'token');
    }

  } catch (err: any) {
    console.error('Gemini image generation error:', err);
    ui.notifications?.error(`Image generation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Try a specific Gemini model to generate an image
 */
async function tryGeminiModel(apiKey: string, model: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate a square 1:1 photorealistic character portrait image. Realistic rendering, cinematic lighting, high detail. IMPORTANT: Do NOT include any text, writing, letters, words, labels, captions, watermarks or inscriptions in the image. Description: ${prompt}` }],
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`Gemini model ${model}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return part.inlineData.data;
      }
    }

    console.warn(`Gemini model ${model}: no image in response`);
    return null;
  } catch (err) {
    console.warn(`Gemini model ${model} error:`, err);
    return null;
  }
}

/**
 * Try a Gemini model with a seed image (for consistent token generation)
 */
async function tryGeminiModelWithSeed(apiKey: string, model: string, seedImageBase64: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: 'image/png', data: seedImageBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`Gemini model ${model} (with seed): ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return part.inlineData.data;
      }
    }
    console.warn(`Gemini model ${model} (with seed): no image in response`);
    return null;
  } catch (err) {
    console.warn(`Gemini model ${model} (with seed) error:`, err);
    return null;
  }
}

/**
 * Try the Imagen API endpoint for image generation
 */
async function tryImagenApi(apiKey: string, prompt: string): Promise<string | null> {
  const imagenModels = [
    'imagen-3.0-generate-002',
    'imagen-3.0-generate-001',
    'imagegeneration@006',
  ];

  for (const model of imagenModels) {
    try {
      console.log(`Trying Imagen model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '1:1',
            },
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Imagen model ${model}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const imageData = data?.predictions?.[0]?.bytesBase64Encoded;
      if (imageData) return imageData;
    } catch (err) {
      console.warn(`Imagen model ${model} error:`, err);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// VISUAL DICTIONARIES FOR PROMPT BUILDING
// ═══════════════════════════════════════════════════════════════

const METATYPE_VISUALS: Record<string, string> = {
  human: 'human, average build',
  humain: 'human, average build',
  elf: 'elf with pointed ears, tall and slender, sharp elegant features',
  elfe: 'elf with pointed ears, tall and slender, sharp elegant features',
  dwarf: 'dwarf, short and stocky, thick-boned, broad shoulders',
  nain: 'dwarf, short and stocky, thick-boned, broad shoulders',
  ork: 'ork with prominent tusks, muscular, heavy brow, green-tinged skin',
  troll: 'troll, massive 2.5m tall, horns on head, dermal bone deposits, imposing frame',
};

const ARCHETYPE_VISUALS: Record<string, string> = {
  'street-samurai': 'cybernetically enhanced street warrior, chrome implants visible, combat-ready stance, military-grade gear',
  'decker': 'hacker with cyberdeck strapped to arm, neural cables, AR interface glowing near eyes, tech-savvy look',
  'mage': 'awakened magician, faint magical aura, mystical symbols on clothing, arcane focus in hand',
  'shaman': 'urban shaman with tribal markings, spirit fetishes, bones and totems woven into clothing, primal energy',
  'adept': 'physical adept, lean muscular build, martial arts stance, subtle magical glow on fists, no visible cyberware',
  'rigger': 'drone operator with control rig visible at temple, multiple drone controllers on belt, datajack, tech vest with antennas',
  'face': 'charismatic social operator, expensive but practical clothes, confident posture, subtle earpiece, sharp eyes',
  'technomancer': 'technomancer with no visible tech, data streams visible as faint AR overlay, intense focused gaze, resonance shimmer',
  'infiltrator': 'stealth specialist in dark tactical gear, hood or mask, slim silhouette, utility belt with infiltration tools',
};

const STYLE_SUFFIXES = [
  'neo-noir cyberpunk atmosphere, rain-slicked neon streets, megacorp holographic ads towering in the background, steam rising from sewer grates',
  'dark Shadowrun universe, volumetric neon lighting cutting through smog, sprawl cityscape with corporate arcologies looming behind',
  'Shadowrun 6th World character art, detailed cyberpunk-fantasy illustration, magic and technology intertwined, dangerous urban sprawl',
  'cinematic dystopian portrait, dramatic chiaroscuro lighting, Blade Runner meets urban fantasy, AR icons flickering in the air',
  'gritty Sixth World street scene, neon kanji signs, armored corporate drones overhead, shadows hiding chrome-enhanced predators',
  'dark cyberpunk portrait, crumbling Barrens architecture mixed with gleaming corporate towers, toxic rain, electric glow of the Matrix',
  'Shadowrun aesthetic, where elves carry assault rifles and trolls hack the Matrix, neon-drenched dystopia where magic returned to a broken world',
];

function pickOneStyle<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Infer the archetype of a character from their items and skills
 */
function inferArchetype(actor: any): string | null {
  const items = actor.items || [];
  const hasCyberdeck = items.some((i: any) => i.type === 'feat' && i.system?.featType === 'cyberdeck');
  const cyberCount = items.filter((i: any) => i.type === 'feat' && i.system?.featType === 'cyberware' && !i.system?.isBioware).length;
  const hasSpells = items.some((i: any) => i.type === 'feat' && i.system?.featType === 'spell');
  const hasAdeptPower = items.some((i: any) => i.type === 'feat' && i.system?.featType === 'adeptPower');
  const skills = items.filter((i: any) => i.type === 'skill');

  const skillRating = (slug: string): number => {
    const s = skills.find((sk: any) => sk.system?.slug === slug || sk.name?.toLowerCase().replace(/\s+/g, '-') === slug);
    return s?.system?.rating || 0;
  };

  // Technomancer: has technomancer skill
  if (skillRating('technomancer') >= 2) return 'technomancer';
  // Decker: has cyberdeck
  if (hasCyberdeck) return 'decker';
  // Rigger: high piloting or engineering + drones linked
  const linkedVehicles = actor.system?.linkedVehicles || [];
  if ((skillRating('piloting') >= 3 || skillRating('engineering') >= 3) && linkedVehicles.length > 0) return 'rigger';
  // Mage: has spells + sorcery/conjuration
  if (hasSpells && (skillRating('sorcery') >= 2 || skillRating('conjuration') >= 2)) {
    return skillRating('conjuration') >= skillRating('sorcery') ? 'shaman' : 'mage';
  }
  // Adept: has adept powers
  if (hasAdeptPower) return 'adept';
  // Face: high charisma skills
  if (skillRating('influence') >= 3 || skillRating('networking') >= 3) return 'face';
  // Infiltrator: high stealth
  if (skillRating('stealth') >= 3) return 'infiltrator';
  // Street samurai: lots of cyberware + combat skills
  if (cyberCount >= 3 || skillRating('close-combat') >= 3 || skillRating('ranged-weapons') >= 3) return 'street-samurai';

  return null;
}

/**
 * Build an image prompt from any actor's data (name, metatype, items, keywords...)
 */
function buildPromptFromActor(actor: any): string {
  const parts: string[] = [];
  const sys = actor.system;
  const name = actor.name || 'Unknown';

  // Get metatype with visual description (1. Descriptions visuelles du métatype)
  const metatypeItem = actor.items?.find((i: any) => i.type === 'metatype');
  const metatypeName = metatypeItem?.name || '';
  const metatypeKey = metatypeName.toLowerCase().trim();
  const metatypeVisual = METATYPE_VISUALS[metatypeKey] || metatypeName || 'metahuman';

  // Get keywords
  const keywords: string[] = [];
  if (sys?.keywords) {
    for (let i = 1; i <= 5; i++) {
      const kw = sys.keywords[`keyword${i}`];
      if (kw) keywords.push(kw);
    }
  }

  // Gender description
  let gender = sys?.gender || 'random';
  if (gender === 'random') gender = Math.random() < 0.5 ? 'male' : 'female';
  const genderDesc = gender === 'female' ? 'female' : 'male';

  // (2. Détection d'archétype)
  const archetype = inferArchetype(actor);
  const archetypeVisual = archetype ? ARCHETYPE_VISUALS[archetype] : '';

  // (4. Attributs physiques → corpulence)
  const str = sys?.attributes?.strength || 1;
  const agi = sys?.attributes?.agility || 1;
  let buildDesc = '';
  if (str >= 5 && agi >= 4) buildDesc = 'powerful and agile build, imposing yet swift';
  else if (str >= 5) buildDesc = 'muscular, heavy build, imposing physique';
  else if (str >= 4) buildDesc = 'athletic, solid build';
  else if (agi >= 5) buildDesc = 'lean, wiry, catlike grace';
  else if (agi >= 4) buildDesc = 'slim and agile build';

  // Base description from name, gender, metatype visual, archetype and build
  if (metatypeVisual) {
    parts.push(`Full body portrait of "${name}", a ${genderDesc} ${metatypeVisual} shadowrunner in the Sixth World — a dark dystopian cyberpunk-fantasy future where magic and technology coexist`);
  } else {
    parts.push(`Full body portrait of "${name}", ${genderDesc} — a creature or entity in the Sixth World, a dark dystopian cyberpunk-fantasy setting`);
  }
  if (archetypeVisual) {
    parts.push(archetypeVisual);
  }
  if (buildDesc) {
    parts.push(`Physical build: ${buildDesc}`);
  }

  // Keywords as identity
  if (keywords.length > 0) {
    parts.push(`Identity: ${keywords.join(', ')}`);
  }

  // (3. Skills — top 5 par rating)
  const skillItems = actor.items?.filter((i: any) => i.type === 'skill') || [];
  const topSkills = [...skillItems]
    .sort((a: any, b: any) => (b.system?.rating || 0) - (a.system?.rating || 0))
    .slice(0, 5);
  if (topSkills.length > 0) {
    const skillDescs = topSkills.map((s: any) => s.name || s.system?.slug || 'unknown');
    parts.push(`Expert in: ${skillDescs.join(', ')} — this expertise should be visually apparent in their posture, gear, and attitude`);
  }

  // Background/bio for visual context (doubled to 400 chars)
  const bg = sys?.bio?.background || '';
  const bgText = bg.replace(/<[^>]+>/g, '').trim();
  if (bgText && bgText.length > 10) {
    parts.push(`Background: ${bgText.substring(0, 400)}`);
  }

  // Behaviors for body language
  const behaviors: string[] = [];
  if (sys?.behaviors) {
    for (let i = 1; i <= 4; i++) {
      const b = sys.behaviors[`behavior${i}`];
      if (b) behaviors.push(b);
    }
  }
  if (behaviors.length > 0) {
    parts.push(`Personality visible through body language: ${behaviors.slice(0, 2).join('. ')}`);
  }

  // (5. Catchphrases → mood/attitude)
  const catchphrases: string[] = [];
  if (sys?.catchphrases) {
    for (let i = 1; i <= 4; i++) {
      const c = sys.catchphrases[`catchphrase${i}`];
      if (c) catchphrases.push(c);
    }
  }
  if (catchphrases.length > 0) {
    parts.push(`Attitude captured by their words: "${catchphrases[0]}" — this vibe should be reflected in facial expression and posture`);
  }

  // Visible gear
  const weaponItems = actor.items?.filter((i: any) => i.type === 'feat' && i.system?.featType === 'weapon') || [];
  const armorItems = actor.items?.filter((i: any) => i.type === 'feat' && i.system?.featType === 'armor') || [];
  const cyberItems = actor.items?.filter((i: any) => i.type === 'feat' && i.system?.featType === 'cyberware' && !i.system?.isBioware) || [];
  const cyberdeckItems = actor.items?.filter((i: any) => i.type === 'feat' && i.system?.featType === 'cyberdeck') || [];

  // Armor with graduated description (improved from NPC generator)
  if (armorItems.length > 0) {
    const av = armorItems[0].system?.armorValue || 0;
    const armorDesc = av >= 4
      ? `Wearing heavy ${armorItems[0].name}, bulky military-grade protection clearly visible, tactical plates and reinforced padding`
      : av >= 3
        ? `Wearing ${armorItems[0].name}, armored coat or vest clearly visible under clothing, reinforced shoulders and chest`
        : `Wearing ${armorItems[0].name}, light ballistic protection visible — reinforced jacket or concealed vest`;
    parts.push(armorDesc);
  }
  if (cyberItems.length > 0) {
    parts.push(`Visible cyberware: ${cyberItems.slice(0, 3).map((c: any) => c.name).join(', ')}`);
  }

  // (6. Arme primaire + secondaire)
  const primaryWeapon = weaponItems.find((w: any) => w.system?.bookmarked) || weaponItems[0];
  if (primaryWeapon) {
    parts.push(`Carrying ${primaryWeapon.name} as primary weapon`);
  }
  if (weaponItems.length > 1) {
    const secondary = weaponItems.find((w: any) => w !== primaryWeapon);
    if (secondary) parts.push(`${secondary.name} holstered or sheathed`);
  }

  if (cyberdeckItems.length > 0) {
    parts.push(`${cyberdeckItems[0].name} strapped to forearm, holographic interface glowing`);
  }

  // Linked drones/vehicles
  const linkedVehicles = sys?.linkedVehicles || [];
  if (linkedVehicles.length > 0) {
    const droneNames: string[] = [];
    for (const uuid of linkedVehicles.slice(0, 3)) {
      try {
        let vehicle: any = null;
        if ((foundry.utils as any)?.fromUuidSync) {
          try { vehicle = (foundry.utils as any).fromUuidSync(uuid); } catch (_e) { /* */ }
        }
        if (!vehicle && game.actors) {
          vehicle = (game.actors as any).find((a: any) => a.uuid === uuid);
        }
        if (vehicle) droneNames.push(vehicle.name);
      } catch { /* skip */ }
    }
    if (droneNames.length > 0) {
      parts.push(`Accompanied by drones: ${droneNames.join(', ')} — hovering or following nearby`);
    }
  }

  // (7. Suffixes de style variés)
  parts.push(pickOneStyle(STYLE_SUFFIXES));

  // (8. Directive qualité)
  parts.push('Highly detailed character illustration, sharp focus on face and equipment, dramatic pose, professional RPG character art quality. IMPORTANT: Do NOT include any text, writing, letters, words, labels, captions, watermarks or inscriptions in the image');

  return parts.join('. ') + '.';
}

/**
 * Save base64 image to world storage and update actor avatar + token
 */
async function saveAndApplyImage(actor: any, base64Data: string, type: 'portrait' | 'token' = 'portrait'): Promise<void> {
  // Convert base64 to blob
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: 'image/png' });

  // Create file name from actor name
  const safeName = actor.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  const suffix = type === 'token' ? '_token' : '_portrait';
  const fileName = `${safeName}${suffix}_${Date.now()}.png`;
  const dirPath = 'assets/generated-portraits';

  // Ensure directory exists
  try {
    await FilePicker.browse('data', dirPath);
  } catch {
    try {
      await FilePicker.createDirectory('data', 'assets');
    } catch { /* may already exist */ }
    try {
      await FilePicker.createDirectory('data', dirPath);
    } catch { /* may already exist */ }
  }

  // Upload file
  const file = new File([blob], fileName, { type: 'image/png' });
  const uploadResult = await FilePicker.upload('data', dirPath, file, {});
  const filePath = (uploadResult as any)?.path;

  if (!filePath) {
    throw new Error('Failed to upload image');
  }

  // Update actor: portrait → actor img + prototypeToken, token → prototypeToken only (overrides portrait)
  if (type === 'portrait') {
    await actor.update({ img: filePath, 'prototypeToken.texture.src': filePath });
    ui.notifications?.info(game.i18n?.localize('SRA2.NPC_GENERATOR.IMAGE_GENERATED') || 'Portrait generated!');
  } else {
    await actor.update({ 'prototypeToken.texture.src': filePath });
    ui.notifications?.info('Token headshot generated!');
  }
}

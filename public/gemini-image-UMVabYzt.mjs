const GEMINI_SETTING = "geminiApiKey";
function isGeminiConfigured() {
  try {
    const key = game.settings?.get(SYSTEM.id, GEMINI_SETTING);
    return !!key && key.trim().length > 0;
  } catch {
    return false;
  }
}
function getApiKey() {
  return game.settings.get(SYSTEM.id, GEMINI_SETTING) || "";
}
async function generateActorImage(actor, onStatus) {
  const apiKey = getApiKey();
  if (!apiKey) {
    ui.notifications?.error("Gemini API key not configured. Set it in System Settings.");
    return;
  }
  let prompt;
  const notes = actor.system?.bio?.notes || "";
  const promptMatch = notes.match(/<em>([^<]+)<\/em>/);
  if (promptMatch) {
    prompt = promptMatch[1];
  } else {
    prompt = buildPromptFromActor(actor);
  }
  console.log("%c=== GEMINI IMAGE PROMPT ===", "color: magenta; font-weight: bold;");
  console.log(prompt);
  onStatus?.("Generating portrait...");
  ui.notifications?.info(game.i18n?.localize("SRA2.NPC_GENERATOR.GENERATING_IMAGE") || "Generating image...");
  try {
    const models = ["gemini-3.1-flash-image-preview"];
    let imageBase64 = null;
    for (const model of models) {
      console.log(`Trying Gemini model: ${model}`);
      imageBase64 = await tryGeminiModel(apiKey, model, prompt);
      if (imageBase64) break;
    }
    if (!imageBase64) {
      console.log("Trying Imagen API fallback...");
      imageBase64 = await tryImagenApi(apiKey, prompt);
    }
    if (!imageBase64) {
      throw new Error("All Gemini/Imagen models failed to generate an image. Check your API key and that image generation is enabled on your Google AI project.");
    }
    await saveAndApplyImage(actor, imageBase64, "portrait");
    onStatus?.("Generating token...");
    ui.notifications?.info("Generating token headshot...");
    let tokenBase64 = null;
    for (const model of models) {
      tokenBase64 = await tryGeminiModelWithSeed(
        apiKey,
        model,
        imageBase64,
        "Generate a close-up headshot portrait of this EXACT same character. Face and shoulders only, centered on the face, square 1:1 crop. Keep the EXACT same face, hair, skin tone, scars, cyberware, and features. Photorealistic rendering. IMPORTANT: Do NOT include any text, writing, letters, words or captions in the image."
      );
      if (tokenBase64) break;
    }
    if (tokenBase64) {
      await saveAndApplyImage(actor, tokenBase64, "token");
    }
  } catch (err) {
    console.error("Gemini image generation error:", err);
    ui.notifications?.error(`Image generation failed: ${err.message}`);
    throw err;
  }
}
async function tryGeminiModel(apiKey, model, prompt) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate a square 1:1 photorealistic character portrait image. Realistic rendering, cinematic lighting, high detail. IMPORTANT: Do NOT include any text, writing, letters, words, labels, captions, watermarks or inscriptions in the image. Description: ${prompt}` }]
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"]
          }
        })
      }
    );
    if (!response.ok) {
      console.warn(`Gemini model ${model}: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
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
async function tryGeminiModelWithSeed(apiKey, model, seedImageBase64, prompt) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: "image/png", data: seedImageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"]
          }
        })
      }
    );
    if (!response.ok) {
      console.warn(`Gemini model ${model} (with seed): ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
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
async function tryImagenApi(apiKey, prompt) {
  const imagenModels = [
    "imagen-3.0-generate-002",
    "imagen-3.0-generate-001",
    "imagegeneration@006"
  ];
  for (const model of imagenModels) {
    try {
      console.log(`Trying Imagen model: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1"
            }
          })
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
function buildPromptFromActor(actor) {
  const parts = [];
  const sys = actor.system;
  const name = actor.name || "Unknown";
  const metatypeItem = actor.items?.find((i) => i.type === "metatype");
  const metatypeName = metatypeItem?.name || "";
  const keywords = [];
  if (sys?.keywords) {
    for (let i = 1; i <= 5; i++) {
      const kw = sys.keywords[`keyword${i}`];
      if (kw) keywords.push(kw);
    }
  }
  if (metatypeName) {
    parts.push(`Full body portrait of "${name}", a ${metatypeName} in the Sixth World — a dark dystopian cyberpunk-fantasy future where magic and technology coexist`);
  } else {
    parts.push(`Full body portrait of "${name}" — a creature or entity in the Sixth World, a dark dystopian cyberpunk-fantasy setting`);
  }
  if (keywords.length > 0) {
    parts.push(`Identity: ${keywords.join(", ")}`);
  }
  const bg = sys?.bio?.background || "";
  const bgText = bg.replace(/<[^>]+>/g, "").trim();
  if (bgText && bgText.length > 10) {
    parts.push(`Background: ${bgText.substring(0, 200)}`);
  }
  const behaviors = [];
  if (sys?.behaviors) {
    for (let i = 1; i <= 4; i++) {
      const b = sys.behaviors[`behavior${i}`];
      if (b) behaviors.push(b);
    }
  }
  if (behaviors.length > 0) {
    parts.push(`Personality: ${behaviors.slice(0, 2).join(". ")}`);
  }
  const weaponItems = actor.items?.filter((i) => i.type === "feat" && i.system?.featType === "weapon") || [];
  const armorItems = actor.items?.filter((i) => i.type === "feat" && i.system?.featType === "armor") || [];
  const cyberItems = actor.items?.filter((i) => i.type === "feat" && i.system?.featType === "cyberware" && !i.system?.isBioware) || [];
  const cyberdeckItems = actor.items?.filter((i) => i.type === "feat" && i.system?.featType === "cyberdeck") || [];
  if (armorItems.length > 0) {
    const av = armorItems[0].system?.armorValue || 0;
    parts.push(av >= 4 ? `Wearing heavy armor: ${armorItems[0].name}` : `Wearing ${armorItems[0].name}`);
  }
  if (cyberItems.length > 0) {
    parts.push(`Visible cyberware: ${cyberItems.slice(0, 3).map((c) => c.name).join(", ")}`);
  }
  if (weaponItems.length > 0) {
    parts.push(`Armed with ${weaponItems[0].name}`);
  }
  if (cyberdeckItems.length > 0) {
    parts.push(`${cyberdeckItems[0].name} strapped to forearm, holographic interface glowing`);
  }
  parts.push("Shadowrun RPG character art, dark cyberpunk atmosphere, neon-lit urban backdrop, highly detailed illustration. IMPORTANT: Do NOT include any text, writing, letters, words or captions in the image");
  return parts.join(". ") + ".";
}
async function saveAndApplyImage(actor, base64Data, type = "portrait") {
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: "image/png" });
  const safeName = actor.name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
  const suffix = type === "token" ? "_token" : "_portrait";
  const fileName = `${safeName}${suffix}_${Date.now()}.png`;
  const dirPath = "assets/generated-portraits";
  try {
    await FilePicker.browse("data", dirPath);
  } catch {
    try {
      await FilePicker.createDirectory("data", "assets");
    } catch {
    }
    try {
      await FilePicker.createDirectory("data", dirPath);
    } catch {
    }
  }
  const file = new File([blob], fileName, { type: "image/png" });
  const uploadResult = await FilePicker.upload("data", dirPath, file, {});
  const filePath = uploadResult?.path;
  if (!filePath) {
    throw new Error("Failed to upload image");
  }
  if (type === "portrait") {
    await actor.update({ img: filePath, "prototypeToken.texture.src": filePath });
    ui.notifications?.info(game.i18n?.localize("SRA2.NPC_GENERATOR.IMAGE_GENERATED") || "Portrait generated!");
  } else {
    await actor.update({ "prototypeToken.texture.src": filePath });
    ui.notifications?.info("Token headshot generated!");
  }
}
export {
  generateActorImage,
  isGeminiConfigured
};
//# sourceMappingURL=gemini-image-UMVabYzt.mjs.map

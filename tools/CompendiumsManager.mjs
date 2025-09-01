import { extractPack, compilePack } from '@foundryvtt/foundryvtt-cli';
import { promises as fs } from 'fs';
import path from "path";

const MODULE_ID = process.cwd();

export class CompendiumsManager {

  static async packToDistDir(srcDir = 'src/packs', distDir = 'dist/packs', mode = 'yaml') {
    const yaml = mode === 'yaml'
    const packs = await fs.readdir('./' + srcDir);
    for (const pack of packs) {
      if (pack === '.gitattributes') continue;
      console.log('Packing ' + pack);
      await compilePack(
        `${MODULE_ID}/${srcDir}/${pack}`,
        `${MODULE_ID}/${distDir}/${pack}`,
        { yaml }
      );
    }
  }

  static async unpackToSrcDir(srcDir = 'src/packs', distDir = 'dist/packs', mode = 'yaml') {
    const yaml = mode === 'yaml'
    const packs = await fs.readdir("./" + distDir);
    for (const pack of packs) {
      if (pack === ".gitattributes") continue;
      console.log("Unpacking " + pack);
      const directory = `./${srcDir}/${pack}`;
      try {
        for (const file of await fs.readdir(directory)) {
          await fs.unlink(path.join(directory, file));
        }
      } catch (error) {
        if (error.code === "ENOENT") console.log("No files inside of " + pack);
        else console.log(error);
      }
      await extractPack(
        `${MODULE_ID}/${distDir}/${pack}`,
        `${MODULE_ID}/${srcDir}/${pack}`,
        {
          yaml,
          transformName: doc => CompendiumsManager.transformName(doc),
        }
      );
    }
  }

  /**
   * Prefaces the document with its type
   * @param {object} doc - The document data
   */
  static transformName(doc) {
    const safeFileName = doc.name.replace(/[^a-zA-Z0-9А-я]/g, "_");
    const type = doc._key.split("!")[1];
    const prefix = ["actors", "items"].includes(type) ? doc.type : type;

    return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.${yaml ? "yml" : "json"
      }`;
  }
}
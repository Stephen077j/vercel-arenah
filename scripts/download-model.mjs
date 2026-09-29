// Télécharge le réseau de neurones du chatbot (une seule fois, ~130 Mo).
//   npm run ai:model
// Utilisé aussi pendant la construction de l'image Docker : le serveur de
// production n'a ainsi jamais besoin d'accéder à Internet pour l'IA.
// Si le modèle est déjà présent dans AI_MODEL_DIR, rien n'est téléchargé.
import path from 'path';
import { pipeline, env } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'; // identique à server/ai/semantic.ts
const ATTEMPTS = 4;
env.cacheDir = path.resolve(process.env.AI_MODEL_DIR ?? '.cache/models');

console.log(`⬇️  ${MODEL_ID} → ${env.cacheDir}`);
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    const extractor = await pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' });
    const out = await extractor(['test'], { pooling: 'mean', normalize: true });
    console.log(`✅ Modèle prêt (vecteurs de ${out.dims[1]} dimensions)`);
    process.exit(0);
  } catch (err) {
    console.warn(`⚠️  Essai ${attempt}/${ATTEMPTS} échoué : ${err.message}`);
    if (attempt === ATTEMPTS) {
      console.error('❌ Téléchargement impossible. Vérifiez la connexion, ou lancez "npm run ai:model" sur la machine de build.');
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 5000 * attempt));
  }
}

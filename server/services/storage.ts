/**
 * ARENAH – Abstraction de stockage des fichiers envoyés
 *
 * Les hébergements gratuits (Render, Railway, Fly, Vercel…) montent un système
 * de fichiers éphémère : tout ce qui est écrit sur le disque disparaît au
 * redéploiement ou à la mise en veille du conteneur. Les avatars uploadés
 * seraient donc perdus, alors que la base garde leur URL — d'où des images
 * cassées.
 *
 * Ce module isole l'écriture derrière une interface, pour qu'on puisse brancher
 * un stockage persistant en phase de déploiement sans toucher aux routes.
 *
 * Pilote actif : variable STORAGE_DRIVER.
 *   - "local" (défaut) : disque, comportement historique inchangé.
 *   - autre valeur     : à implémenter au moment du déploiement, une fois le
 *                        fournisseur choisi. Aucun fournisseur n'est imposé ici.
 *
 * Pour ajouter un pilote : implémenter StorageDriver, l'enregistrer dans
 * `resolveDriver`, et renseigner STORAGE_DRIVER + STORAGE_PUBLIC_URL.
 * Les candidats courants avec offre gratuite : Cloudinary, Supabase Storage,
 * Backblaze B2, Cloudflare R2 — le choix reste à faire.
 */
import fs from 'fs';
import path from 'path';
import { STORAGE_DRIVER, STORAGE_PUBLIC_URL } from '../config/env.js';

export interface StoredFile {
  /** Chemin logique, ex. "avatars/avatar_1730000000.jpg". */
  key: string;
  /** URL utilisable par le navigateur. */
  url: string;
}

export interface StorageDriver {
  readonly name: string;
  /** true si les fichiers survivent à un redéploiement. */
  readonly persistent: boolean;
  save(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}

/* ─── Pilote disque local ────────────────────────────────────────────────── */

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

class LocalDiskStorage implements StorageDriver {
  readonly name = 'local';
  readonly persistent = false;

  async save(key: string, data: Buffer): Promise<StoredFile> {
    const full = path.join(UPLOAD_ROOT, key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, data);
    return { key, url: this.urlFor(key) };
  }

  async delete(key: string): Promise<void> {
    await fs.promises.rm(path.join(UPLOAD_ROOT, key), { force: true });
  }

  urlFor(key: string): string {
    // STORAGE_PUBLIC_URL permet de servir les fichiers depuis un autre domaine
    // (CDN, sous-domaine) sans changer ce qui est stocké en base.
    const base = STORAGE_PUBLIC_URL.replace(/\/$/, '');
    return base ? `${base}/${key}` : `/uploads/${key}`;
  }
}

/* ─── Sélection du pilote ────────────────────────────────────────────────── */

function resolveDriver(): StorageDriver {
  switch (STORAGE_DRIVER) {
    case 'local':
      return new LocalDiskStorage();
    default:
      throw new Error(
        `STORAGE_DRIVER="${STORAGE_DRIVER}" n'est pas implémenté. ` +
        `Pilotes disponibles : local. Implémentez StorageDriver dans ` +
        `server/services/storage.ts avant d'utiliser cette valeur.`
      );
  }
}

export const storage: StorageDriver = resolveDriver();

/** Le stockage courant survit-il à un redéploiement ? */
export function storageIsPersistent(): boolean {
  return storage.persistent;
}

/** Avertissement au démarrage si l'on tourne en production sur du volatil. */
export function warnIfEphemeral(isProduction: boolean): void {
  if (isProduction && !storage.persistent) {
    console.warn(
      `⚠️  Stockage "${storage.name}" non persistant : les fichiers envoyés seront\n` +
      `    perdus au prochain redéploiement. Configurez STORAGE_DRIVER sur un\n` +
      `    stockage objet avant la mise en production.`
    );
  }
}

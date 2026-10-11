// Export and import: one slot as one gzip-compressed JSON file. A hand-edited file may also be
// plain JSON; editing saves is fine, since there are no leaderboards to protect.
import { loadSave, SaveError, type Save } from './format.ts';

export const FILE_FORMAT = 'severed-heaven-slot';

interface SaveFile {
  format: typeof FILE_FORMAT;
  exportedAt: number;
  save: Save;
}

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeSaveFile(save: Save, exportedAt: number): Promise<Uint8Array> {
  const file: SaveFile = { format: FILE_FORMAT, exportedAt, save };
  return pipe(new TextEncoder().encode(JSON.stringify(file)), new CompressionStream('gzip'));
}

/** Reads an exported file, migrating and checking the save inside. Throws SaveError if it can't. */
export async function decodeSaveFile(data: Uint8Array | ArrayBuffer): Promise<Save> {
  let bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      bytes = await pipe(bytes, new DecompressionStream('gzip'));
    } catch {
      throw new SaveError('The file is damaged and could not be unpacked.');
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new SaveError('The file is not a save.');
  }
  const file = parsed as Partial<SaveFile> | null;
  if (!file || file.format !== FILE_FORMAT || file.save === undefined) {
    throw new SaveError('The file is not a Severed Heaven save.');
  }
  return loadSave(file.save);
}

export function exportFileName(name: string, slot: number, at: Date): string {
  const safe = name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'life';
  const date = at.toISOString().slice(0, 10);
  return `severed-heaven-slot${slot}-${safe}-${date}.json.gz`;
}

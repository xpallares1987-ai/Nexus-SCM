import fs from 'fs/promises';
import path from 'path';

let unlocodeCache: any[] | null = null;

export async function searchUnlocodes(query: string, country?: string) {
  if (!unlocodeCache) {
    const jsonDir = path.join(process.cwd(), 'node_modules', '@geoapify', 'un-locode', 'dist', 'json-data');
    try {
      const files = await fs.readdir(jsonDir);
      let allLocations: any[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(jsonDir, file), 'utf8');
          try {
            const data = JSON.parse(content);
            allLocations.push(...data);
          } catch (e) {}
        }
      }
      unlocodeCache = allLocations;
    } catch(e) {
      console.error("Failed to load UNLOCODEs", e);
      return [];
    }
  }

  const q = (query || '').toLowerCase().trim();
  const c = (country || '').toUpperCase().trim();

  let results = unlocodeCache;
  if (c) {
    results = results.filter(l => l.country === c);
  }
  if (q) {
    results = results.filter(l => 
      (l.location && l.location.toLowerCase().includes(q)) || 
      (l.nameWoDiacritics && l.nameWoDiacritics.toLowerCase().includes(q)) ||
      (l.name && l.name.toLowerCase().includes(q))
    );
  }

  return results.slice(0, 100);
}

export interface CatalogueEntry {
  id: string;
  title: string;
  strategy: string;
  status: string;
  has_visual: boolean;
  has_solutions: boolean;
}

export interface Catalogue {
  format: 'fmaze-browser-index-v0';
  packages: CatalogueEntry[];
}

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/`;

export async function loadCatalogue(): Promise<Catalogue> {
  const response = await fetch(`${BASE}index.json`);
  if (!response.ok) {
    throw new Error(`failed to load catalogue: ${response.status}`);
  }
  return (await response.json()) as Catalogue;
}

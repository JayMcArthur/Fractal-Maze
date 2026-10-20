import type { BrowserPackage } from './types';

const PACKAGE_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/`;

export async function loadBrowserPackage(packageId: string): Promise<BrowserPackage> {
  const response = await fetch(`${PACKAGE_BASE}${packageId}.json`);
  if (!response.ok) {
    throw new Error(`failed to load package ${packageId}: ${response.status}`);
  }
  const data = (await response.json()) as BrowserPackage;
  if (data.format !== 'fmaze-browser-v0') {
    throw new Error(`unexpected package format ${data.format}`);
  }
  return data;
}

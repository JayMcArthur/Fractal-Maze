import { ROOT, type Address } from './types';

export function parseAddress(raw: string): Address {
  const parts = raw.split('.').filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new Error('address cannot be empty');
  }
  return {
    prefix: parts.slice(0, -1),
    point: parts[parts.length - 1],
  };
}

export function formatAddress(address: Address): string {
  return address.prefix.length === 0
    ? address.point
    : [...address.prefix, address.point].join('.');
}

export function addressEquals(left: Address, right: Address): boolean {
  if (left.point !== right.point) return false;
  if (left.prefix.length !== right.prefix.length) return false;
  for (let i = 0; i < left.prefix.length; i += 1) {
    if (left.prefix[i] !== right.prefix[i]) return false;
  }
  return true;
}

export function stackOf(address: Address): readonly string[] {
  return [ROOT, ...address.prefix];
}

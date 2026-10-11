export function assetUrl(asset: string) {
  return asset.startsWith('data:')
    ? asset
    : `${import.meta.env.BASE_URL}${asset.split('/').map(encodeURIComponent).join('/')}`
}

/** Read a local image without extracting routes or changing maze geometry. */
export async function importImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a cover smaller than 5 MB.')
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  const types: Record<string, string> = {
    png: 'png', jpg: 'jpeg', jpeg: 'jpeg', gif: 'gif', webp: 'webp', svg: 'svg+xml',
  }
  const type = extension && types[extension]
  if (!type) throw new Error('Choose SVG, PNG, JPEG, WebP, or GIF artwork.')
  const asset: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the cover file.'))
    reader.readAsDataURL(new Blob([file], { type: `image/${type}` }))
  })
  await new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Could not open this image.'))
    image.src = asset
  })
  return asset
}

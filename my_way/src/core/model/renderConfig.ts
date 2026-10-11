export interface RenderConfig {
  preferredRenderer: 'canvas' | 'svg' | 'auto'
  maxDepth: number // recursion depth cap for rendering
  showBreadcrumbs: boolean
  showBlockLabels: boolean
  animationSpeed: 'slow' | 'normal' | 'fast' | 'instant'
  colorScheme?: 'default' | 'highContrast'
}

export const defaultRenderConfig: RenderConfig = {
  preferredRenderer: 'auto',
  maxDepth: 3,
  showBreadcrumbs: true,
  showBlockLabels: true,
  animationSpeed: 'normal',
  colorScheme: 'default',
}

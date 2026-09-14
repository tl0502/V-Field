// uni-app's template checker sees DOM events; WeChat supplies detail.value and
// detail.cursor. Keep the platform boundary typed without assuming DOM objects.
export function textInputEvent(event: unknown): { value: string; cursor?: number } {
  const source = event as { detail?: { value?: unknown; cursor?: unknown }; target?: { value?: unknown } }
  const value = typeof source.detail?.value === 'string' ? source.detail.value : typeof source.target?.value === 'string' ? source.target.value : ''
  const cursor = source.detail?.cursor
  return { value, ...(typeof cursor === 'number' && cursor >= 0 ? { cursor } : {}) }
}

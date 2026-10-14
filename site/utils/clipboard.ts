export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the selection-based copy path for restricted contexts.
    }
  }

  if (typeof document === 'undefined') return false

  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  field.style.pointerEvents = 'none'
  document.body.append(field)
  field.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
  }
}

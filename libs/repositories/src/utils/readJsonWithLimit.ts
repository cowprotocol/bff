/** Decompressed bytes. Parsing peaks at ~3.6x this in heap (UTF-16 string plus objects). */
export const MAX_UPSTREAM_JSON_BYTES = 20 * 1024 * 1024

/**
 * `response.json()`, throwing once the body passes `maxBytes` instead of buffering the rest.
 *
 * Meters the decompressed stream rather than `content-length`: Tenderly's `simulate-bundle` sends
 * no `content-length` and gzips, so the header describes about a tenth of what reaches the heap.
 */
export async function readJsonWithLimit<T>(response: Response, maxBytes = MAX_UPSTREAM_JSON_BYTES): Promise<T> {
  if (!response.body) return (await response.json()) as T

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let bytes = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      bytes += value.byteLength
      if (bytes > maxBytes) {
        throw new Error(`Upstream response exceeded the ${maxBytes} byte limit`)
      }

      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    await reader.cancel().catch(() => undefined)
  }

  return JSON.parse(text) as T
}

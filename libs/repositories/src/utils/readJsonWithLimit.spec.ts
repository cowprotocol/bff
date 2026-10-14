import { MAX_UPSTREAM_JSON_BYTES, readJsonWithLimit } from './readJsonWithLimit'

function chunkedResponse(chunks: string[]): { response: Response; pulled: () => number } {
  let pulled = 0
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[pulled]))
      pulled++
    },
  })

  return { response: new Response(stream), pulled: () => pulled }
}

describe('readJsonWithLimit', () => {
  it('parses a response that stays under the limit', async () => {
    await expect(readJsonWithLimit(new Response('{"simulation_results":[]}'))).resolves.toEqual({
      simulation_results: [],
    })
  })

  it('allows a body sitting exactly on the limit', async () => {
    const body = `"${'a'.repeat(8)}"` // 10 bytes

    await expect(readJsonWithLimit(new Response(body), 10)).resolves.toBe('a'.repeat(8))
  })

  it('throws once the body passes the limit', async () => {
    const body = `"${'a'.repeat(9)}"` // 11 bytes

    await expect(readJsonWithLimit(new Response(body), 10)).rejects.toThrow('exceeded the 10 byte limit')
  })

  it('stops pulling from the stream instead of buffering the whole body', async () => {
    const { response, pulled } = chunkedResponse(Array(100).fill('x'.repeat(10)))

    await expect(readJsonWithLimit(response, 25)).rejects.toThrow('exceeded the 25 byte limit')
    expect(pulled()).toBeLessThan(10)
  })

  it('caps at 20MB by default', () => {
    expect(MAX_UPSTREAM_JSON_BYTES).toBe(20 * 1024 * 1024)
  })
})

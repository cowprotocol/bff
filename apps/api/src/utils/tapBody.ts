import { Transform } from 'stream'

export interface BodySummary {
  bytes: number
  snippet?: string
  truncated: boolean
  /** Set when the body died in transfer, so a partial response is not reported as a whole one */
  error?: Error
}

/**
 * Passes a response body straight through while keeping the first `maxBytes` for logging.
 *
 * Only the capped prefix is retained, so a large response costs the cap rather than its own size,
 * and nothing is buffered: chunks are forwarded as they arrive.
 */
export function tapBody(maxBytes: number, onDone: (summary: BodySummary) => void): Transform {
  const kept: Buffer[] = []
  let bytes = 0
  let keptBytes = 0
  let reported = false

  const report = (error?: Error) => {
    if (reported) return
    reported = true
    onDone({
      bytes,
      snippet: keptBytes > 0 ? Buffer.concat(kept).toString('utf8') : undefined,
      truncated: bytes > keptBytes,
      error,
    })
  }

  const tap = new Transform({
    transform(chunk, _encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += buffer.length

      if (keptBytes < maxBytes) {
        const slice = buffer.subarray(0, maxBytes - keptBytes)
        kept.push(slice)
        keptBytes += slice.length
      }

      callback(null, chunk)
    },
    flush(callback) {
      report()
      callback()
    },
  })

  // A client that disconnects mid-stream never reaches flush. destroy(err) emits 'error' before
  // 'close', so a failed transfer reports its error rather than looking like a clean finish.
  tap.on('error', report)
  tap.on('close', report)

  return tap
}

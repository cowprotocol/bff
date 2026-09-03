import { PassThrough, pipeline, Readable } from 'stream'
import { tapBody } from './tapBody'
import { BodySummary } from './tapBody'

function drain(source: Readable, tap: ReturnType<typeof tapBody>): Promise<void> {
  const sink = new PassThrough()
  sink.resume()
  tap.pipe(sink)
  tap.on('error', () => undefined)
  source.on('error', () => undefined)

  return new Promise((resolve) => setTimeout(resolve, 50))
}

describe('tapBody', () => {
  it('passes the body through untouched while keeping a capped prefix', async () => {
    let summary: BodySummary | undefined
    const tap = tapBody(4, (s) => (summary = s))
    const chunks: Buffer[] = []
    tap.on('data', (chunk: Buffer) => chunks.push(chunk))

    const source = Readable.from([Buffer.from('abcdefghij')])
    pipeline(source, tap, () => undefined)
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(Buffer.concat(chunks).toString()).toBe('abcdefghij')
    expect(summary).toEqual({ bytes: 10, snippet: 'abcd', truncated: true })
  })

  /**
   * Readable.pipe does not forward a source error to the destination, so a body that dies mid-transfer
   * left the tap alive and never reporting, and the proxied call went unlogged. registerProxy uses
   * stream.pipeline for this reason: it destroys the destination, which is what triggers the report.
   */
  it('reports when the source dies mid-stream, but only if the destination is destroyed', async () => {
    const reported: string[] = []

    const viaPipe = tapBody(100, () => reported.push('pipe'))
    const pipeSource = new Readable({ read: () => undefined })
    pipeSource.pipe(viaPipe)
    await drain(pipeSource, viaPipe)
    pipeSource.push('partial')
    pipeSource.destroy(new Error('upstream died'))
    await new Promise((resolve) => setTimeout(resolve, 50))

    const viaPipeline = tapBody(100, () => reported.push('pipeline'))
    const pipelineSource = new Readable({ read: () => undefined })
    pipeline(pipelineSource, viaPipeline, () => undefined)
    await drain(pipelineSource, viaPipeline)
    pipelineSource.push('partial')
    pipelineSource.destroy(new Error('upstream died'))
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(reported).toEqual(['pipeline'])
  })
})

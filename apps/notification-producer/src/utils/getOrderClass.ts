import { AnyAppDataDocVersion } from '@cowprotocol/cow-sdk'

export function getOrderClass(appData: AnyAppDataDocVersion | undefined): string {
  const { metadata } = appData || {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (metadata as any)?.orderClass?.orderClass || 'unknown'
}

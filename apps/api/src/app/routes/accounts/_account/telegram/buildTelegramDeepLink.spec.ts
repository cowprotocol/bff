import { buildTelegramDeepLink, buildTelegramUnsubscribeDeepLink } from './buildTelegramDeepLink'

describe('buildTelegramDeepLink', () => {
  it('builds a t.me deep link from a bot username and token', () => {
    expect(buildTelegramDeepLink('cowNotificationsBot', 'abc123')).toBe('https://t.me/cowNotificationsBot?start=abc123')
  })
})

describe('buildTelegramUnsubscribeDeepLink', () => {
  it('builds a t.me deep link that pre-fills /unsubscribe', () => {
    expect(buildTelegramUnsubscribeDeepLink('cowNotificationsBot')).toBe(
      'https://t.me/cowNotificationsBot?text=%2Funsubscribe'
    )
  })
})

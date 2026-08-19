import { buildTelegramDeepLink } from './buildTelegramDeepLink'

describe('buildTelegramDeepLink', () => {
  it('builds a t.me deep link from a bot username and token', () => {
    expect(buildTelegramDeepLink('cowNotificationsBot', 'abc123')).toBe('https://t.me/cowNotificationsBot?start=abc123')
  })
})

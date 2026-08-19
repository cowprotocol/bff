export function buildTelegramDeepLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${token}`
}

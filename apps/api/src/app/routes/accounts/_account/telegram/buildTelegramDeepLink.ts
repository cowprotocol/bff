export function buildTelegramDeepLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${token}`
}

// `/unsubscribe` must stay in sync with the commands apps/telegram's unsubscribeFlow accepts.
// Pre-filling it (rather than just opening the chat) means it still works if the user deleted
// their chat with the bot and lost the "Unsubscribe" button from the original message.
const UNSUBSCRIBE_COMMAND = '/unsubscribe'

export function buildTelegramUnsubscribeDeepLink(botUsername: string): string {
  return `https://t.me/${botUsername}?text=${encodeURIComponent(UNSUBSCRIBE_COMMAND)}`
}

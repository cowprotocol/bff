# Telegram Bot Deep-Link Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give cowswap-frontend a way to link a Telegram chat to a wallet address via bot deep-link (`/start <token>`) instead of the Telegram Login Widget, by adding token-issuance/status/disconnect routes to `apps/api` and a `/start` handler to `apps/telegram`.

**Architecture:** `apps/api` mints a short-lived single-use token in the existing Redis-backed `CacheRepository` and returns a `t.me/<bot>?start=<token>` deep link; `apps/telegram` (which already long-polls the bot) resolves that token on `/start` and calls two new cms endpoints (built in the sibling `cms` plan) to write/remove the subscription. Both apps talk to cms through a small addition to `PushSubscriptionsRepositoryCms`, not through the auto-generated `@cowprotocol/cms` typed client (see Task 1's note on why).

**Tech Stack:** Fastify + `json-schema-to-ts` (apps/api), `node-telegram-bot-api` (apps/telegram), `node-fetch` for the new cms calls, Jest for tests.

**Spec:** `/Users/shoom/IdeaProjects/cowswap/docs/superpowers/specs/2026-08-18-telegram-bot-deeplink-notifications-design.md` (sections "2. `bff` — `apps/api`" and "3. `bff` — `apps/telegram`")

**Depends on:** the `cms` repo plan (`/Users/shoom/IdeaProjects/cms/docs/superpowers/plans/2026-08-18-telegram-bot-link-endpoints.md`) must ship first — `POST /telegram-subscription/link-via-bot` and `POST /telegram-subscription/unlink-via-bot` must exist and be reachable with the deployed `CMS_API_KEY` before Task 1 here can be verified end-to-end (its unit tests don't need the live cms, but manual verification does).

## Global Constraints

- Both `apps/api` and `apps/telegram` must read/write the connect-token through the **same** Redis instance (`getCacheRepository()` returns a Redis-backed repository only when `redisClient` from `@cowprotocol/repositories` datasource is configured; otherwise it silently falls back to an in-process `CacheRepositoryMemory()`, which would make tokens minted by `apps/api` invisible to `apps/telegram`). Confirm Redis env vars are set in every environment this runs in before relying on this in production — this plan does not add a runtime assertion for it, per the spec's stated risk.
- The `@cowprotocol/cms` package (`GET`/`POST`/etc. from `getCmsClient()`) is generated from cms's published OpenAPI docs and versioned/installed via npm — it does not know about `/telegram-subscription/link-via-bot` or `/telegram-subscription/unlink-via-bot` until cms publishes a new version and bff bumps its dependency. Until that happens, calling those two paths through `getCmsClient()` would not type-check. This plan uses `node-fetch` directly against `${CMS_BASE_URL}${path}` with the existing `CMS_API_KEY` bearer token for just these two calls (Task 1), and leaves a comment pointing at the follow-up (swap to the typed client once `@cowprotocol/cms` is bumped).
- Follow existing repo conventions: `PushSubscriptionsRepository`/`PushSubscriptionsRepositoryCms` for cms-backed subscription data access (not ad-hoc fetches from route files or from `apps/telegram/src/main.ts`), fastify file-based routing under `apps/api/src/app/routes/`, `json-schema-to-ts` schemas for request/response typing like `apps/api/src/app/routes/accounts/_account/notifications.ts` and `apps/api/src/app/routes/ref-codes/_code/index.ts` already do.

---

### Task 1: `PushSubscriptionsRepository.linkTelegramSubscription` / `unlinkTelegramSubscription`

**Files:**
- Modify: `libs/repositories/src/repos/PushSubscriptionsRepository/PushSubscriptionsRepository.ts`
- Modify: `libs/repositories/src/repos/PushSubscriptionsRepository/PushSubscriptionsRepositoryCms.ts`
- Test: `libs/repositories/src/repos/PushSubscriptionsRepository/PushSubscriptionsRepositoryCms.spec.ts` (new)

**Interfaces:**
- Produces: `PushSubscriptionsRepository.linkTelegramSubscription(params: { account: string; chatId: number; firstName?: string; username?: string }): Promise<void>` and `.unlinkTelegramSubscription(params: { account: string }): Promise<void>`, both consumed by Task 2 (`apps/api` routes) and Task 3 (`apps/telegram` `/start` handler).

- [ ] **Step 1: Add the two methods to the interface**

In `libs/repositories/src/repos/PushSubscriptionsRepository/PushSubscriptionsRepository.ts`, add to the `PushSubscriptionsRepository` interface:

```ts
export interface PushSubscriptionsRepository {
  getAllSubscribedAccounts(): Promise<string[]>
  getAllTelegramSubscriptionsForAccounts(accounts: string[]): Promise<CmsTelegramSubscription[]>
  getPushNotifications(): Promise<CmsPushNotification[]>
  getNotificationsByAccount(params: { account: string }): Promise<NotificationModel[]>
  linkTelegramSubscription(params: {
    account: string
    chatId: number
    firstName?: string
    username?: string
  }): Promise<void>
  unlinkTelegramSubscription(params: { account: string }): Promise<void>
}
```

- [ ] **Step 2: Write the failing test**

Create `libs/repositories/src/repos/PushSubscriptionsRepository/PushSubscriptionsRepositoryCms.spec.ts`:

```ts
import fetch, { Response } from 'node-fetch'
import { PushSubscriptionsRepositoryCms } from './PushSubscriptionsRepositoryCms'

jest.mock('node-fetch')

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body)
    },
  } as unknown as Response
}

describe('PushSubscriptionsRepositoryCms', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...OLD_ENV, CMS_BASE_URL: 'https://cms.mock', CMS_API_KEY: 'mock-api-key' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  describe('linkTelegramSubscription', () => {
    it('POSTs to /telegram-subscription/link-via-bot with a bearer token', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(200, { success: true }))
      const repository = new PushSubscriptionsRepositoryCms()

      await repository.linkTelegramSubscription({ account: '0xabc', chatId: 42, username: 'alice' })

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://cms.mock/telegram-subscription/link-via-bot',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-api-key' }),
          body: JSON.stringify({ account: '0xabc', chatId: 42, username: 'alice' }),
        })
      )
    })

    it('throws when the cms responds with a non-2xx status', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(500, { error: 'boom' }))
      const repository = new PushSubscriptionsRepositoryCms()

      await expect(repository.linkTelegramSubscription({ account: '0xabc', chatId: 42 })).rejects.toThrow(
        /500/
      )
    })
  })

  describe('unlinkTelegramSubscription', () => {
    it('POSTs to /telegram-subscription/unlink-via-bot', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(200, { success: true }))
      const repository = new PushSubscriptionsRepositoryCms()

      await repository.unlinkTelegramSubscription({ account: '0xabc' })

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://cms.mock/telegram-subscription/unlink-via-bot',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ account: '0xabc' }) })
      )
    })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx nx test repositories --testFile=PushSubscriptionsRepositoryCms.spec.ts`
Expected: FAIL — `linkTelegramSubscription is not a function` (the methods don't exist yet).

- [ ] **Step 4: Implement the two methods**

In `libs/repositories/src/repos/PushSubscriptionsRepository/PushSubscriptionsRepositoryCms.ts`, add the import at the top:

```ts
import fetch from 'node-fetch'
```

Add these two methods to the `PushSubscriptionsRepositoryCms` class, after `getNotificationsByAccount`:

```ts
  async linkTelegramSubscription(params: {
    account: string
    chatId: number
    firstName?: string
    username?: string
  }): Promise<void> {
    await postToCmsInternalEndpoint('/telegram-subscription/link-via-bot', params)
  }

  async unlinkTelegramSubscription(params: { account: string }): Promise<void> {
    await postToCmsInternalEndpoint('/telegram-subscription/unlink-via-bot', params)
  }
```

Add this free function near the bottom of the file, alongside the other free functions (`getAllNotifications`, `getSubscribedAccounts`, etc.):

```ts
// TODO: switch to the typed `getCmsClient()` once @cowprotocol/cms is regenerated/published
// with these two routes — see docs/superpowers/plans/2026-08-18-telegram-bot-deeplink-backend.md
async function postToCmsInternalEndpoint(path: string, body: Record<string, unknown>): Promise<void> {
  const cmsBaseUrl = process.env.CMS_BASE_URL
  const cmsApiKey = process.env.CMS_API_KEY

  if (!cmsApiKey) {
    throw new Error('CMS_API_KEY is not set')
  }

  const response = await fetch(`${cmsBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cmsApiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`CMS request to ${path} failed with ${response.status}: ${text}`)
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx nx test repositories --testFile=PushSubscriptionsRepositoryCms.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add libs/repositories/src/repos/PushSubscriptionsRepository/
git commit -m "feat(repositories): add linkTelegramSubscription/unlinkTelegramSubscription to PushSubscriptionsRepository"
```

---

### Task 2: Connect-token generation/resolution module

**Files:**
- Create: `apps/api/src/app/routes/accounts/_account/telegram/connectToken.ts`
- Test: `apps/api/src/app/routes/accounts/_account/telegram/connectToken.spec.ts` (new)

**Interfaces:**
- Consumes: `CacheRepository` from `@cowprotocol/repositories` (`.get`, `.set` — already exists).
- Produces: `createConnectToken(cacheRepository: CacheRepository, account: string): Promise<string>` and `resolveConnectToken(cacheRepository: CacheRepository, token: string): Promise<string | null>`, both consumed by Task 3 (routes) and by the `apps/telegram` plan's `/start` handler.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/app/routes/accounts/_account/telegram/connectToken.spec.ts`:

```ts
import { CacheRepositoryMemory } from '@cowprotocol/repositories'
import { createConnectToken, resolveConnectToken } from './connectToken'

describe('connectToken', () => {
  it('resolves a freshly created token back to its account', async () => {
    const cacheRepository = new CacheRepositoryMemory()

    const token = await createConnectToken(cacheRepository, '0xabc')
    const resolved = await resolveConnectToken(cacheRepository, token)

    expect(resolved).toBe('0xabc')
  })

  it('resolving a token deletes it (single-use)', async () => {
    const cacheRepository = new CacheRepositoryMemory()
    const token = await createConnectToken(cacheRepository, '0xabc')

    await resolveConnectToken(cacheRepository, token)
    const secondResolve = await resolveConnectToken(cacheRepository, token)

    expect(secondResolve).toBeNull()
  })

  it('returns null for an unknown token', async () => {
    const cacheRepository = new CacheRepositoryMemory()

    const resolved = await resolveConnectToken(cacheRepository, 'does-not-exist')

    expect(resolved).toBeNull()
  })

  it('creates tokens that are unique across calls', async () => {
    const cacheRepository = new CacheRepositoryMemory()

    const tokenA = await createConnectToken(cacheRepository, '0xabc')
    const tokenB = await createConnectToken(cacheRepository, '0xabc')

    expect(tokenA).not.toBe(tokenB)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx nx test api --testFile=connectToken.spec.ts`
Expected: FAIL — cannot find module `./connectToken`.

- [ ] **Step 3: Implement `connectToken.ts`**

```ts
import { randomBytes } from 'crypto'

import { CacheRepository } from '@cowprotocol/repositories'

const TOKEN_PREFIX = 'telegram-connect:'
export const CONNECT_TOKEN_TTL_SECONDS = 10 * 60 // 10 minutes

export async function createConnectToken(cacheRepository: CacheRepository, account: string): Promise<string> {
  const token = randomBytes(16).toString('hex')

  await cacheRepository.set(TOKEN_PREFIX + token, account, CONNECT_TOKEN_TTL_SECONDS)

  return token
}

export async function resolveConnectToken(cacheRepository: CacheRepository, token: string): Promise<string | null> {
  const account = await cacheRepository.get(TOKEN_PREFIX + token)

  if (!account) {
    return null
  }

  // Single-use: delete on first successful resolution. CacheRepository has no
  // delete(); overwriting with a 1-second TTL is the smallest available proxy.
  await cacheRepository.set(TOKEN_PREFIX + token, '', 1)

  return account
}
```

Note: `CacheRepository` (see `libs/repositories/src/repos/CacheRepository/CacheRepository.ts`) only exposes `get`/`set`/`getTtl` — no `delete`. Overwriting the key with an empty value and a 1-second TTL is the pragmatic single-use mechanism available without widening that shared interface. If a later cleanup adds `CacheRepository.delete()`, switch this to use it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx nx test api --testFile=connectToken.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/routes/accounts/_account/telegram/connectToken.ts apps/api/src/app/routes/accounts/_account/telegram/connectToken.spec.ts
git commit -m "feat(api): add single-use Telegram connect-token create/resolve"
```

---

### Task 3: `apps/api` routes — connect-token, connect-status, disconnect

**Files:**
- Create: `apps/api/src/app/routes/accounts/_account/telegram/index.ts`
- Test: `apps/api/src/app/routes/accounts/_account/telegram/index.spec.ts` (new)

**Interfaces:**
- Consumes: `createConnectToken`/`resolveConnectToken` (Task 2), `PushSubscriptionsRepository.getAllTelegramSubscriptionsForAccounts`/`.unlinkTelegramSubscription` (Task 1, plus the pre-existing read method), `apiContainer` (`cacheRepositorySymbol`, `pushSubscriptionsRepositorySymbol`) from `../../../../inversify.config`.
- Produces: `POST /accounts/:account/telegram/connect-token` → `{ token: string; deepLink: string }`; `GET /accounts/:account/telegram/connect-status` → `{ connected: boolean; username?: string }`; `DELETE /accounts/:account/telegram/subscription` → `{ success: true }`. These three are exactly what the cowswap-frontend plan's `bffTelegramApi.ts` calls.

- [ ] **Step 1: Write the failing test**

Fastify route-level tests aren't already established for this pattern (existing route files like `notifications.ts`/`ref-codes` have no `.spec.ts` — they're covered by the affiliate module's approach of testing the underlying logic, not the route). Follow that: this task's test targets a small pure helper extracted for the bot-username lookup, since that's the only non-trivial logic in the route file itself (token creation/resolution and repository calls are already tested in Tasks 1–2).

Create `apps/api/src/app/routes/accounts/_account/telegram/index.spec.ts`:

```ts
import { buildTelegramDeepLink } from './index'

describe('buildTelegramDeepLink', () => {
  it('builds a t.me deep link from a bot username and token', () => {
    expect(buildTelegramDeepLink('cowNotificationsBot', 'abc123')).toBe('https://t.me/cowNotificationsBot?start=abc123')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx nx test api --testFile=index.spec.ts`
Expected: FAIL — `apps/api/src/app/routes/accounts/_account/telegram/index.ts` doesn't exist yet (or doesn't export `buildTelegramDeepLink`).

- [ ] **Step 3: Implement the route file**

```ts
import { FastifyPluginAsync } from 'fastify'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import {
  CacheRepository,
  cacheRepositorySymbol,
  isCmsEnabled,
  PushSubscriptionsRepository,
  pushSubscriptionsRepositorySymbol,
} from '@cowprotocol/repositories'
import { logger } from '@cowprotocol/shared'

import { ETHEREUM_ADDRESS_PATTERN } from '../../../../schemas'
import { apiContainer } from '../../../../inversify.config'
import { createConnectToken, resolveConnectToken } from './connectToken'

const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'cowNotificationsBot'

const paramsSchema = {
  type: 'object',
  required: ['account'],
  properties: {
    account: {
      title: 'account',
      description: 'Account of the user',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
  },
} as const satisfies JSONSchema

type ParamsSchema = FromSchema<typeof paramsSchema>

export function buildTelegramDeepLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${token}`
}

const telegram: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isCmsEnabled) {
    logger.warn('CMS is not enabled. Please check CMS_ENABLED and CMS_API_KEY environment variables')
    return
  }

  const cacheRepository: CacheRepository = apiContainer.get(cacheRepositorySymbol)
  const pushSubscriptionsRepository: PushSubscriptionsRepository = apiContainer.get(pushSubscriptionsRepositorySymbol)

  // POST /accounts/:account/telegram/connect-token
  fastify.post<{
    Params: ParamsSchema
    Reply: { token: string; deepLink: string }
  }>(
    '/connect-token',
    {
      schema: {
        description: 'Create a single-use Telegram bot connect token for this account',
        tags: ['accounts', 'telegram'],
        params: paramsSchema,
      },
    },
    async function (request, reply) {
      const account = request.params.account
      const token = await createConnectToken(cacheRepository, account)

      reply.send({ token, deepLink: buildTelegramDeepLink(TELEGRAM_BOT_USERNAME, token) })
    }
  )

  // GET /accounts/:account/telegram/connect-status
  fastify.get<{
    Params: ParamsSchema
    Reply: { connected: boolean; username?: string }
  }>(
    '/connect-status',
    {
      schema: {
        description: 'Check whether this account has a linked Telegram subscription',
        tags: ['accounts', 'telegram'],
        params: paramsSchema,
      },
    },
    async function (request, reply) {
      const account = request.params.account
      const subscriptions = await pushSubscriptionsRepository.getAllTelegramSubscriptionsForAccounts([account])

      reply.send({ connected: subscriptions.length > 0 })
    }
  )

  // DELETE /accounts/:account/telegram/subscription
  fastify.delete<{
    Params: ParamsSchema
    Reply: { success: true }
  }>(
    '/subscription',
    {
      schema: {
        description: 'Unlink this account\'s Telegram subscription',
        tags: ['accounts', 'telegram'],
        params: paramsSchema,
      },
    },
    async function (request, reply) {
      const account = request.params.account
      await pushSubscriptionsRepository.unlinkTelegramSubscription({ account })

      reply.send({ success: true })
    }
  )
}

export default telegram
```

Note: `connect-status`'s reply type omits `username` in the implementation above because `CmsTelegramSubscription` (see `PushSubscriptionsRepository.ts`) only carries `account`/`chatId` today, not `username`. If the frontend needs the username to display (`@handle`), that requires widening `CmsTelegramSubscription`/the cms `getAccountSubscriptions` `fields` selection to include `username` — call this out to whoever picks up that polish; the frontend plan degrades gracefully by treating a missing `username` as "connected, handle unknown."

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx nx test api --testFile=index.spec.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Manually verify the three routes against a running `apps/api`**

Run: `npx nx serve api` (check `apps/api/project.json` for the exact serve target name if this differs).

```bash
curl -i -X POST http://localhost:3000/accounts/0x1111111111111111111111111111111111111111/telegram/connect-token
curl -i http://localhost:3000/accounts/0x1111111111111111111111111111111111111111/telegram/connect-status
curl -i -X DELETE http://localhost:3000/accounts/0x1111111111111111111111111111111111111111/telegram/subscription
```

Expected: 200s with the shapes above. The `connect-status`/`subscription` calls will only succeed end-to-end (i.e. actually reach cms) once the `cms` plan's routes are deployed and this environment's `CMS_API_KEY` has been granted access — until then expect them to surface the cms's error (e.g. a 401/500 bubbling up), which is still useful confirmation that the route is wired correctly.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/routes/accounts/_account/telegram/
git commit -m "feat(api): add Telegram connect-token/connect-status/subscription routes"
```

---

### Task 4: `apps/telegram` — handle incoming `/start <token>`

**Files:**
- Create: `apps/telegram/src/startCommand.ts`
- Test: `apps/telegram/src/startCommand.spec.ts` (new)
- Modify: `apps/telegram/src/main.ts`

**Interfaces:**
- Consumes: `resolveConnectToken` (Task 2 — note this lives under `apps/api`; see Step 3 below for why it's duplicated rather than imported), `PushSubscriptionsRepository.linkTelegramSubscription` (Task 1), `CacheRepository` from `@cowprotocol/repositories`, `TelegramBot` from `node-telegram-bot-api`.
- Produces: `parseStartCommand(text: string | undefined): string | null` and `handleStartCommand(params: { bot: TelegramBot; msg: TelegramBot.Message; cacheRepository: CacheRepository; pushSubscriptionsRepository: PushSubscriptionsRepository }): Promise<void>`, wired into `main.ts` via `telegramBot.on('message', ...)`.

- [ ] **Step 1: Write the failing test**

Create `apps/telegram/src/startCommand.spec.ts`:

```ts
import { CacheRepositoryMemory } from '@cowprotocol/repositories'
import { parseStartCommand, handleStartCommand } from './startCommand'

describe('parseStartCommand', () => {
  it('extracts the token from "/start <token>"', () => {
    expect(parseStartCommand('/start abc123')).toBe('abc123')
  })

  it('returns null for plain "/start" with no token', () => {
    expect(parseStartCommand('/start')).toBeNull()
  })

  it('returns null for unrelated messages', () => {
    expect(parseStartCommand('hello there')).toBeNull()
  })

  it('returns null for undefined text', () => {
    expect(parseStartCommand(undefined)).toBeNull()
  })
})

describe('handleStartCommand', () => {
  function buildMsg(text: string) {
    return {
      text,
      chat: { id: 555 },
      from: { first_name: 'Ada', username: 'ada' },
    } as import('node-telegram-bot-api').Message
  }

  it('links the subscription and confirms when the token is valid', async () => {
    const cacheRepository = new CacheRepositoryMemory()
    await cacheRepository.set('telegram-connect:abc123', '0xabc', 600)
    const linkTelegramSubscription = jest.fn().mockResolvedValue(undefined)
    const pushSubscriptionsRepository = { linkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleStartCommand({ bot, msg: buildMsg('/start abc123'), cacheRepository, pushSubscriptionsRepository })

    expect(linkTelegramSubscription).toHaveBeenCalledWith({
      account: '0xabc',
      chatId: 555,
      firstName: 'Ada',
      username: 'ada',
    })
    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/connected/i))
  })

  it('replies with an expired-link message when the token is unknown', async () => {
    const cacheRepository = new CacheRepositoryMemory()
    const linkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { linkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleStartCommand({ bot, msg: buildMsg('/start does-not-exist'), cacheRepository, pushSubscriptionsRepository })

    expect(linkTelegramSubscription).not.toHaveBeenCalled()
    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/expired/i))
  })

  it('ignores non-/start messages', async () => {
    const cacheRepository = new CacheRepositoryMemory()
    const linkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { linkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleStartCommand({ bot, msg: buildMsg('hi'), cacheRepository, pushSubscriptionsRepository })

    expect(linkTelegramSubscription).not.toHaveBeenCalled()
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx nx test telegram --testFile=startCommand.spec.ts`
Expected: FAIL — cannot find module `./startCommand`.

- [ ] **Step 3: Implement `startCommand.ts`**

`resolveConnectToken` from Task 2 lives under `apps/api/src/app/routes/accounts/_account/telegram/connectToken.ts`, which is not importable from `apps/telegram` (separate Nx app, not a shared lib). Rather than reach across app boundaries, duplicate the small token-resolution logic here against the same `CacheRepository` key prefix — the two apps agree on the `telegram-connect:<token>` key format, not on shared code:

```ts
import { CacheRepository, PushSubscriptionsRepository } from '@cowprotocol/repositories'
import TelegramBot from 'node-telegram-bot-api'

const TOKEN_PREFIX = 'telegram-connect:'

const START_COMMAND_PATTERN = /^\/start(?:\s+(\S+))?/

export function parseStartCommand(text: string | undefined): string | null {
  if (!text) return null

  const match = text.match(START_COMMAND_PATTERN)

  return match?.[1] ?? null
}

async function resolveConnectToken(cacheRepository: CacheRepository, token: string): Promise<string | null> {
  const account = await cacheRepository.get(TOKEN_PREFIX + token)

  if (!account) {
    return null
  }

  await cacheRepository.set(TOKEN_PREFIX + token, '', 1)

  return account
}

export async function handleStartCommand(params: {
  bot: TelegramBot
  msg: TelegramBot.Message
  cacheRepository: CacheRepository
  pushSubscriptionsRepository: PushSubscriptionsRepository
}): Promise<void> {
  const { bot, msg, cacheRepository, pushSubscriptionsRepository } = params
  const token = parseStartCommand(msg.text)

  if (!token) return

  const account = await resolveConnectToken(cacheRepository, token)

  if (!account) {
    await bot.sendMessage(msg.chat.id, 'This link has expired — please reconnect from CoW Swap.')
    return
  }

  await pushSubscriptionsRepository.linkTelegramSubscription({
    account,
    chatId: msg.chat.id,
    firstName: msg.from?.first_name,
    username: msg.from?.username,
  })

  await bot.sendMessage(msg.chat.id, "You're connected! You'll now receive CoW Swap notifications here.")
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx nx test telegram --testFile=startCommand.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Wire it into `main.ts`**

In `apps/telegram/src/main.ts`, add the import:

```ts
import { getCacheRepository } from '@cowprotocol/services'
import { handleStartCommand } from './startCommand'
```

Inside `mainLoop()`, right after `telegramBot = getTelegramBot()` (and before `await doForever(...)`), add:

```ts
  // Handle incoming /start <token> deep-link messages
  const cacheRepository = getCacheRepository()
  const pushSubscriptionsRepository = getPushSubscriptionsRepository()
  telegramBot.on('message', (msg) => {
    handleStartCommand({ bot: telegramBot, msg, cacheRepository, pushSubscriptionsRepository }).catch((error) =>
      logger.error(error, '[telegram] Error handling /start command')
    )
  })
```

`getPushSubscriptionsRepository` is already imported in this file for the existing notification-sending loop — reuse the same import, don't add a second one.

- [ ] **Step 6: Manually verify against the real bot**

With `CMS_API_KEY`/`CMS_BASE_URL`/`REDIS_URL`/`TELEGRAM_SECRET` set to point at your local/staging stack (and after the `apps/api` connect-token route from Task 3 is reachable), run: `npx nx serve telegram`. Then:

1. Call the local `apps/api` connect-token endpoint for a test account and copy the returned `deepLink`.
2. Open that link in Telegram and tap "Start".
3. Confirm the bot replies with the "You're connected!" message.
4. Confirm a row appears in cms's Telegram subscription content type for that account.
5. Re-send the exact same `/start <token>` message again; confirm the bot now replies with the expired-link message (single-use).

- [ ] **Step 7: Commit**

```bash
git add apps/telegram/src/startCommand.ts apps/telegram/src/startCommand.spec.ts apps/telegram/src/main.ts
git commit -m "feat(telegram): handle /start <token> deep-link to link a subscription"
```

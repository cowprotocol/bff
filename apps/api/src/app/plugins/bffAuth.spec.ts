import fastify, { FastifyInstance } from 'fastify'

async function buildApp(authorizedOrigins?: string): Promise<FastifyInstance> {
  if (authorizedOrigins !== undefined) {
    process.env.AUTHORIZED_ORIGINS = authorizedOrigins
  } else {
    delete process.env.AUTHORIZED_ORIGINS
  }

  // Force re-evaluation of the AUTHORIZED_ORIGINS IIFE with the current env
  let plugin: typeof import('./bffAuth') | undefined
  jest.isolateModules(() => {
    plugin = require('./bffAuth')
  })
  if (!plugin) {
    throw new Error('bffAuth plugin failed to load')
  }

  const app = fastify()
  await app.register(plugin.default)
  app.get('/proxies/test', async () => ({ ok: true }))
  app.get('/public/test', async () => ({ ok: true }))
  await app.ready()
  return app
}

function protectedRequest(app: FastifyInstance | undefined, origin?: string) {
  return requireApp(app).inject({
    method: 'GET',
    url: '/proxies/test',
    headers: origin ? { origin } : undefined,
  })
}

function publicRequest(app: FastifyInstance | undefined, origin: string) {
  return requireApp(app).inject({
    method: 'GET',
    url: '/public/test',
    headers: { origin },
  })
}

function requireApp(app: FastifyInstance | undefined): FastifyInstance {
  if (!app) {
    throw new Error('Fastify app was not initialized')
  }
  return app
}

describe('bffAuth', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
    delete process.env.AUTHORIZED_ORIGINS
  })

  it('fails startup when AUTHORIZED_ORIGINS is set but contains no valid entries', () => {
    process.env.AUTHORIZED_ORIGINS = ' , '

    expect(() => {
      jest.isolateModules(() => {
        require('./bffAuth')
      })
    }).toThrow('Malformed AUTHORIZED_ORIGINS: expected at least one hostname')
  })

  it('fails startup in production when AUTHORIZED_ORIGINS is not set', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    delete process.env.AUTHORIZED_ORIGINS

    try {
      expect(() => {
        jest.isolateModules(() => {
          require('./bffAuth')
        })
      }).toThrow('Missing AUTHORIZED_ORIGINS in production')
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = originalNodeEnv
      }
    }
  })

  it('fails startup when AUTHORIZED_ORIGINS contains a malformed Vercel entry', () => {
    process.env.AUTHORIZED_ORIGINS = 'vercel:swap-dev:cowswap-dev'

    expect(() => {
      jest.isolateModules(() => {
        require('./bffAuth')
      })
    }).toThrow('Malformed AUTHORIZED_ORIGINS: invalid Vercel entry')
  })

  describe('when AUTHORIZED_ORIGINS is not set', () => {
    beforeEach(async () => {
      app = await buildApp(undefined)
    })

    it('allows any origin on a protected path', async () => {
      const res = await protectedRequest(app, 'https://attacker.com')
      expect(res.statusCode).toBe(200)
    })
  })

  describe('when AUTHORIZED_ORIGINS is set to cow.fi', () => {
    beforeEach(async () => {
      app = await buildApp('cow.fi')
    })

    it('blocks requests with no origin header', async () => {
      const res = await protectedRequest(app)
      expect(res.statusCode).toBe(403)
    })

    it('allows localhost origins', async () => {
      const res = await protectedRequest(app, 'http://localhost:3000')
      expect(res.statusCode).toBe(200)
    })

    it('allows the exact root domain', async () => {
      const res = await protectedRequest(app, 'https://cow.fi')
      expect(res.statusCode).toBe(200)
    })

    it('blocks a direct subdomain unless a leading-dot entry is configured', async () => {
      const res = await protectedRequest(app, 'https://swap.cow.fi')
      expect(res.statusCode).toBe(403)
    })

    it('blocks a deeply nested subdomain unless a leading-dot entry is configured', async () => {
      const res = await protectedRequest(app, 'https://staging.swap.cow.fi')
      expect(res.statusCode).toBe(403)
    })

    it('blocks a domain that shares a suffix but is not a subdomain (evilcow.fi)', async () => {
      const res = await protectedRequest(app, 'https://evilcow.fi')
      expect(res.statusCode).toBe(403)
    })

    it('blocks an unauthorized domain entirely', async () => {
      const res = await protectedRequest(app, 'https://attacker.com')
      expect(res.statusCode).toBe(403)
    })

    it('blocks HTTP origins for remote domains', async () => {
      const res = await protectedRequest(app, 'http://cow.fi')
      expect(res.statusCode).toBe(403)
    })

    it('blocks origins with a non-default port', async () => {
      const res = await protectedRequest(app, 'https://cow.fi:444')
      expect(res.statusCode).toBe(403)
    })

    it('allows any origin on an unprotected path', async () => {
      const res = await publicRequest(app, 'https://attacker.com')
      expect(res.statusCode).toBe(200)
    })
  })

  describe('when AUTHORIZED_ORIGINS is set to cow.fi,.cow.fi', () => {
    beforeEach(async () => {
      app = await buildApp('cow.fi,.cow.fi')
    })

    it('allows the exact root domain', async () => {
      const res = await protectedRequest(app, 'https://cow.fi')
      expect(res.statusCode).toBe(200)
    })

    it('allows a direct subdomain through the leading-dot entry', async () => {
      const res = await protectedRequest(app, 'https://swap.cow.fi')
      expect(res.statusCode).toBe(200)
    })

    it('allows a deeply nested subdomain through the leading-dot entry', async () => {
      const res = await protectedRequest(app, 'https://staging.swap.cow.fi')
      expect(res.statusCode).toBe(200)
    })

    it('blocks the leading-dot entry itself as a hostname', async () => {
      const res = await protectedRequest(app, 'https://.cow.fi')
      expect(res.statusCode).toBe(403)
    })
  })

  describe('when AUTHORIZED_ORIGINS contains a specific subdomain (notevil.valid-domain.com)', () => {
    beforeEach(async () => {
      app = await buildApp('notevil.valid-domain.com')
    })

    it('allows the exact authorized subdomain', async () => {
      const res = await protectedRequest(app, 'https://notevil.valid-domain.com')
      expect(res.statusCode).toBe(200)
    })

    it('blocks sub-subdomains without a leading-dot entry', async () => {
      const res = await protectedRequest(app, 'https://preview.notevil.valid-domain.com')
      expect(res.statusCode).toBe(403)
    })

    it('blocks a domain that shares a suffix but is not a subdomain (evil-notevil.valid-domain.com)', async () => {
      const res = await protectedRequest(app, 'https://evil-notevil.valid-domain.com')
      expect(res.statusCode).toBe(403)
    })

    it('blocks the parent domain (valid-domain.com)', async () => {
      const res = await protectedRequest(app, 'https://valid-domain.com')
      expect(res.statusCode).toBe(403)
    })
  })

  describe('when AUTHORIZED_ORIGINS contains a leading-dot entry (.notevil.valid-domain.com)', () => {
    beforeEach(async () => {
      app = await buildApp('.notevil.valid-domain.com')
    })

    it('allows subdomains of the leading-dot entry', async () => {
      const res = await protectedRequest(app, 'https://preview.notevil.valid-domain.com')
      expect(res.statusCode).toBe(200)
    })

    it('blocks the bare domain for the leading-dot entry', async () => {
      const res = await protectedRequest(app, 'https://notevil.valid-domain.com')
      expect(res.statusCode).toBe(403)
    })
  })

  describe('when AUTHORIZED_ORIGINS contains a Vercel preview entry', () => {
    beforeEach(async () => {
      app = await buildApp('vercel:swap-dev:cowswap-dev:swap')
    })

    it('allows Vercel branch previews for the configured project and scope', async () => {
      const res = await protectedRequest(app, 'https://swap-dev-git-fix-widget-isolation-cowswap-dev.vercel.app')
      expect(res.statusCode).toBe(200)
    })

    it('allows Vercel build previews for the configured project and scope', async () => {
      const res = await protectedRequest(app, 'https://swap-g5l4tofpk-cowswap-dev.vercel.app')
      expect(res.statusCode).toBe(200)
    })

    it('blocks max-length Vercel branch previews with only a fake scope fragment in the branch name', async () => {
      const branch = 'a'.repeat(48)
      const res = await protectedRequest(app, `https://swap-dev-git-${branch}-c.vercel.app`)
      expect(res.statusCode).toBe(403)
    })

    it('blocks max-length Vercel branch previews without a scope fragment', async () => {
      const branch = 'a'.repeat(50)
      const res = await protectedRequest(app, `https://swap-dev-git-${branch}.vercel.app`)
      expect(res.statusCode).toBe(403)
    })

    it('blocks Vercel build previews with hyphenated build ids', async () => {
      const res = await protectedRequest(app, 'https://swap-foo-bar-cowswap-dev.vercel.app')
      expect(res.statusCode).toBe(403)
    })

    it('blocks Vercel branch previews for a different project in the same scope', async () => {
      const res = await protectedRequest(app, 'https://explorer-dev-git-fix-widget-isolation-cowswap-dev.vercel.app')
      expect(res.statusCode).toBe(403)
    })

    it('blocks Vercel hosts with extra labels before vercel.app', async () => {
      const res = await protectedRequest(app, 'https://swap-dev-git-fix.attacker-cowswap-dev.vercel.app')
      expect(res.statusCode).toBe(403)
    })
  })

  describe('when AUTHORIZED_ORIGINS contains a Vercel preview entry with a long build project', () => {
    beforeEach(async () => {
      app = await buildApp('vercel:swap-dev:cowswap-dev:very-long-build-project-name-that-pushes-labels')
    })

    it('allows max-length Vercel build previews with a truncated scope suffix', async () => {
      const res = await protectedRequest(
        app,
        'https://very-long-build-project-name-that-pushes-labels-g5l4tofpk-cowsw.vercel.app'
      )
      expect(res.statusCode).toBe(200)
    })

    it('blocks max-length Vercel build previews without a scope fragment', async () => {
      const res = await protectedRequest(
        app,
        'https://very-long-build-project-name-that-pushes-labels-g5l4tofpkabc123.vercel.app'
      )
      expect(res.statusCode).toBe(403)
    })
  })

  describe('when AUTHORIZED_ORIGINS contains multiple domains', () => {
    beforeEach(async () => {
      app = await buildApp('cow.fi,.cow.fi,swap-dev-5u6.pages.dev,.swap-dev-5u6.pages.dev')
    })

    it('allows an origin matching the first leading-dot entry', async () => {
      const res = await protectedRequest(app, 'https://swap.cow.fi')
      expect(res.statusCode).toBe(200)
    })

    it('allows an origin matching the exact pages.dev entry', async () => {
      const res = await protectedRequest(app, 'https://swap-dev-5u6.pages.dev')
      expect(res.statusCode).toBe(200)
    })

    it('allows a subdomain matching the pages.dev leading-dot entry', async () => {
      const res = await protectedRequest(app, 'https://preview.swap-dev-5u6.pages.dev')
      expect(res.statusCode).toBe(200)
    })

    it('blocks a suffix-squatting domain against the second entry (attacker-swap-dev-5u6.pages.dev)', async () => {
      const res = await protectedRequest(app, 'https://attacker-swap-dev-5u6.pages.dev')
      expect(res.statusCode).toBe(403)
    })

    it('blocks a domain that matches neither entry', async () => {
      const res = await protectedRequest(app, 'https://attacker.com')
      expect(res.statusCode).toBe(403)
    })
  })
})

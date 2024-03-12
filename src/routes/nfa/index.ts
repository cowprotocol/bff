import {FastifyPluginAsync} from 'fastify'
import fastifyPostgres from '@fastify/postgres'
import {NFA_QUERY} from './query'

const nfa: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    const {NFA_DB_HOST, NFA_DB_PORT, NFA_DB_LOGIN, NFA_DB_PASS, NFA_DB_NAME} = fastify.config

    fastify.register(fastifyPostgres, {
        connectionString: `postgres://${NFA_DB_LOGIN}:${NFA_DB_PASS}@${NFA_DB_HOST}:${NFA_DB_PORT}/${NFA_DB_NAME}`
    })

    fastify.get('/', async function (request, reply) {
        console.log('START')
        const client = await fastify.pg.connect()
        console.log('CONNECTED')
        try {
            const { rows } = await client.query(NFA_QUERY, [])
            console.log('ROWS', rows)
            return rows
        } finally {
            client.release()
        }
    })
}

export default nfa;

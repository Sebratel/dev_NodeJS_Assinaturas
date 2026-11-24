// Só para o CI: monta o token do Hub Apps como o hub-api monta (jsonwebtoken, HS256, 5 min).
// Uso: node .github/ci/hub-token.mjs <segredo> <appId> <email>
import { createHmac } from 'node:crypto'

const [secret, appId, email] = process.argv.slice(2)
const now = Math.floor(Date.now() / 1000)
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'ci', email, name: 'CI', appId, iat: now, exp: now + 300 })}`
process.stdout.write(`${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`)

#!/usr/bin/env node
// Muda a versão do sistema em todos os lugares de uma vez (cicd-deploy-backend › validacoes-ci, regra 1):
// package.json da raiz, api/ e web/ (com os package-lock.json) e o padrão ${APP_VERSION:-X.Y.Z} do compose.
// O CI (validate-version.py) recusa versão divergente entre eles ou não maior que a do ambiente.
// Uso: npm run version:set -- 1.2.3
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('Uso: npm run version:set -- X.Y.Z (sem -beta, -SNAPSHOT etc.)')
  process.exit(1)
}

function editJson(relativePath, edit) {
  const file = join(root, relativePath)
  const data = JSON.parse(readFileSync(file, 'utf8'))
  edit(data)
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`  ${relativePath}`)
}

editJson('package.json', (pkg) => (pkg.version = version))
for (const dir of ['api', 'web']) {
  editJson(`${dir}/package.json`, (pkg) => (pkg.version = version))
  editJson(`${dir}/package-lock.json`, (lock) => {
    lock.version = version
    if (lock.packages?.['']) lock.packages[''].version = version
  })
}

const composePath = join(root, 'docker-compose.portainer.yml')
const compose = readFileSync(composePath, 'utf8')
// Função no replace: o texto de troca nunca é interpretado como padrão especial ($&, $`).
const updated = compose.replace(/APP_VERSION:-\d+\.\d+\.\d+\}/g, () => `APP_VERSION:-${version}}`)
writeFileSync(composePath, updated)
console.log('  docker-compose.portainer.yml')
console.log(`Versão ${version} aplicada.`)

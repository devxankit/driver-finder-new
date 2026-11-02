/**
 * Puts the seeded images back into uploads/ before the server starts.
 *
 * Hosts without a persistent disk (Render free plan) start every deploy and
 * restart with an empty uploads/ folder, while the database still points at
 * /uploads/categories/t-truck.jpg, /uploads/photos/demo-driver-01.jpg and so
 * on. This copies those files from the repository (no database access, so it
 * is quick and safe to run on every start). Photos uploaded by users are not
 * in the repository and need a persistent disk to survive restarts.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { uploadRoot } from '../middleware/upload.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const appImages = path.resolve(here, '../../../mobile-app/src/assets/images')
const people = path.resolve(here, '../../seed-assets/people')

function copy(src, folder, name = path.basename(src)) {
  if (!fs.existsSync(src)) return 0
  const dir = path.join(uploadRoot, 'public', folder)
  fs.mkdirSync(dir, { recursive: true })
  const dest = path.join(dir, name)
  if (fs.existsSync(dest)) return 0
  fs.copyFileSync(src, dest)
  return 1
}

let n = 0
if (fs.existsSync(appImages)) {
  for (const f of fs.readdirSync(appImages)) {
    if (/^t-.*\.jpg$/.test(f)) n += copy(path.join(appImages, f), 'categories')
    if (/^(driver|owner)-.*\.jpg$/.test(f)) n += copy(path.join(appImages, f), 'photos')
  }
}
if (fs.existsSync(people)) {
  for (const f of fs.readdirSync(people)) n += copy(path.join(people, f), 'photos', `demo-${f}`)
}
fs.mkdirSync(path.join(uploadRoot, 'private'), { recursive: true })
const sample = path.join(uploadRoot, 'private', 'demo-sample.txt')
if (!fs.existsSync(sample)) fs.writeFileSync(sample, 'Demo account: no real document.')

console.log(`[assets] restored ${n} seeded image(s) into ${uploadRoot}`)

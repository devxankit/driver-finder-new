/**
 * Restores a backup made by backup.js.
 *
 *   npm run restore -- ~/backups/2026-11-15-21-30            (dry run: shows what it would do)
 *   npm run restore -- ~/backups/2026-11-15-21-30 --yes      (replaces the database collections)
 *   ... --yes --only=jobs,users                              (just these collections)
 *
 * Collections in the backup are emptied and refilled; uploads are extracted
 * over the uploads folder (existing files with the same name are replaced,
 * newer files are kept). Stop the backend first (pm2 stop driver-finder).
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import readline from 'node:readline'
import { execFileSync } from 'node:child_process'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { uploadRoot } from '../middleware/upload.js'

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
const yes = args.includes('--yes')
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',')
if (!dir || !fs.existsSync(path.join(dir, 'manifest.json'))) {
  console.log('Usage: npm run restore -- <backup folder> [--yes] [--only=a,b]')
  process.exit(1)
}

const { EJSON } = mongoose.mongo.BSON
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl.gz') && (!only || only.includes(f.replace('.jsonl.gz', ''))))
console.log(`${yes ? 'Restoring' : 'Dry run'} from ${dir}: ${files.length} collections${fs.existsSync(path.join(dir, 'uploads.tar.gz')) && !only ? ' + uploads' : ''}`)
if (!yes) {
  console.log(files.join(', '))
  console.log('Nothing changed. Add --yes to restore.')
  process.exit(0)
}

await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 15000 })
const db = mongoose.connection.db
for (const f of files) {
  const name = f.replace('.jsonl.gz', '')
  const docs = []
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, f)).pipe(zlib.createGunzip()), crlfDelay: Infinity })
  for await (const line of rl) if (line.trim()) docs.push(EJSON.parse(line, { relaxed: false }))
  await db.collection(name).deleteMany({})
  for (let i = 0; i < docs.length; i += 1000) await db.collection(name).insertMany(docs.slice(i, i + 1000), { ordered: false })
  console.log(`  ${name}: ${docs.length}`)
}
await mongoose.disconnect()

if (!only && fs.existsSync(path.join(dir, 'uploads.tar.gz'))) {
  const parent = path.dirname(uploadRoot)
  fs.mkdirSync(parent, { recursive: true })
  const archive = path.relative(parent, path.join(dir, 'uploads.tar.gz')).split(path.sep).join('/')
  execFileSync('tar', ['-xzf', archive], { cwd: parent })
  console.log(`  uploads extracted into ${uploadRoot}`)
}
console.log('Done. Start the backend again (pm2 start driver-finder).')

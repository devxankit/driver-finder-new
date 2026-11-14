/**
 * Nightly backup: every MongoDB collection (Extended JSON, gzipped) and the
 * uploads folder, into BACKUP_DIR/<date>/ (default ~/backups). Keeps 14 days.
 *
 *   npm run backup                      (cron on the VPS runs this)
 *   npm run restore -- <folder> [--yes] (see restore.js)
 *
 * The free Atlas tier has no backups of its own, and uploads live only on the
 * VPS disk, so this is the safety net against a bad deploy, a wrong admin
 * click or a deleted folder. Copy ~/backups off the server now and then to
 * survive losing the server itself.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { uploadRoot } from '../middleware/upload.js'

const KEEP_DAYS = 14
const root = path.resolve(process.env.BACKUP_DIR || path.join(os.homedir(), 'backups'))
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const dir = path.join(root, stamp)
fs.mkdirSync(dir, { recursive: true })

const { EJSON } = mongoose.mongo.BSON
await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 15000 })
const db = mongoose.connection.db
const counts = {}
for (const { name, type } of await db.listCollections().toArray()) {
  if (type !== 'collection' || name.startsWith('system.')) continue
  let n = 0
  async function* lines() {
    for await (const doc of db.collection(name).find()) {
      n++
      yield EJSON.stringify(doc, { relaxed: false }) + '\n'
    }
  }
  await pipeline(Readable.from(lines()), zlib.createGzip(), fs.createWriteStream(path.join(dir, `${name}.jsonl.gz`)))
  counts[name] = n
}
await mongoose.disconnect()

// Uploads (photos, vehicle images, KYC documents) as one archive.
if (fs.existsSync(uploadRoot)) {
  // Run from the uploads' parent with a relative, forward-slash archive path (GNU tar on
  // Windows misreads "C:\..." and backslashes; on Linux this is the same as an absolute path).
  const parent = path.dirname(uploadRoot)
  const archive = path.relative(parent, path.join(dir, 'uploads.tar.gz')).split(path.sep).join('/')
  execFileSync('tar', ['-czf', archive, path.basename(uploadRoot)], { cwd: parent })
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ at: new Date().toISOString(), database: db.databaseName, counts }, null, 1))

// Remove backups older than KEEP_DAYS.
const cutoff = Date.now() - KEEP_DAYS * 24 * 3600 * 1000
for (const d of fs.readdirSync(root)) {
  const p = path.join(root, d)
  if (/^\d{4}-\d{2}-\d{2}/.test(d) && fs.statSync(p).mtimeMs < cutoff) fs.rmSync(p, { recursive: true, force: true })
}

const size = execFileSync('du', ['-sh', dir]).toString().split('\t')[0]
console.log(`Backup ${dir} (${size}): ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`)

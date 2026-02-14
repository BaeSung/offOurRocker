import { safeStorage } from 'electron'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Encrypt and store an API key using Electron's safeStorage.
 * Keys are stored as base64-encoded encrypted blobs in the settings table.
 */
export function storeApiKey(keyName: string, plainKey: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system')
  }

  const encrypted = safeStorage.encryptString(plainKey)
  const base64 = encrypted.toString('base64')

  const db = getDb()
  const settingKey = `_encrypted_${keyName}`

  const existing = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, settingKey))
    .get()

  if (existing) {
    db.update(schema.settings)
      .set({ value: base64 })
      .where(eq(schema.settings.key, settingKey))
      .run()
  } else {
    db.insert(schema.settings)
      .values({ key: settingKey, value: base64 })
      .run()
  }
}

/**
 * Retrieve and decrypt an API key.
 * Returns null if the key doesn't exist.
 */
export function getApiKey(keyName: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    return null
  }

  const db = getDb()
  const settingKey = `_encrypted_${keyName}`

  const row = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, settingKey))
    .get()

  if (!row) return null

  try {
    const encrypted = Buffer.from(row.value, 'base64')
    return safeStorage.decryptString(encrypted)
  } catch {
    return null
  }
}

/**
 * Delete a stored API key.
 */
export function deleteApiKey(keyName: string): void {
  const db = getDb()
  const settingKey = `_encrypted_${keyName}`
  db.delete(schema.settings)
    .where(eq(schema.settings.key, settingKey))
    .run()
}

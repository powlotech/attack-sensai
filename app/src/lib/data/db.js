import { openDB } from 'idb'

/** @returns {Promise<import('idb').IDBPDatabase>} */
export const openDb = () =>
  openDB('attack-sensai', 1, {
    upgrade(db) {
      db.createObjectStore('meta')
      db.createObjectStore('layers', { keyPath: 'id' })
    },
  })

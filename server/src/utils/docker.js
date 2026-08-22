import { existsSync } from 'fs'

export function isDocker() {
  return existsSync('/.dockerenv')
}

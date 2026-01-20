/**
 * Vitest Setup File
 *
 * Nuxt auto-imports のグローバル定義
 */

import { vi } from 'vitest'
import * as h3 from 'h3'

// Nuxt auto-imports をグローバルに定義
// @ts-ignore
globalThis.defineEventHandler = h3.defineEventHandler
// @ts-ignore
globalThis.createError = h3.createError
// @ts-ignore
globalThis.getQuery = (event: any) => event._query || {}
// @ts-ignore
globalThis.getCookie = (event: any, name: string) => event._cookies?.[name] || null
// @ts-ignore
globalThis.getHeaders = (event: any) => event.node?.req?.headers || {}
// @ts-ignore
globalThis.setCookie = (event: any, name: string, value: string, options?: any) => {
  event.node?.res?.setHeader?.('Set-Cookie', `${name}=${value}`)
}
// @ts-ignore
globalThis.readBody = async (event: any) => event._body || {}

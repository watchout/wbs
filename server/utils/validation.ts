/**
 * 入力バリデーションユーティリティ（SEC-004）
 *
 * 全APIで共通のバリデーションルールを提供
 * 個別APIでの手動バリデーションを補完する統一インターフェース
 */

import { createError } from 'h3'

/**
 * 文字列バリデーション
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    patternMessage?: string
  } = {}
): string | null {
  const { required = false, minLength, maxLength, pattern, patternMessage } = options

  if (value === null || value === undefined || value === '') {
    if (required) {
      throw createError({
        statusCode: 400,
        statusMessage: `${fieldName}は必須です`,
      })
    }
    return null
  }

  if (typeof value !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は文字列で指定してください`,
    })
  }

  const trimmed = value.trim()

  if (required && trimmed === '') {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は必須です`,
    })
  }

  if (minLength !== undefined && trimmed.length < minLength) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は${minLength}文字以上で入力してください`,
    })
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は${maxLength}文字以内で入力してください`,
    })
  }

  if (pattern && !pattern.test(trimmed)) {
    throw createError({
      statusCode: 400,
      statusMessage: patternMessage || `${fieldName}の形式が不正です`,
    })
  }

  return trimmed
}

/**
 * メールアドレスバリデーション
 */
export function validateEmail(value: unknown, fieldName = 'メールアドレス'): string {
  const email = validateString(value, fieldName, { required: true, maxLength: 254 })
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は必須です`,
    })
  }

  // RFC 5322 簡易パターン（厳密ではないが十分な精度）
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!emailPattern.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}の形式が不正です`,
    })
  }

  return email.toLowerCase()
}

/**
 * 数値バリデーション
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean
    min?: number
    max?: number
    integer?: boolean
  } = {}
): number | null {
  const { required = false, min, max, integer = false } = options

  if (value === null || value === undefined || value === '') {
    if (required) {
      throw createError({
        statusCode: 400,
        statusMessage: `${fieldName}は必須です`,
      })
    }
    return null
  }

  const num = typeof value === 'number' ? value : Number(value)

  if (isNaN(num)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は数値で指定してください`,
    })
  }

  if (integer && !Number.isInteger(num)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は整数で指定してください`,
    })
  }

  if (min !== undefined && num < min) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は${min}以上で指定してください`,
    })
  }

  if (max !== undefined && num > max) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は${max}以下で指定してください`,
    })
  }

  return num
}

/**
 * UUID バリデーション
 */
export function validateUUID(value: unknown, fieldName: string): string {
  const str = validateString(value, fieldName, { required: true })
  if (!str) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}は必須です`,
    })
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(str)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}のID形式が不正です`,
    })
  }

  return str
}

/**
 * 日時バリデーション
 */
export function validateDateTime(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): Date | null {
  const { required = false } = options

  if (value === null || value === undefined || value === '') {
    if (required) {
      throw createError({
        statusCode: 400,
        statusMessage: `${fieldName}は必須です`,
      })
    }
    return null
  }

  const date = new Date(String(value))

  if (isNaN(date.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName}の日時形式が不正です`,
    })
  }

  return date
}

/**
 * 日時範囲バリデーション（start < end）
 */
export function validateDateRange(
  start: Date,
  end: Date,
  startName = '開始日時',
  endName = '終了日時'
): void {
  if (start >= end) {
    throw createError({
      statusCode: 400,
      statusMessage: `${startName}は${endName}より前である必要があります`,
    })
  }
}

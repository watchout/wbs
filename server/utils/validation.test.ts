import { describe, it, expect } from 'vitest'
import {
  validateString,
  validateEmail,
  validateNumber,
  validateUUID,
  validateDateTime,
  validateDateRange,
} from './validation'

// Helper: assert H3Error with statusCode 400
function expectH3Error400(fn: () => unknown, messageSubstring?: string) {
  try {
    fn()
    expect.fail('Expected an error to be thrown')
  } catch (error: unknown) {
    const e = error as { statusCode?: number; statusMessage?: string }
    expect(e.statusCode).toBe(400)
    if (messageSubstring) {
      expect(e.statusMessage).toContain(messageSubstring)
    }
  }
}

// ---------------------------------------------------------------------------
// validateString
// ---------------------------------------------------------------------------
describe('validateString', () => {
  it('null を渡すと required=false の場合 null を返す', () => {
    expect(validateString(null, 'テスト')).toBeNull()
  })

  it('undefined を渡すと required=false の場合 null を返す', () => {
    expect(validateString(undefined, 'テスト')).toBeNull()
  })

  it('空文字を渡すと required=false の場合 null を返す', () => {
    expect(validateString('', 'テスト')).toBeNull()
  })

  it('null を渡すと required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString(null, '名前', { required: true }),
      '名前は必須です'
    )
  })

  it('undefined を渡すと required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString(undefined, '名前', { required: true }),
      '名前は必須です'
    )
  })

  it('空文字を渡すと required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString('', '名前', { required: true }),
      '名前は必須です'
    )
  })

  it('文字列でない値を渡すと 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString(123, 'フィールド'),
      'フィールドは文字列で指定してください'
    )
  })

  it('スペースのみの文字列で required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString('   ', '名前', { required: true }),
      '名前は必須です'
    )
  })

  it('minLength 未満の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString('ab', 'パスワード', { minLength: 3 }),
      'パスワードは3文字以上で入力してください'
    )
  })

  it('maxLength 超過の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString('abcdef', '名前', { maxLength: 5 }),
      '名前は5文字以内で入力してください'
    )
  })

  it('pattern に一致しない場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateString('abc', 'コード', { pattern: /^[0-9]+$/ }),
      'コードの形式が不正です'
    )
  })

  it('pattern 不一致時にカスタム patternMessage を使用する', () => {
    expectH3Error400(
      () =>
        validateString('abc', 'コード', {
          pattern: /^[0-9]+$/,
          patternMessage: '数字のみ入力可能です',
        }),
      '数字のみ入力可能です'
    )
  })

  it('有効な文字列を渡すとトリムして返す', () => {
    expect(validateString('  hello  ', 'テスト')).toBe('hello')
  })

  it('有効な文字列で required=true の場合もトリムして返す', () => {
    expect(validateString(' world ', 'テスト', { required: true })).toBe('world')
  })
})

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------
describe('validateEmail', () => {
  it('null を渡すと 400 エラーを投げる（必須）', () => {
    expectH3Error400(
      () => validateEmail(null),
      'メールアドレスは必須です'
    )
  })

  it('空文字を渡すと 400 エラーを投げる（必須）', () => {
    expectH3Error400(
      () => validateEmail(''),
      'メールアドレスは必須です'
    )
  })

  it('不正なメール形式の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateEmail('not-an-email'),
      'メールアドレスの形式が不正です'
    )
  })

  it('@ のみの場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateEmail('@'),
      'メールアドレスの形式が不正です'
    )
  })

  it('有効なメールアドレスを小文字トリムして返す', () => {
    expect(validateEmail('  User@Example.COM  ')).toBe('user@example.com')
  })

  it('254文字を超えるメールアドレスは 400 エラーを投げる', () => {
    const longLocal = 'a'.repeat(243) // 243 + @ + example.com(10) = 254 超
    const longEmail = `${longLocal}@example.com`
    // 255 chars total
    expectH3Error400(
      () => validateEmail(longEmail),
      '254文字以内で入力してください'
    )
  })

  it('カスタム fieldName を使用できる', () => {
    expectH3Error400(
      () => validateEmail(null, '連絡先メール'),
      '連絡先メールは必須です'
    )
  })
})

// ---------------------------------------------------------------------------
// validateNumber
// ---------------------------------------------------------------------------
describe('validateNumber', () => {
  it('null を渡すと required=false の場合 null を返す', () => {
    expect(validateNumber(null, '数量')).toBeNull()
  })

  it('undefined を渡すと required=false の場合 null を返す', () => {
    expect(validateNumber(undefined, '数量')).toBeNull()
  })

  it('空文字を渡すと required=false の場合 null を返す', () => {
    expect(validateNumber('', '数量')).toBeNull()
  })

  it('null を渡すと required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateNumber(null, '数量', { required: true }),
      '数量は必須です'
    )
  })

  it('undefined を渡すと required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateNumber(undefined, '数量', { required: true }),
      '数量は必須です'
    )
  })

  it('NaN になる値を渡すと 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateNumber('abc', '数量'),
      '数量は数値で指定してください'
    )
  })

  it('integer=true で小数値を渡すと 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateNumber(3.14, '個数', { integer: true }),
      '個数は整数で指定してください'
    )
  })

  it('min 未満の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateNumber(0, '年齢', { min: 1 }),
      '年齢は1以上で指定してください'
    )
  })

  it('max 超過の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateNumber(200, '年齢', { max: 150 }),
      '年齢は150以下で指定してください'
    )
  })

  it('文字列 "42" を渡すと数値 42 に変換して返す', () => {
    expect(validateNumber('42', '数量')).toBe(42)
  })

  it('有効な数値をそのまま返す', () => {
    expect(validateNumber(99, '数量')).toBe(99)
  })

  it('integer=true で整数値を渡すと正常に返す', () => {
    expect(validateNumber(10, '個数', { integer: true })).toBe(10)
  })

  it('min と max の範囲内の値を正常に返す', () => {
    expect(validateNumber(50, '年齢', { min: 0, max: 150 })).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// validateUUID
// ---------------------------------------------------------------------------
describe('validateUUID', () => {
  it('null を渡すと 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateUUID(null, 'ID'),
      'IDは必須です'
    )
  })

  it('空文字を渡すと 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateUUID('', 'ID'),
      'IDは必須です'
    )
  })

  it('不正な UUID 形式の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateUUID('not-a-uuid', 'プロジェクトID'),
      'プロジェクトIDのID形式が不正です'
    )
  })

  it('ハイフンなしの UUID は 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateUUID('550e8400e29b41d4a716446655440000', 'ID'),
      'IDのID形式が不正です'
    )
  })

  it('有効な UUID を正常に返す', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(validateUUID(uuid, 'ID')).toBe(uuid)
  })

  it('大文字の UUID も正常に返す', () => {
    const uuid = '550E8400-E29B-41D4-A716-446655440000'
    expect(validateUUID(uuid, 'ID')).toBe(uuid)
  })
})

// ---------------------------------------------------------------------------
// validateDateTime
// ---------------------------------------------------------------------------
describe('validateDateTime', () => {
  it('null を渡すと required=false の場合 null を返す', () => {
    expect(validateDateTime(null, '日時')).toBeNull()
  })

  it('undefined を渡すと required=false の場合 null を返す', () => {
    expect(validateDateTime(undefined, '日時')).toBeNull()
  })

  it('空文字を渡すと required=false の場合 null を返す', () => {
    expect(validateDateTime('', '日時')).toBeNull()
  })

  it('null を渡すと required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateDateTime(null, '開始日時', { required: true }),
      '開始日時は必須です'
    )
  })

  it('空文字を渡すと required=true の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateDateTime('', '開始日時', { required: true }),
      '開始日時は必須です'
    )
  })

  it('不正な日時文字列の場合 400 エラーを投げる', () => {
    expectH3Error400(
      () => validateDateTime('not-a-date', '日時'),
      '日時の日時形式が不正です'
    )
  })

  it('有効な ISO 文字列を Date オブジェクトで返す', () => {
    const result = validateDateTime('2025-01-15T09:00:00.000Z', '日時')
    expect(result).toBeInstanceOf(Date)
    expect(result!.toISOString()).toBe('2025-01-15T09:00:00.000Z')
  })

  it('有効な日付文字列を Date オブジェクトで返す', () => {
    const result = validateDateTime('2025-06-01', '日時')
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2025)
  })
})

// ---------------------------------------------------------------------------
// validateDateRange
// ---------------------------------------------------------------------------
describe('validateDateRange', () => {
  it('start >= end の場合 400 エラーを投げる（同一日時）', () => {
    const date = new Date('2025-01-15T09:00:00.000Z')
    expectH3Error400(
      () => validateDateRange(date, date),
      '開始日時は終了日時より前である必要があります'
    )
  })

  it('start > end の場合 400 エラーを投げる', () => {
    const start = new Date('2025-01-16T09:00:00.000Z')
    const end = new Date('2025-01-15T09:00:00.000Z')
    expectH3Error400(
      () => validateDateRange(start, end),
      '開始日時は終了日時より前である必要があります'
    )
  })

  it('カスタム名でエラーメッセージを表示する', () => {
    const start = new Date('2025-01-16T09:00:00.000Z')
    const end = new Date('2025-01-15T09:00:00.000Z')
    expectH3Error400(
      () => validateDateRange(start, end, '着工日', '竣工日'),
      '着工日は竣工日より前である必要があります'
    )
  })

  it('start < end の場合エラーを投げない', () => {
    const start = new Date('2025-01-15T09:00:00.000Z')
    const end = new Date('2025-01-16T09:00:00.000Z')
    expect(() => validateDateRange(start, end)).not.toThrow()
  })
})

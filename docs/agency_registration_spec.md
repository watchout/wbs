# 代理店登録ページ・オンボーディング仕様書

## 🎯 **概要**
代理店パートナーが簡単かつ確実に登録・開始できるオンラインシステム

---

## 📱 **代理店登録ページ構成**

### **1. ランディングページ（/agency）**

#### **ヘッダーセクション**
```
🚀 ミエルボード代理店パートナー募集
「月収100万円超えの代理店が続々誕生」

[今すぐ登録して稼ぎ始める]ボタン
```

#### **手数料体系表示**
```
💰 明確な手数料体系

┌─────────────────────────────────┐
│ ブロンズ │ 25% │ 初期費用 5万円   │
│ シルバー │ 30% │ 初期費用 10万円  │
│ ゴールド │ 35% │ 初期費用 20万円  │
│ プラチナ │ 40% │ 初期費用 50万円  │
└─────────────────────────────────┘

✅ 24ヶ月間の継続報酬保証
✅ 成果ボーナス最大年間300万円
✅ 支払いサイクル最短5営業日
```

#### **成功事例セクション**
```
📈 代理店成功事例

田中様（ゴールド代理店）
「開始3ヶ月で月収50万円達成。1年で年収700万円になりました」

佐藤様（プラチナ代理店）
「フルタイムで月収150万円。人生が変わりました」
```

### **2. 登録フォームページ（/agency/register）**

#### **Step 1: 基本情報入力**
```typescript
interface AgencyBasicInfo {
  // 個人情報
  lastName: string          // 姓
  firstName: string         // 名
  lastNameKana: string      // 姓（カナ）
  firstNameKana: string     // 名（カナ）
  email: string             // メールアドレス
  phone: string             // 電話番号
  birthDate: Date           // 生年月日
  
  // 住所情報
  postalCode: string        // 郵便番号
  prefecture: string        // 都道府県
  city: string              // 市区町村
  address: string           // 番地
  building?: string         // 建物名・部屋番号
  
  // 事業形態
  businessType: 'individual' | 'corporation'  // 個人/法人
  companyName?: string      // 会社名（法人の場合）
  taxNumber?: string        // 法人番号（法人の場合）
}
```

#### **Step 2: レベル選択・決済**
```typescript
interface AgencyLevelSelection {
  selectedLevel: 'bronze' | 'silver' | 'gold' | 'platinum'
  
  // 決済情報
  paymentMethod: 'creditCard' | 'bankTransfer'
  
  // クレジットカード情報（Stripe使用）
  cardNumber?: string
  expiryMonth?: number
  expiryYear?: number
  cvc?: string
  
  // 銀行振込情報
  expectedPaymentDate?: Date  // 振込予定日
  
  // 契約同意
  termsAgreed: boolean       // 利用規約同意
  commissionAgreed: boolean  // 手数料規約同意
  privacyAgreed: boolean     // プライバシーポリシー同意
}
```

#### **Step 3: マーケティング情報**
```typescript
interface AgencyMarketingInfo {
  // 営業経験
  salesExperience: 'none' | 'beginner' | 'intermediate' | 'expert'
  previousSalesIndustry?: string[]  // 過去の営業業界
  
  // 活動予定
  expectedHoursPerWeek: number      // 週間活動予定時間
  targetMonthlyCustomers: number    // 月間獲得目標件数
  marketingChannels: string[]       // 予定している営業手法
  
  // 紹介者情報
  referrerCode?: string             // 紹介者コード
  howDidYouHear: string            // 弊社を知ったきっかけ
}
```

---

## 🔄 **オンボーディングフロー**

### **登録完了後の自動処理**
```typescript
async function processAgencyRegistration(data: AgencyRegistrationData) {
  // 1. 代理店アカウント作成
  const agency = await createAgencyAccount(data)
  
  // 2. 決済処理
  if (data.paymentMethod === 'creditCard') {
    await processStripePayment(data.selectedLevel, data.cardInfo)
  }
  
  // 3. 専用リンク・コード生成
  const referralCode = generateUniqueReferralCode(agency.id)
  const trackingLinks = generateTrackingLinks(agency.id)
  
  // 4. 契約書PDF生成・送信
  const contract = await generateAgencyContract(agency)
  await sendWelcomeEmail(agency, contract, referralCode, trackingLinks)
  
  // 5. 管理画面アクセス権付与
  await setupAgencyDashboardAccess(agency)
  
  // 6. Slack/Discord通知（内部）
  await notifyNewAgencyRegistration(agency)
}
```

### **ウェルカムメール内容**
```
件名: 【ミエルボード】代理店登録完了 - あなた専用の営業ツールをお送りします

田中様

この度は、ミエルボード代理店パートナーにご登録いただき、
誠にありがとうございます。

■ あなたの代理店情報
・レベル: ゴールド代理店
・手数料率: 35%
・あなたの紹介コード: TK2024001

■ 専用営業ツール
・専用紹介URL: https://mieruboard.com/r/TK2024001
・営業資料ダウンロード: [リンク]
・価格表・提案書: [リンク]

■ 管理画面へのアクセス
URL: https://mieruboard.com/agency/dashboard
ID: tanaka@example.com
初期パスワード: [生成されたパスワード]

■ 今後のサポート
・専任担当者: 山田太郎（TEL: 03-1234-5678）
・初回オリエンテーション: 3営業日以内にご連絡
・営業研修: オンライン開催（毎週火曜 15:00-16:00）

成功への第一歩を踏み出しましょう！
```

---

## 💻 **代理店管理画面仕様**

### **ダッシュボード構成**
```
┌─ ヘッダー ─────────────────────────┐
│ ミエルボード代理店管理画面           │
│ 田中様（ゴールド代理店）             │
└─────────────────────────────────┘

┌─ 今月の実績 ───────────────────────┐
│ 📊 成約件数: 8件                    │
│ 💰 今月手数料: 245,000円            │
│ 🎯 目標達成率: 160%                 │
│ 📈 前月比: +25%                     │
└─────────────────────────────────┘

┌─ 紹介リンク ───────────────────────┐
│ あなたの専用URL:                    │
│ https://mieruboard.com/r/TK2024001  │
│ [コピー] [QRコード生成]              │
└─────────────────────────────────┘

┌─ 顧客リスト ───────────────────────┐
│ 2024/01/15 | 株式会社A | 成約済み     │
│ 2024/01/20 | 株式会社B | 商談中       │
│ 2024/01/25 | 株式会社C | 提案済み     │
└─────────────────────────────────┘

┌─ 営業ツール ───────────────────────┐
│ [提案書作成] [価格表DL] [事例集DL]    │
│ [営業研修動画] [FAQ集] [サポート]     │
└─────────────────────────────────┘
```

---

## 📊 **システム実装要件**

### **データベーススキーマ拡張**
```sql
-- 代理店テーブル
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- レベル・手数料
  level agency_level NOT NULL, -- bronze, silver, gold, platinum
  commission_rate DECIMAL(3,2) NOT NULL, -- 0.25, 0.30, 0.35, 0.40
  
  -- 契約情報
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  status agency_status DEFAULT 'active', -- active, suspended, terminated
  
  -- 営業情報
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) DEFAULT 0,
  
  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 代理店紹介実績テーブル
CREATE TABLE agency_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- 成約情報
  referral_date DATE NOT NULL,
  conversion_date DATE, -- 成約日
  first_payment_date DATE, -- 初回支払日
  
  -- 金額情報
  monthly_amount DECIMAL(10,2) NOT NULL,
  total_commission_paid DECIMAL(10,2) DEFAULT 0,
  commission_months_paid INTEGER DEFAULT 0,
  
  status referral_status DEFAULT 'pending', -- pending, converted, active, cancelled
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 代理店手数料支払いテーブル
CREATE TABLE agency_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  referral_id UUID REFERENCES agency_referrals(id),
  
  -- 支払い情報
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_month DATE NOT NULL, -- どの月分の手数料か
  
  payment_method payment_method_type, -- bank_transfer, paypal
  payment_reference VARCHAR(100), -- 振込番号等
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **API エンドポイント**
```typescript
// 代理店登録
POST /api/agency/register
{
  basicInfo: AgencyBasicInfo,
  levelSelection: AgencyLevelSelection,
  marketingInfo: AgencyMarketingInfo
}

// 代理店ダッシュボード
GET /api/agency/dashboard
Response: {
  agency: AgencyInfo,
  monthlyStats: MonthlyStats,
  referrals: ReferralList,
  commissions: CommissionHistory
}

// 紹介リンク追跡
GET /r/{referralCode}
→ オリジナルサイトにリダイレクト + トラッキング

// 代理店用顧客リスト
GET /api/agency/customers
Response: CustomerList

// 営業資料ダウンロード
GET /api/agency/materials/{type}
→ PDF等の営業資料
```

---

## 🔒 **セキュリティ・コンプライアンス**

### **個人情報保護**
- 代理店の個人情報は暗号化して保存
- GDPR/個人情報保護法準拠
- アクセスログの保持（1年間）

### **決済セキュリティ**
- Stripe PCI DSS Level 1準拠
- カード情報は弊社サーバーに保存しない
- 3Dセキュア対応

### **契約管理**
- 電子契約による契約書保管
- 契約書の暗号化PDF生成
- 法的有効性の確保 
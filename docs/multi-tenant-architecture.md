# ミエルボード マルチテナント構成設計書

## 概要

ミエルボードは複数の企業・組織が独立してスケジュール管理を行えるマルチテナントSaaSシステムとして設計されています。各テナント（顧客組織）のデータは完全に分離され、セキュアな環境でサービスを提供します。

## システム構成

### アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                        ミエルボード SaaS                          │
├─────────────────────────────────────────────────────────────────┤
│                     Load Balancer (Nginx)                      │
├─────────────────────────────────────────────────────────────────┤
│  Nuxt 3 Application Server (Node.js)                          │
│  ┌───────────────┬───────────────┬───────────────────────────┐  │
│  │   テナントA    │   テナントB    │        テナントC          │  │
│  │  (組織ID: A)   │  (組織ID: B)   │      (組織ID: C)         │  │
│  └───────────────┴───────────────┴───────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                PostgreSQL Database                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Row-Level Security (RLS) による論理的分離                  │  │
│  │  各レコードにorganizationIdを付与                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## データベース設計

### マルチテナント方式：Row-Level Security (RLS)

**採用理由:**
- コスト効率（単一データベース）
- 運用管理の簡素化
- Prisma ORMとの親和性
- 適切なスケーラビリティ

### テーブル構造

#### 1. 組織管理テーブル

```sql
-- Organizations: テナントのマスターテーブル
model Organization {
  id              String            @id @default(cuid())
  name            String            -- 組織名
  code            String?           -- 組織コード（サブドメイン用）
  settings        Json?             -- 組織固有設定
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  -- プランと課金情報
  billingSettings BillingSettings[]
  billingHistory  BillingHistory[]
  aiUsage         AIUsage[]
  
  -- 組織内エンティティ
  users           User[]
  departments     Department[]
  positions       Position[]
  schedules       Schedule[]
  boards          Board[]
  devices         Device[]
}
```

#### 2. テナント分離パターン

**全てのテーブルにorganizationIdを必須として付与:**

```sql
-- 例：ユーザーテーブル
model User {
  id             String       @id @default(cuid())
  organizationId String       -- マルチテナント分離キー
  email          String       @unique
  name           String
  -- その他のフィールド
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

-- 例：スケジュールテーブル
model Schedule {
  id             String       @id @default(cuid())
  organizationId String       -- マルチテナント分離キー
  title          String
  -- その他のフィールド
  
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### データアクセス制御

#### Prisma Middleware パターン

```typescript
// server/middleware/tenant-isolation.ts
export const tenantIsolationMiddleware = (prisma: PrismaClient) => {
  prisma.$use(async (params, next) => {
    const organizationId = getCurrentOrganizationId()
    
    // CREATE操作: organizationIdを自動付与
    if (params.action === 'create') {
      params.args.data.organizationId = organizationId
    }
    
    // READ操作: organizationIdでフィルタ
    if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
      params.args.where = {
        ...params.args.where,
        organizationId
      }
    }
    
    // UPDATE/DELETE操作: organizationIdでフィルタ
    if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
      params.args.where = {
        ...params.args.where,
        organizationId
      }
    }
    
    return next(params)
  })
}
```

## 認証・認可システム

### 3段階権限システム

```typescript
// 権限レベル定義
export const PERMISSION_LEVELS = {
  USER: 1,      // 提供先ユーザー（一般）
  USER_PLUS: 2, // 提供先ユーザー（上級）
  ADMIN: 3,     // 提供先管理者
  ADMIN_PLUS: 4,// 提供先管理者（上級）
  SUPERADMIN: 5 // 開発者（当社）
}
```

#### 権限マトリックス

| 機能 | User(1-2) | Admin(3-4) | SuperAdmin(5) |
|------|-----------|------------|---------------|
| スケジュール閲覧・作成 | ✅ | ✅ | ✅ |
| スケジュール編集・削除 | △ | ✅ | ✅ |
| ユーザー管理 | ❌ | ✅ | ✅ |
| 部署・役職管理 | ❌ | ✅ | ✅ |
| プラン変更 | ❌ | △ | ✅ |
| 料金設定変更 | ❌ | ❌ | ✅ |
| 他組織へのアクセス | ❌ | ❌ | ✅ |

### テナント識別方法

#### 1. サブドメイン方式（推奨）
```
https://companyA.mieruboard.com
https://companyB.mieruboard.com
https://companyC.mieruboard.com
```

#### 2. パス方式（代替案）
```
https://mieruboard.com/companyA
https://mieruboard.com/companyB
https://mieruboard.com/companyC
```

#### 3. 実装例

```typescript
// middleware/tenant-detection.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const subdomain = getSubdomain(to.fullPath)
  
  if (subdomain) {
    // サブドメインからテナントIDを取得
    const organizationId = await getOrganizationByCode(subdomain)
    
    // セッションにテナント情報を設定
    await setCurrentTenant(organizationId)
  }
})
```

## デプロイメント構成

### Single Instance Multiple Tenant (SIMT)

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mieruboard
      - NUXT_PUBLIC_BASE_URL=https://mieruboard.com
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: mieruboard
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### Nginx設定（サブドメイン対応）

```nginx
# nginx.conf
server {
    listen 80;
    server_name *.mieruboard.com mieruboard.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.mieruboard.com mieruboard.com;
    
    ssl_certificate /etc/nginx/ssl/mieruboard.com.crt;
    ssl_certificate_key /etc/nginx/ssl/mieruboard.com.key;
    
    location / {
        proxy_pass http://app:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 料金・プラン管理

### マルチテナント対応料金システム

#### 1. プラン構成

| プラン | 月額料金 | 基本アカウント | 追加アカウント | AI使用回数 |
|--------|----------|---------------|---------------|------------|
| ライト | ¥4,980 | 5名 | ¥600/名 | 30回/月 |
| スタンダード | ¥9,800 | 15名 | ¥500/名 | 100回/月 |
| プレミアム | ¥19,800 | 50名 | ¥400/名 | 300回/月 |
| エクストラ | ¥39,800 | 100名 | ¥300/名 | 500回/月 |
| エンタープライズ | 別途見積 | 100名 | 別途見積 | 1,000回/月 |

#### 2. 組織別プラン管理

```typescript
// 組織別プラン設定
model BillingSettings {
  id             String       @id @default(cuid())
  organizationId String       -- テナント分離
  planType       String       -- プランタイプ
  customSettings Json?        -- カスタム設定（SuperAdmin用）
  isActive       Boolean      @default(true)
  startDate      DateTime
  endDate        DateTime?
  
  organization   Organization @relation(fields: [organizationId], references: [id])
}
```

#### 3. 使用量トラッキング

```typescript
// AI使用量管理
model AIUsage {
  id             String       @id @default(cuid())
  organizationId String       -- テナント分離
  userId         String
  month          String       -- "2024-01"形式
  feature        String       -- "chat", "voice"等
  credits        Int          -- 使用クレジット数
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])
}
```

## セキュリティ考慮事項

### 1. データ分離保証

#### 応用レベルでの保護
```typescript
// APIエンドポイントでの必須チェック
export default defineEventHandler(async (event) => {
  const userSession = await getUserSession(event)
  const organizationId = userSession.organizationId
  
  // 必ずorganizationIdでフィルタリング
  const data = await prisma.schedule.findMany({
    where: { organizationId }
  })
  
  return data
})
```

#### Database レベルでの保護
```sql
-- Row Level Security (RLS) 設定例
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON schedules
USING (organization_id = current_setting('app.current_organization_id'));
```

### 2. 認証・セッション管理

```typescript
// セッション管理
interface UserSession {
  userId: string
  organizationId: string
  permissions: number[]
  role: string
}

// クロステナントアクセス防止
async function validateTenantAccess(userId: string, resourceId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true }
  })
  
  const resource = await prisma.schedule.findUnique({
    where: { id: resourceId }
  })
  
  if (user?.organizationId !== resource?.organizationId) {
    throw new Error('Cross-tenant access denied')
  }
}
```

### 3. 監査ログ

```typescript
// 全操作の監査ログ
model AuditLog {
  id             String       @id @default(cuid())
  organizationId String       -- テナント分離
  userId         String
  action         String       -- "CREATE", "UPDATE", "DELETE"
  resourceType   String       -- "Schedule", "User"等
  resourceId     String
  changes        Json?        -- 変更内容
  ipAddress      String
  userAgent      String
  createdAt      DateTime     @default(now())
  
  organization   Organization @relation(fields: [organizationId], references: [id])
}
```

## 運用管理

### 1. テナント作成フロー

```typescript
// 新規テナント作成
async function createNewTenant(tenantData: {
  name: string
  code: string
  adminUser: {
    name: string
    email: string
    password: string
  }
  plan: string
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. 組織作成
    const organization = await tx.organization.create({
      data: {
        name: tenantData.name,
        code: tenantData.code,
        settings: {
          planType: tenantData.plan,
          setupCompleted: false
        }
      }
    })
    
    // 2. 管理者ポジション作成
    const adminPosition = await tx.position.create({
      data: {
        name: '管理者',
        level: 3,
        organizationId: organization.id
      }
    })
    
    // 3. 管理者ユーザー作成
    const adminUser = await tx.user.create({
      data: {
        name: tenantData.adminUser.name,
        email: tenantData.adminUser.email,
        password: await hashPassword(tenantData.adminUser.password),
        organizationId: organization.id,
        positionId: adminPosition.id
      }
    })
    
    // 4. 課金設定作成
    await tx.billingSettings.create({
      data: {
        organizationId: organization.id,
        planType: tenantData.plan,
        startDate: new Date(),
        isActive: true
      }
    })
    
    return { organization, adminUser }
  })
}
```

### 2. 監視・アラート

#### メトリクス収集
```typescript
// 組織別リソース使用量
const organizationMetrics = {
  userCount: await prisma.user.count({ where: { organizationId } }),
  scheduleCount: await prisma.schedule.count({ where: { organizationId } }),
  aiUsageThisMonth: await getAIUsage(organizationId, currentMonth),
  storageUsage: await calculateStorageUsage(organizationId)
}
```

#### アラート設定
- AI使用量が制限の80%に達した場合
- ストレージ使用量が異常に多い場合
- ログイン失敗が連続した場合
- 大量のAPI呼び出しが発生した場合

### 3. バックアップ・災害復旧

#### 定期バックアップ
```bash
#!/bin/bash
# daily-backup.sh

# データベース全体バックアップ
pg_dump $DATABASE_URL > /backup/mieruboard_$(date +%Y%m%d).sql

# 組織別バックアップ（大規模テナント用）
for org_id in $(psql -t -c "SELECT id FROM organizations WHERE plan = 'enterprise'"); do
  pg_dump --where="organization_id='$org_id'" $DATABASE_URL > /backup/org_${org_id}_$(date +%Y%m%d).sql
done
```

## スケーリング戦略

### 1. 垂直スケーリング
- CPUとメモリの増強
- データベース接続プールの最適化
- Redis キャッシュの活用

### 2. 水平スケーリング

#### アプリケーション層
```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mieruboard-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mieruboard
  template:
    metadata:
      labels:
        app: mieruboard
    spec:
      containers:
      - name: app
        image: mieruboard:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

#### データベース層
```yaml
# PostgreSQL クラスター構成
primary:
  host: pg-primary
  port: 5432
  max_connections: 200

replicas:
  - host: pg-replica-1
    port: 5432
    purpose: read_only
  - host: pg-replica-2
    port: 5432
    purpose: read_only
```

### 3. パフォーマンス最適化

#### インデックス戦略
```sql
-- マルチテナント用の複合インデックス
CREATE INDEX idx_schedules_org_date ON schedules (organization_id, start_time);
CREATE INDEX idx_users_org_active ON users (organization_id, is_active);
CREATE INDEX idx_ai_usage_org_month ON ai_usage (organization_id, month);
```

#### キャッシュ戦略
```typescript
// Redis を使った組織情報キャッシュ
class OrganizationCache {
  static async get(organizationId: string) {
    const cached = await redis.get(`org:${organizationId}`)
    if (cached) return JSON.parse(cached)
    
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { billingSettings: true }
    })
    
    await redis.setex(`org:${organizationId}`, 3600, JSON.stringify(org))
    return org
  }
}
```

## 料金計算・請求システム

### 1. 月次課金計算

```typescript
// 月次請求額計算
async function calculateMonthlyBilling(organizationId: string, month: string) {
  const org = await getOrganizationWithPlan(organizationId)
  const plan = await getActivePlanSettings()
  const currentPlan = plan[org.planType]
  
  // 基本料金
  const basePrice = currentPlan.basePrice
  
  // 追加アカウント料金
  const userCount = await prisma.user.count({
    where: { organizationId, isActive: true }
  })
  const additionalUsers = Math.max(0, userCount - currentPlan.baseAccounts)
  const additionalAccountFee = additionalUsers * currentPlan.additionalPrice
  
  // AI使用量超過料金
  const aiUsage = await getChatUsage(organizationId, month)
  const overageUsage = Math.max(0, aiUsage - currentPlan.chatCreditsIncluded)
  const overageFee = overageUsage * currentPlan.chatOveragePrice
  
  return {
    basePrice,
    additionalAccountFee,
    overageFee,
    totalAmount: basePrice + additionalAccountFee + overageFee,
    breakdown: {
      userCount,
      additionalUsers,
      aiUsage,
      overageUsage
    }
  }
}
```

### 2. 請求履歴管理

```typescript
model BillingHistory {
  id             String       @id @default(cuid())
  organizationId String
  month          String       -- "2024-01"
  planType       String
  basePrice      Int
  additionalFee  Int
  overageFee     Int
  totalAmount    Int
  status         String       -- "pending", "paid", "overdue"
  dueDate        DateTime
  paidAt         DateTime?
  details        Json         -- 詳細な計算内訳
  
  organization   Organization @relation(fields: [organizationId], references: [id])
}
```

## 移行・アップグレード戦略

### 1. 段階的移行

#### Phase 1: 基盤整備
- マルチテナント対応データベース構造
- 基本的なテナント分離機能
- 認証・認可システム

#### Phase 2: 機能拡張
- SuperAdmin管理機能
- 高度な監視・ログ機能
- パフォーマンス最適化

#### Phase 3: 拡張・運用
- 自動化ツール
- 高可用性構成
- 災害復旧システム

### 2. データマイグレーション

```typescript
// 既存データのマルチテナント化
async function migrateToMultiTenant() {
  // 1. デフォルト組織作成
  const defaultOrg = await prisma.organization.create({
    data: {
      name: 'Default Organization',
      code: 'default'
    }
  })
  
  // 2. 既存ユーザーに組織ID付与
  await prisma.user.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrg.id }
  })
  
  // 3. 既存スケジュールに組織ID付与
  await prisma.schedule.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrg.id }
  })
}
```

## まとめ

ミエルボードのマルチテナント構成は以下の特徴を持ちます：

### ✅ 利点
- **コスト効率**: 単一インフラで複数顧客に対応
- **運用効率**: 統一された管理・監視
- **スケーラビリティ**: 需要に応じた柔軟な拡張
- **セキュリティ**: Row-Level Securityによる確実なデータ分離

### 🔧 技術スタック
- **フロントエンド**: Nuxt 3 + Vue 3 + Pinia
- **バックエンド**: Node.js + Prisma ORM
- **データベース**: PostgreSQL (RLS対応)
- **キャッシュ**: Redis
- **インフラ**: Docker + Nginx

### 📈 成長戦略
- 小規模から開始し、需要に応じて段階的にスケール
- SuperAdmin機能による柔軟な料金設定
- 包括的な監視・分析による継続的改善

この設計により、ミエルボードは効率的で安全なマルチテナントSaaSとして運用可能です。 
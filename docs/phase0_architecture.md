# Phase 0 アーキテクチャ設計: 現場WEEK

**プロジェクト**: ミエルボード for 現場  
**モジュール**: 現場WEEK  
**Phase**: 0  
**最終更新**: 2025-12-07

---

## 📋 このドキュメントについて

このドキュメントは **Phase 0（現場WEEK）のアーキテクチャ設計** です。

**参照**:
- `docs/SSOT_GENBA_WEEK.md` - 設計SSOT
- `docs/phase0_weak_current_spec.md` - 詳細仕様

---

## 🏗️ システム構成図

### 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        クライアント層                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   PC/Mac     │  │  タブレット   │  │  サイネージ   │    │
│  │  (管理画面)   │  │  (確認用)     │  │  (TV表示)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│           │                │                │              │
│           └────────────────┴────────────────┘              │
│                          HTTPS                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Reverse Proxy)                │
│  - SSL Termination                                          │
│  - Load Balancing                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Nuxt 3 Application (Docker)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Frontend (SSR/SPA)                   │   │
│  │  ├─ pages/org/[slug]/weekly-board.vue              │   │
│  │  ├─ components/genba/WeeklyScheduleBoard.vue       │   │
│  │  └─ composables/useWeeklyBoard.ts                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Backend (Server API)                 │   │
│  │  ├─ server/api/schedules/weekly-board.get.ts       │   │
│  │  ├─ server/utils/scheduleFormatter.ts              │   │
│  │  └─ server/utils/auth.ts (requireAuth)             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Socket.IO Server                     │   │
│  │  └─ server/plugins/socket.io.ts                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL (Docker)                           │
│  ├─ Schedule (既存テーブル)                                  │
│  ├─ User                                                     │
│  ├─ Organization                                             │
│  ├─ Department                                               │
│  └─ Position                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 データフロー詳細

### 1. 週間ボード表示フロー

```
[ユーザー]
    ↓ (1) ページアクセス
    ↓ /org/succeed/weekly-board
    
[Nuxt SSR]
    ↓ (2) 認証チェック
    ↓ JWT Cookie検証
    ↓ organizationId 取得
    
[weekly-board.vue]
    ↓ (3) データ取得
    ↓ GET /api/schedules/weekly-board?startDate=2025-01-13
    
[weekly-board.get.ts]
    ↓ (4) requireAuth() 実行
    ↓ userId, organizationId 取得
    ↓ (5) Prisma クエリ
    ↓ Schedule.findMany({
    ↓   where: {
    ↓     organizationId: organizationId,  ← マルチテナント境界
    ↓     start: { gte: weekStart },
    ↓     end: { lte: weekEnd }
    ↓   }
    ↓ })
    
[PostgreSQL]
    ↓ (6) データ返却
    ↓ Schedule[]
    
[scheduleFormatter.ts]
    ↓ (7) 表示テキスト整形
    ↓ "9-18 ◯◯ホテル 新館工事"
    
[weekly-board.get.ts]
    ↓ (8) レスポンス返却
    ↓ WeeklyBoardResponse
    
[WeeklyScheduleBoard.vue]
    ↓ (9) レンダリング
    ↓ 社員 × 曜日マトリクス表示
    
[ユーザー]
    ✅ 画面表示完了
```

---

### 2. リアルタイム更新フロー

```
[管理者]
    ↓ (1) スケジュール追加
    ↓ POST /api/schedules
    
[schedules/index.post.ts]
    ↓ (2) Schedule作成
    ↓ prisma.schedule.create()
    ↓ (3) Socket.IO イベント発行
    ↓ io.to(`org-${organizationId}`).emit('schedule:created', {...})
    
[Socket.IO Server]
    ↓ (4) 同じ組織の全クライアントに配信
    
[WeeklyScheduleBoard.vue (サイネージ)]
    ↓ (5) on('schedule:created') 受信
    ↓ (6) データ再取得
    ↓ GET /api/schedules/weekly-board
    
[weekly-board.get.ts]
    ↓ (7) 最新データ返却
    
[WeeklyScheduleBoard.vue]
    ↓ (8) 画面更新
    
[サイネージ]
    ✅ リアルタイム反映完了
```

---

## 🔐 セキュリティ設計

### 1. 認証・認可

#### JWT + Cookie方式

```typescript
// server/utils/auth.ts

export async function requireAuth(event: H3Event) {
  // (1) Cookie から JWT 取得
  const token = getCookie(event, 'auth_token');
  
  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    });
  }
  
  // (2) JWT検証
  const payload = await verifyJWT(token);
  
  // (3) ユーザー情報取得
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { organization: true, position: true }
  });
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'User not found'
    });
  }
  
  // (4) コンテキストに保存
  event.context.auth = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.position.level
  };
  
  return event.context.auth;
}
```

---

### 2. マルチテナント境界

#### 原則

- ✅ **すべてのAPIで `requireAuth()` 必須**
- ✅ **`organizationId` によるフィルタ必須**
- ❌ **`organizationId ?? 'default'` のようなフォールバック禁止**

#### 実装例

```typescript
// server/api/schedules/weekly-board.get.ts

export default defineEventHandler(async (event) => {
  // (1) 認証必須
  const auth = await requireAuth(event);
  
  // (2) クエリパラメータ取得
  const { startDate, department } = getQuery(event);
  
  // (3) Prisma クエリ（organizationId でフィルタ）
  const schedules = await prisma.schedule.findMany({
    where: {
      organizationId: auth.organizationId,  // ← 必須
      start: { gte: new Date(startDate) },
      end: { lte: new Date(weekEnd) },
      // department フィルタ（あれば）
      ...(department && {
        user: { department: { name: department } }
      })
    },
    include: {
      user: {
        include: { department: true }
      }
    }
  });
  
  // (4) 整形して返却
  return formatWeeklyBoard(schedules);
});
```

---

### 3. SQL インジェクション対策

#### 原則

- ❌ **生SQL（`prisma.$queryRaw`）禁止**
- ✅ **Prisma ORMのみ使用**

#### 理由

- Prisma はパラメータ化されたクエリを自動生成
- SQLインジェクションのリスクがゼロ

---

## 📊 スケーラビリティ設計

### 1. データベース最適化

#### インデックス設計

```sql
-- Schedule テーブル
CREATE INDEX idx_schedule_org_date 
ON "Schedule" (organization_id, start, end);

-- User テーブル
CREATE INDEX idx_user_org_dept 
ON "User" (organization_id, department_id);
```

#### クエリ最適化

- ✅ `include` で N+1 問題を回避
- ✅ 必要な列のみ `select` で取得

---

### 2. キャッシュ戦略（Phase 1以降）

#### Redis導入（将来）

```typescript
// キャッシュキー例
const cacheKey = `weekly-board:${organizationId}:${startDate}:${department}`;

// キャッシュ有効期限: 5分
const ttl = 300;
```

---

### 3. Socket.IO スケーリング（Phase 1以降）

#### Redis Adapter 導入

```typescript
// server/plugins/socket.io.ts

import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ host: 'redis', port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

---

## 🧪 テスト戦略

### 1. ユニットテスト

#### 対象

- ✅ `server/utils/scheduleFormatter.ts`
- ✅ `composables/useWeeklyBoard.ts`

#### 例

```typescript
// server/utils/scheduleFormatter.test.ts

describe('formatScheduleForDisplay', () => {
  it('should format schedule with time and site name', () => {
    const schedule = {
      start: new Date('2025-01-15T09:00:00Z'),
      end: new Date('2025-01-15T18:00:00Z'),
      metadata: {
        siteName: '◯◯ホテル',
        activityType: '工事'
      }
    };
    
    const result = formatScheduleForDisplay(schedule);
    
    expect(result).toBe('9-18 ◯◯ホテル 工事');
  });
});
```

---

### 2. 統合テスト

#### 対象

- ✅ `GET /api/schedules/weekly-board` のマルチテナント境界

#### 例

```typescript
// server/api/schedules/weekly-board.test.ts

describe('GET /api/schedules/weekly-board', () => {
  it('should return only schedules for authenticated organization', async () => {
    // テナントAのユーザーでログイン
    const tokenA = await loginAs(userA);
    
    // テナントBのスケジュールを事前作成
    await createSchedule({ organizationId: 'org-b', ... });
    
    // API呼び出し
    const response = await $fetch('/api/schedules/weekly-board', {
      query: { startDate: '2025-01-13' },
      headers: { Cookie: `auth_token=${tokenA}` }
    });
    
    // テナントAのスケジュールのみ返却されることを確認
    expect(response.employees.every(e => 
      e.schedules.every(s => s.organizationId === 'org-a')
    )).toBe(true);
    
    // テナントBのスケジュールが含まれていないことを確認
    expect(response.employees.some(e => 
      e.schedules.some(s => s.organizationId === 'org-b')
    )).toBe(false);
  });
});
```

---

## 🚀 デプロイ構成

### 1. インフラ構成（ConoHa VPS）

```
ConoHa VPS (4GB RAM, 2vCPU)
├── Docker Compose
│   ├── nginx (Reverse Proxy)
│   ├── nuxt-app (Nuxt 3 Application)
│   └── postgres (PostgreSQL 14)
├── Terraform (IaC)
└── GitHub Actions (CI/CD)
```

---

### 2. Docker Compose構成

```yaml
# docker-compose.yml

version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - nuxt-app

  nuxt-app:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/wbs
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=wbs
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

### 3. CI/CD フロー（GitHub Actions）

```yaml
# .github/workflows/deploy.yml (将来)

name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: docker build -t wbs-genba:${{ github.ref_name }} .
      
      - name: Deploy to VPS
        run: |
          ssh ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
          "cd /opt/wbs && \
           docker-compose pull && \
           docker-compose up -d"
```

---

## 📈 モニタリング・ロギング

### 1. アプリケーションログ

```typescript
// server/utils/logger.ts

export function logInfo(message: string, meta?: object) {
  console.log(JSON.stringify({
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    ...meta
  }));
}
```

---

### 2. エラートラッキング（Phase 1以降）

- Sentry 導入
- エラー発生時に自動通知

---

## 🔗 既存システムとの統合

### 1. 既存ミエルボード基盤との関係

#### 共有部分

- ✅ 認証・認可（JWT + Cookie）
- ✅ マルチテナント（organizationId）
- ✅ User / Organization / Department / Position テーブル
- ✅ Prisma ORM

#### Phase 0 で追加する部分

- ✅ `Schedule.metadata` の拡張
- ✅ 週間ボード用 API（`/api/schedules/weekly-board`）
- ✅ 現場WEEK用 UI コンポーネント

---

### 2. 外部カレンダー連携（Phase 0 では手動）

#### Google Calendar API（Phase 1以降）

```typescript
// server/utils/googleCalendar.ts

export async function syncGoogleCalendar(userId: string) {
  // OAuth認証
  const auth = await getGoogleAuth(userId);
  
  // イベント取得
  const events = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString()
  });
  
  // Scheduleに変換して保存
  for (const event of events.data.items) {
    await prisma.schedule.upsert({
      where: { externalId: event.id },
      create: {
        userId,
        organizationId,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        metadata: {
          siteName: extractSiteName(event.summary),
          activityType: extractActivityType(event.description)
        }
      },
      update: { ... }
    });
  }
}
```

---

## 🔮 Phase 1 以降の拡張計画

### 1. 入出荷スケジュール（現場STOCK）

#### 新テーブル（総監修承認後）

```prisma
model Shipment {
  id             String   @id @default(uuid())
  scheduleId     String
  organizationId String
  itemName       String
  quantity       Int
  type           String   // "入荷" / "出荷"
  
  schedule       Schedule @relation(fields: [scheduleId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
}
```

---

### 2. アルコールチェック（現場ALCOHOL）

#### 新テーブル（総監修承認後）

```prisma
model AlcoholCheck {
  id             String   @id @default(uuid())
  userId         String
  organizationId String
  vehicleId      String?
  result         String   // "合格" / "不合格"
  checkedAt      DateTime @default(now())
  
  user           User @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
}
```

---

## 🔗 関連ドキュメント

- `docs/SSOT_GENBA_WEEK.md` - 設計SSOT
- `docs/phase0_weak_current_spec.md` - 詳細仕様
- `docs/TEST_STRATEGY.md` - テスト戦略
- `docs/QUALITY_MANAGEMENT_OVERVIEW.md` - 品質管理

---

**このアーキテクチャは、Phase 1 以降の拡張を見据えた設計となっています。**


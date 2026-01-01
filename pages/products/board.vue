<template>
  <div class="product-lp board-lp">
    <!-- ナビゲーション -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-logo-group">
          <NuxtLink to="/products/board" class="nav-logo">
            <span class="logo-icon">📆</span>
            <span class="logo-text">ミエルボード</span>
          </NuxtLink>
          <NuxtLink to="/" class="logo-sub">
            <span class="logo-sub-text">by</span>
            <span class="logo-sub-brand">ミエルプラス</span>
          </NuxtLink>
        </div>
        <div class="nav-links">
          <a href="#features">機能</a>
          <a href="#how-it-works">使い方</a>
          <a href="#pricing">料金</a>
          <a href="#faq">FAQ</a>
          <NuxtLink to="/login" class="nav-login">ログイン</NuxtLink>
        </div>
      </div>
    </nav>

    <!-- ヒーローセクション -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-icon">📆</span>
            <span>ミエルボード</span>
          </div>
          <h1>「◯◯さん今どこ？」<br>を<span class="highlight">ゼロ</span>にする。</h1>
          <p class="hero-subtitle">
            ホワイトボードの予定表をデジタルに。<br>
            誰が・どこで・何をしているかが、事務所のTVで<strong>常時表示</strong>。<br>
            もう電話で確認する必要はありません。
          </p>
          <div class="hero-cta">
            <button @click="scrollToContact" class="btn btn-cta btn-large">
              🚀 14日間無料で試す
            </button>
            <button @click="scrollToHowItWorks" class="btn btn-outline btn-large">
              使い方を見る
            </button>
          </div>
          <div class="hero-trust">
            <span>✓ 初期費用無料</span>
            <span>✓ 5分で導入完了</span>
            <span>✓ クレジットカード不要</span>
          </div>
        </div>
        <div class="hero-visual">
          <div class="mockup-container">
            <div class="mockup-tv">
              <div class="tv-frame">
                <div class="tv-screen">
                  <div class="screen-header">
                    <span>📆 週間ボード - 工事部</span>
                    <span class="live-badge">🔴 LIVE</span>
                  </div>
                  <table class="mini-schedule">
                    <thead>
                      <tr>
                        <th>社員</th>
                        <th>月</th>
                        <th>火</th>
                        <th>水</th>
                        <th>木</th>
                        <th>金</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="name">◯◯</td>
                        <td class="work">◯◯ホテル</td>
                        <td class="work">◯◯ホテル</td>
                        <td class="meet">打合せ</td>
                        <td class="work">△△ビル</td>
                        <td class="off">休み</td>
                      </tr>
                      <tr>
                        <td class="name">佐藤</td>
                        <td class="work">□□旅館</td>
                        <td class="meet">社内</td>
                        <td class="work">□□旅館</td>
                        <td class="work">□□旅館</td>
                        <td class="work">◇◇マンション</td>
                      </tr>
                      <tr>
                        <td class="name">鈴木</td>
                        <td class="meet">研修</td>
                        <td class="work">▽▽病院</td>
                        <td class="work">▽▽病院</td>
                        <td class="off">休み</td>
                        <td class="work">☆☆学校</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="tv-stand"></div>
            </div>
            <div class="mockup-label">事務所のテレビに常時表示</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 課題セクション -->
    <section class="problems">
      <div class="section-container">
        <h2 class="section-title">こんな「見えない」に困っていませんか？</h2>
        <div class="problem-grid">
          <div class="problem-card">
            <div class="problem-before">
              <span class="problem-icon">📞</span>
              <h3>「◯◯さん今どこ？」</h3>
              <p>お客様から問い合わせ。◯◯さんの予定がわからず電話で確認。<br><strong>→ 折り返しに10分かかる</strong></p>
            </div>
            <div class="problem-arrow">→</div>
            <div class="problem-after">
              <span class="solution-icon">📺</span>
              <p>テレビを見て<strong>3秒で回答</strong><br>「◯◯ホテルにおります」</p>
            </div>
          </div>
          <div class="problem-card">
            <div class="problem-before">
              <span class="problem-icon">📝</span>
              <h3>ホワイトボードの書き換え</h3>
              <p>毎週月曜、予定を消しゴムで消して書き直し。<br><strong>→ 30分の無駄作業</strong></p>
            </div>
            <div class="problem-arrow">→</div>
            <div class="problem-after">
              <span class="solution-icon">🔄</span>
              <p>カレンダーから<strong>自動反映</strong><br>書き換え作業ゼロ</p>
            </div>
          </div>
          <div class="problem-card">
            <div class="problem-before">
              <span class="problem-icon">🌧️</span>
              <h3>外出先から確認できない</h3>
              <p>出張中に「明日の予定は？」と聞かれても確認できない。<br><strong>→ 事務所に電話して確認</strong></p>
            </div>
            <div class="problem-arrow">→</div>
            <div class="problem-after">
              <span class="solution-icon">📱</span>
              <p>スマホで<strong>いつでも確認</strong><br>電話不要</p>
            </div>
          </div>
          <div class="problem-card">
            <div class="problem-before">
              <span class="problem-icon">⏰</span>
              <h3>朝礼での予定確認</h3>
              <p>「今日の予定は？」を一人ずつ確認。<br><strong>→ 朝礼が長引く</strong></p>
            </div>
            <div class="problem-arrow">→</div>
            <div class="problem-after">
              <span class="solution-icon">👀</span>
              <p>テレビを見れば<strong>全員把握</strong><br>朝礼5分短縮</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 機能セクション -->
    <section id="features" class="features">
      <div class="section-container">
        <h2 class="section-title">ミエルボードでできること</h2>
        <div class="feature-showcase">
          <div class="feature-main">
            <div class="feature-image">
              <div class="browser-mockup">
                <div class="browser-header">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="url">app.genba-miel.ai/board</span>
                </div>
                <div class="browser-content">
                  <div class="board-preview">
                    <div class="board-header-row">
                      <div class="board-cell header">社員</div>
                      <div class="board-cell header">月</div>
                      <div class="board-cell header">火</div>
                      <div class="board-cell header">水</div>
                      <div class="board-cell header">木</div>
                      <div class="board-cell header">金</div>
                    </div>
                    <div class="board-row">
                      <div class="board-cell name">◯◯太郎</div>
                      <div class="board-cell work">◯◯ホテル<br><small>新館配線</small></div>
                      <div class="board-cell work">◯◯ホテル<br><small>新館配線</small></div>
                      <div class="board-cell meet">△△ビル<br><small>打合せ</small></div>
                      <div class="board-cell work">☆☆病院<br><small>LAN工事</small></div>
                      <div class="board-cell off">休み</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon">📅</div>
              <div class="feature-text">
                <h3>週間マトリクス表示</h3>
                <p>社員×曜日で予定を一覧表示。誰が・どこで・何をしているかが一目瞭然。</p>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📺</div>
              <div class="feature-text">
                <h3>サイネージモード</h3>
                <p>事務所のテレビやモニターに常時表示。Fire TV StickやChromecastがあればOK。</p>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🔗</div>
              <div class="feature-text">
                <h3>カレンダー連携</h3>
                <p>Googleカレンダー・Outlookと自動連携。手入力不要で予定が反映されます。</p>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🏢</div>
              <div class="feature-text">
                <h3>部門フィルタ</h3>
                <p>工事部・営業部・保守部など、部門ごとに表示を切り替え可能。</p>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📱</div>
              <div class="feature-text">
                <h3>スマホ対応</h3>
                <p>外出先からスマホで確認可能。いつでもどこでも予定をチェック。</p>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🤖</div>
              <div class="feature-text">
                <h3>AIアシスタント</h3>
                <p>「◯◯さんの今週の予定は？」と聞くだけ。AIが即座に回答。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 使い方セクション -->
    <section id="how-it-works" class="how-it-works">
      <div class="section-container">
        <h2 class="section-title">導入は5分で完了</h2>
        <p class="section-subtitle">難しい設定は一切不要。今日から使い始められます。</p>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>アカウント作成</h3>
              <p>メールアドレスを入力するだけ。<br><strong>所要時間：1分</strong></p>
            </div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>カレンダー連携</h3>
              <p>Googleカレンダーを接続。<br><strong>所要時間：2分</strong></p>
            </div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>TVに表示</h3>
              <p>URLをテレビで開くだけ。<br><strong>所要時間：2分</strong></p>
            </div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step completed">
            <div class="step-number">✓</div>
            <div class="step-content">
              <h3>運用開始！</h3>
              <p>予定が自動で表示されます。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 料金セクション -->
    <section id="pricing" class="pricing">
      <div class="section-container">
        <h2 class="section-title">ミエルボード 料金プラン</h2>
        <p class="section-subtitle">
          チームの規模に合わせて選べる3プラン<br>
          <span class="urgency">🎁 今なら14日間無料トライアル</span>
        </p>
        
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-name">スターター</div>
            <div class="pricing-target">小規模チーム向け</div>
            <div class="pricing-price">
              <div class="price-current">
                <span class="currency">¥</span>
                <span class="amount">9,800</span>
                <span class="period">/月</span>
              </div>
            </div>
            <ul class="pricing-features">
              <li>✓ ユーザー <strong>10名</strong>まで</li>
              <li>✓ サイネージ表示 <strong>1台</strong></li>
              <li>✓ Googleカレンダー連携</li>
              <li>✓ 🤖 AI <strong>100回/月</strong></li>
              <li>✓ メールサポート</li>
            </ul>
            <button class="btn btn-outline btn-block" @click="scrollToContact">
              無料で試す
            </button>
          </div>

          <div class="pricing-card featured">
            <div class="pricing-badge">🏆 人気No.1</div>
            <div class="pricing-name">ビジネス</div>
            <div class="pricing-target">成長中のチーム向け</div>
            <div class="pricing-price">
              <div class="price-current">
                <span class="currency">¥</span>
                <span class="amount">19,800</span>
                <span class="period">/月</span>
              </div>
            </div>
            <ul class="pricing-features">
              <li>✓ ユーザー <strong>30名</strong>まで</li>
              <li>✓ サイネージ表示 <strong>3台</strong></li>
              <li>✓ 全カレンダー連携</li>
              <li>✓ 部門管理</li>
              <li>✓ 🤖 AI <strong>500回/月</strong></li>
              <li>✓ チャットサポート</li>
            </ul>
            <button class="btn btn-cta btn-block" @click="scrollToContact">
              🚀 無料で試す
            </button>
            <div class="pricing-guarantee">
              <span>✓ 14日間無料</span>
              <span>✓ いつでも解約可</span>
            </div>
          </div>

          <div class="pricing-card">
            <div class="pricing-name">プロフェッショナル</div>
            <div class="pricing-target">本格導入向け</div>
            <div class="pricing-price">
              <div class="price-current">
                <span class="currency">¥</span>
                <span class="amount">39,800</span>
                <span class="period">/月</span>
              </div>
            </div>
            <ul class="pricing-features">
              <li>✓ ユーザー <strong>100名</strong>まで</li>
              <li>✓ サイネージ表示 <strong>無制限</strong></li>
              <li>✓ API連携</li>
              <li>✓ 高度な権限管理</li>
              <li>✓ 🤖 AI <strong>2,000回/月</strong></li>
              <li>✓ 優先電話サポート</li>
            </ul>
            <button class="btn btn-outline btn-block" @click="scrollToContact">
              無料で試す
            </button>
          </div>
        </div>
        
        <div class="pricing-note">
          <p>💡 他の製品（ミエルストック・ミエルドライブ）と組み合わせるとさらにお得！ 
            <NuxtLink to="/#pricing">組み合わせ料金を見る →</NuxtLink>
          </p>
        </div>
      </div>
    </section>

    <!-- FAQセクション -->
    <section id="faq" class="faq">
      <div class="section-container">
        <h2 class="section-title">よくある質問</h2>
        <div class="faq-list">
          <div class="faq-item" v-for="(item, index) in faqItems" :key="index">
            <div class="faq-question" @click="toggleFaq(index)">
              <span>{{ item.question }}</span>
              <span class="faq-toggle">{{ openFaq === index ? '−' : '+' }}</span>
            </div>
            <div class="faq-answer" v-show="openFaq === index">
              {{ item.answer }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTAセクション -->
    <section id="contact" class="cta">
      <div class="section-container">
        <div class="cta-content">
          <h2>「◯◯さん今どこ？」を<br>今日からゼロにしませんか？</h2>
          <p>14日間の無料トライアル。5分で導入完了。</p>
          <div class="cta-form">
            <input v-model="contactEmail" type="email" placeholder="メールアドレス" />
            <button class="btn btn-cta btn-large" @click="submitContact">
              🚀 無料で始める
            </button>
          </div>
          <p class="cta-note">クレジットカード不要 • いつでも解約可能</p>
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-brand">
          <NuxtLink to="/" class="footer-logo">
            <span class="logo-icon">🤖</span>
            <span>ミエルプラス</span>
          </NuxtLink>
          <p>予定も、在庫も、車両も。現場がぜんぶミエル。</p>
        </div>
        <div class="footer-links">
          <div class="footer-column">
            <h4>製品</h4>
            <NuxtLink to="/products/board">ミエルボード</NuxtLink>
            <span class="coming-soon">ミエルストック（準備中）</span>
            <span class="coming-soon">ミエルドライブ（準備中）</span>
          </div>
          <div class="footer-column">
            <h4>サポート</h4>
            <a href="#">ヘルプセンター</a>
            <a href="#">お問い合わせ</a>
          </div>
          <div class="footer-column">
            <h4>会社情報</h4>
            <a href="https://iyasaka.co.jp" target="_blank" rel="noopener noreferrer">有限会社IYASAKA</a>
            <a href="#">プライバシーポリシー</a>
            <a href="#">利用規約</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-iyasaka">Powered by <a href="https://iyasaka.co.jp" target="_blank" rel="noopener noreferrer">IYASAKA</a> - 今ある「不」を、未来の「光」へ。</p>
        <p>© 2024 ミエルボード / 有限会社IYASAKA. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const contactEmail = ref('')
const openFaq = ref<number | null>(null)

const faqItems = [
  {
    question: '導入にどのくらい時間がかかりますか？',
    answer: 'アカウント作成から利用開始まで最短5分です。Googleカレンダーとの連携設定を含めても、30分程度で完了します。'
  },
  {
    question: 'サイネージ用の専用機器は必要ですか？',
    answer: 'いいえ、必要ありません。お手持ちのテレビやモニターにブラウザを表示できる機器（Fire TV Stick、Chromecast等）があれば利用可能です。'
  },
  {
    question: '既存のGoogleカレンダーをそのまま使えますか？',
    answer: 'はい、そのまま使えます。Googleカレンダーに登録した予定が自動的にミエルボードに反映されます。カレンダーの運用方法を変える必要はありません。'
  },
  {
    question: '社員ごとにアカウントが必要ですか？',
    answer: 'いいえ、管理者がカレンダーを連携するだけでOKです。社員個人のアカウント作成は不要です（オプションで個人アカウントを作成することもできます）。'
  },
  {
    question: '無料トライアル後の自動課金はありますか？',
    answer: 'いいえ、ありません。無料トライアル期間終了後、ご契約の意思確認をさせていただきます。クレジットカードの事前登録も不要です。'
  }
]

function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index
}

function scrollToContact() {
  // TODO: IYASAKA公式サイト構築後、以下に変更
  // window.location.href = 'https://iyasaka.co.jp/contact?p_id=mieru-board'
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToHowItWorks() {
  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
}

function submitContact() {
  if (contactEmail.value) {
    alert(`${contactEmail.value} にトライアル案内をお送りします。\n（実際の送信機能は未実装です）`)
  }
}

useHead({
  title: 'ミエルボード | 予定がミエル - 週間スケジュールボード | ミエルプラス',
  meta: [
    { name: 'description', content: '「◯◯さん今どこ？」をゼロにする週間スケジュールボード。ホワイトボードの予定表をデジタル化。事務所のテレビに常時表示で、誰が・どこで・何をしているかが一目瞭然。' }
  ]
})
</script>

<style scoped>
/* ================================================================
   ミエルボード テーマカラー
   メイン: #2e7d32 (グリーン)
   ライト: #e8f5e9
   ダーク: #1b5e20
   ================================================================ */

:root {
  --board-primary: #2e7d32;
  --board-primary-light: #e8f5e9;
  --board-primary-dark: #1b5e20;
  --board-accent: #4caf50;
}

/* ベース */
.product-lp {
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
  line-height: 1.7;
}

.board-lp .highlight {
  color: var(--board-primary);
}

.board-lp .highlight::after {
  background: rgba(46, 125, 50, 0.2);
}

/* ナビゲーション */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo-group {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1.25rem;
  text-decoration: none;
  color: #333;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-sub {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  text-decoration: none;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: #f0f4ff;
  border: 1px solid #e0e8ff;
  transition: all 0.2s;
}

.logo-sub:hover {
  background: #e0e8ff;
  border-color: #c0d0ff;
}

.logo-sub-text {
  font-size: 0.6rem;
  color: #888;
}

.logo-sub-brand {
  font-size: 0.65rem;
  font-weight: 600;
  color: #0066cc;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-links a {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #333;
}

.nav-login {
  background: var(--board-primary);
  color: white !important;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
}

.nav-login:hover {
  background: var(--board-primary-dark);
}

/* ヒーローセクション */
.hero {
  padding: 8rem 2rem 4rem;
  background: linear-gradient(135deg, var(--board-primary-light) 0%, #c8e6c9 50%, #a5d6a7 100%);
  min-height: 90vh;
  display: flex;
  align-items: center;
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 4rem;
}

.hero-content {
  flex: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--board-primary);
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 2px solid var(--board-primary);
}

.badge-icon {
  font-size: 1.25rem;
}

.hero h1 {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.3;
  margin-bottom: 1.5rem;
}

.highlight {
  color: #0066cc;
  position: relative;
}

.highlight::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: rgba(0, 102, 204, 0.2);
  z-index: -1;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #555;
  margin-bottom: 2rem;
}

.hero-cta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  border: none;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

/* ヒーロー内のボタン：緑背景に映える白ベース */
.hero .btn-cta {
  background: white;
  color: var(--board-primary-dark);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  font-weight: 700;
}

.hero .btn-cta:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  background: #f5f5f5;
}

.hero .btn-outline {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: 2px solid white;
}

.hero .btn-outline:hover {
  background: white;
  border-color: white;
  color: var(--board-primary-dark);
}

/* 通常のボタン */
.btn-cta {
  background: linear-gradient(135deg, var(--board-primary) 0%, var(--board-accent) 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(46, 125, 50, 0.4);
}

.btn-cta:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(46, 125, 50, 0.5);
  background: linear-gradient(135deg, var(--board-primary-dark) 0%, var(--board-primary) 100%);
}

.btn-outline {
  background: transparent;
  color: #333;
  border: 2px solid #ddd;
}

.btn-outline:hover {
  border-color: #0066cc;
  color: #0066cc;
}

.btn-block {
  width: 100%;
}

.hero-trust {
  display: flex;
  gap: 1.5rem;
  font-size: 0.85rem;
  color: #666;
}

.hero-visual {
  flex: 1;
}

.mockup-container {
  text-align: center;
}

.mockup-tv {
  display: inline-block;
}

.tv-frame {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.tv-screen {
  background: #2d2d44;
  border-radius: 8px;
  overflow: hidden;
}

.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #1a1a2e;
  color: white;
  font-size: 0.8rem;
}

.live-badge {
  font-size: 0.7rem;
}

.mini-schedule {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
  color: #eee;
}

.mini-schedule th,
.mini-schedule td {
  padding: 0.5rem;
  text-align: center;
  border: 1px solid #3d3d5c;
}

.mini-schedule th {
  background: #2d2d44;
}

.mini-schedule .name {
  background: #2d2d44;
  font-weight: bold;
}

.mini-schedule .work { background: #1e4d2b; }
.mini-schedule .meet { background: #4d3d1e; }
.mini-schedule .off { background: #4d1e1e; }

.tv-stand {
  width: 60px;
  height: 30px;
  background: #333;
  margin: 0 auto;
  border-radius: 0 0 8px 8px;
}

.mockup-label {
  margin-top: 1rem;
  color: #666;
  font-size: 0.9rem;
}

/* 課題セクション */
.problems {
  padding: 5rem 2rem;
  background: white;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 3rem;
}

.section-subtitle {
  text-align: center;
  color: #666;
  margin-top: -2rem;
  margin-bottom: 3rem;
}

.problem-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.problem-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 16px;
  transition: all 0.3s;
}

.problem-card:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.problem-before {
  flex: 1;
}

.problem-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.problem-before h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.problem-before p {
  font-size: 0.85rem;
  color: #666;
}

.problem-arrow {
  font-size: 1.5rem;
  color: #0066cc;
  font-weight: bold;
}

.problem-after {
  flex: 1;
  padding: 1rem;
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
  border-radius: 12px;
  text-align: center;
}

.solution-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.problem-after p {
  font-size: 0.85rem;
  color: white;
}

.problem-after strong {
  color: #a5d6a7;
}

/* 機能セクション */
.features {
  padding: 5rem 2rem;
  background: #f8f9fa;
}

.feature-showcase {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: start;
}

.browser-mockup {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.browser-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f0f0f0;
}

.browser-header .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ddd;
}

.browser-header .url {
  margin-left: 1rem;
  font-size: 0.75rem;
  color: #888;
}

.browser-content {
  padding: 1rem;
}

.board-preview {
  font-size: 0.75rem;
}

.board-header-row,
.board-row {
  display: grid;
  grid-template-columns: 100px repeat(5, 1fr);
  gap: 4px;
}

.board-cell {
  padding: 0.5rem;
  text-align: center;
  border-radius: 4px;
}

.board-cell.header {
  background: #e3f2fd;
  font-weight: 600;
}

.board-cell.name {
  background: #f5f5f5;
  font-weight: 600;
}

.board-cell.work {
  background: #e8f5e9;
  color: #2e7d32;
}

.board-cell.meet {
  background: #fff3e0;
  color: #e65100;
}

.board-cell.off {
  background: #ffebee;
  color: #c62828;
}

.board-cell small {
  display: block;
  font-size: 0.65rem;
  opacity: 0.8;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.feature-item .feature-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.feature-item h3 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.feature-item p {
  font-size: 0.9rem;
  color: #666;
}

/* 使い方セクション */
.how-it-works {
  padding: 5rem 2rem;
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
  color: white;
}

.how-it-works .section-title {
  color: white !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  font-weight: 800;
}

.how-it-works .section-subtitle {
  color: white !important;
  opacity: 1;
}

.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 1rem;
  margin-top: 3rem;
}

.step {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
  flex: 1;
  max-width: 200px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.step:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.step::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(46, 125, 50, 0.05), transparent);
  transition: left 0.5s ease;
}

.step:hover::before {
  left: 100%;
}

.step.completed {
  background: linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%);
  border: 3px solid #4caf50;
  box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
}

.step-number {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
  color: white !important;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 auto 1rem;
  box-shadow: 0 4px 15px rgba(46, 125, 50, 0.4);
  position: relative;
}

.step-number::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%);
  pointer-events: none;
}

.step.completed .step-number {
  background: linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%);
  color: white !important;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 15px rgba(46, 125, 50, 0.4); }
  50% { box-shadow: 0 4px 25px rgba(46, 125, 50, 0.7); }
}

.step h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: #333;
}

.step p {
  font-size: 0.85rem;
  color: #555;
}

.step strong {
  color: var(--board-primary);
}

.step-arrow {
  font-size: 1.5rem;
  color: white;
  margin-top: 3rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  font-weight: bold;
}

/* 料金セクション */
.pricing {
  padding: 5rem 2rem;
  background: white;
}

.urgency {
  display: inline-block;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;
}

.pricing-card {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.pricing-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.pricing-card.featured {
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #1b5e20 100%);
  background-size: 200% 200%;
  color: white !important;
  transform: scale(1.05);
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 10px 40px rgba(46, 125, 50, 0.4), 0 0 30px rgba(76, 175, 80, 0.2);
  animation: featured-shimmer 3s ease-in-out infinite;
  overflow: visible;
  margin-top: 20px;
}

@keyframes featured-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.pricing-card.featured::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.pricing-card.featured * {
  color: white !important;
}

.pricing-card.featured .btn,
.pricing-card.featured button {
  background: white !important;
  color: #1b5e20 !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.pricing-card.featured .btn:hover,
.pricing-card.featured button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.pricing-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #333;
  padding: 0.5rem 1.25rem;
  border-radius: 25px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 15px rgba(255, 193, 7, 0.5);
  z-index: 10;
  animation: badge-glow 2s ease-in-out infinite;
}

@keyframes badge-glow {
  0%, 100% { box-shadow: 0 4px 15px rgba(255, 193, 7, 0.5); }
  50% { box-shadow: 0 4px 25px rgba(255, 193, 7, 0.8), 0 0 20px rgba(255, 215, 0, 0.4); }
}

.pricing-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.pricing-target {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 1rem;
}

.pricing-card.featured .pricing-target {
  color: rgba(255, 255, 255, 0.7);
}

.pricing-card.featured .pricing-name {
  color: white !important;
}

.pricing-card.featured .amount,
.pricing-card.featured .currency,
.pricing-card.featured .period {
  color: white !important;
}

.pricing-card.featured .pricing-features li {
  color: white !important;
}

.pricing-card.featured .pricing-features li strong {
  color: white !important;
}

.pricing-card.featured .btn {
  background: white !important;
  color: #1b5e20 !important;
}

.pricing-card.featured .btn:hover {
  background: #f0f0f0 !important;
}

.pricing-card.featured .pricing-guarantee {
  color: rgba(255, 255, 255, 0.8) !important;
}

.pricing-card.featured .pricing-guarantee span {
  color: rgba(255, 255, 255, 0.9) !important;
}

.pricing-price {
  margin-bottom: 1.5rem;
}

.price-current {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.1rem;
}

.currency {
  font-size: 1rem;
}

.amount {
  font-size: 2.5rem;
  font-weight: 800;
}

.period {
  font-size: 0.9rem;
  opacity: 0.7;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin-bottom: 1.5rem;
  text-align: left;
}

.pricing-features li {
  padding: 0.5rem 0;
  font-size: 0.9rem;
}

.pricing-guarantee {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  opacity: 0.7;
}

.pricing-note {
  text-align: center;
  margin-top: 2rem;
  padding: 1rem;
  background: #f0f4ff;
  border-radius: 12px;
}

.pricing-note p {
  margin: 0;
  font-size: 0.9rem;
}

.pricing-note a {
  color: #0066cc;
  font-weight: 600;
}

/* FAQ */
.faq {
  padding: 5rem 2rem;
  background: #f8f9fa;
}

.faq-list {
  max-width: 700px;
  margin: 0 auto;
}

.faq-item {
  background: white;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.faq-question {
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
}

.faq-toggle {
  font-size: 1.5rem;
  color: #0066cc;
}

.faq-answer {
  padding: 0 1.25rem 1.25rem;
  color: #666;
  font-size: 0.9rem;
}

/* CTA */
.cta {
  padding: 5rem 2rem;
  background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
  color: white;
  text-align: center;
}

.cta * {
  color: white !important;
}

.cta h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: white !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  font-weight: 800;
}

.cta p {
  color: white !important;
  opacity: 1;
}

.cta .cta-note {
  color: white !important;
  opacity: 1;
}

.cta input {
  color: #333 !important;
  background: white !important;
}

.cta .btn,
.cta button {
  background: white !important;
  color: #1b5e20 !important;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.cta .btn:hover,
.cta button:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
}

.cta .btn::after,
.cta button::after {
  content: '✨';
  position: absolute;
  right: 15px;
  opacity: 0;
  transition: all 0.3s ease;
}

.cta .btn:hover::after,
.cta button:hover::after {
  opacity: 1;
  right: 10px;
}

.cta > .section-container > p,
.cta-content > p {
  color: white;
  margin-bottom: 2rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.cta-form {
  display: flex;
  justify-content: center;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
}

.cta-form input {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
}

.cta-note {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* CTAセクション内のボタン */
.cta .btn-cta {
  background: white;
  color: var(--board-primary-dark);
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.cta .btn-cta:hover {
  background: #f5f5f5;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

/* フッター */
.footer {
  background: #0f0f1a;
  color: rgba(255, 255, 255, 0.7);
  padding: 4rem 2rem 2rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 4rem;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  color: white;
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.footer-brand p {
  font-size: 0.85rem;
}

.footer-links {
  display: flex;
  gap: 4rem;
}

.footer-column h4 {
  color: white;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.footer-column a {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 0.85rem;
  padding: 0.25rem 0;
}

.footer-column a:hover {
  color: white;
}

.coming-soon {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  padding: 0.25rem 0;
}

.footer-bottom {
  max-width: 1200px;
  margin: 3rem auto 0;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  font-size: 0.85rem;
}

.footer-iyasaka {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.footer-iyasaka a {
  color: #4da6ff;
  text-decoration: none;
  font-weight: 600;
}

.footer-iyasaka a:hover {
  color: white;
  text-decoration: underline;
}

/* レスポンシブ */
@media (max-width: 900px) {
  .hero-container {
    flex-direction: column;
    text-align: center;
  }
  
  .hero-cta {
    justify-content: center;
  }
  
  .hero-trust {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .hero-visual {
    display: none;
  }
  
  .problem-grid {
    grid-template-columns: 1fr;
  }
  
  .problem-card {
    flex-direction: column;
    text-align: center;
  }
  
  .problem-arrow {
    transform: rotate(90deg);
  }
  
  .feature-showcase {
    grid-template-columns: 1fr;
  }
  
  .steps {
    flex-direction: column;
    align-items: center;
  }
  
  .step {
    max-width: 100%;
  }
  
  .step-arrow {
    transform: rotate(90deg);
    margin: 0;
  }
  
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  
  .pricing-card.featured {
    transform: none;
  }
  
  .footer-container {
    flex-direction: column;
  }
  
  .footer-links {
    flex-wrap: wrap;
    gap: 2rem;
  }
  
  .cta-form {
    flex-direction: column;
  }
}
</style>


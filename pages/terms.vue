<template>
  <div class="legal-page">
    <nav class="legal-nav">
      <div class="nav-container">
        <NuxtLink to="/" class="nav-logo">
          <span class="logo-icon">🤖</span>
          <span class="logo-text">ミエルプラス</span>
        </NuxtLink>
        <NuxtLink to="/" class="back-link">← トップに戻る</NuxtLink>
      </div>
    </nav>

    <main class="legal-content">
      <div class="legal-container">
        <h1>利用規約</h1>
        <p class="last-updated">最終更新日: 2026年2月13日</p>

        <section>
          <h2>第1条（適用）</h2>
          <p>
            本利用規約（以下「本規約」）は、有限会社IYASAKA（以下「当社」）が提供する
            「ミエルプラス」（以下「本サービス」）の利用に関する条件を定めるものです。
            ユーザーは、本サービスの利用を開始した時点で本規約に同意したものとみなされます。
          </p>
        </section>

        <section>
          <h2>第2条（定義）</h2>
          <ol>
            <li>「ユーザー」とは、本サービスを利用する個人または法人を指します。</li>
            <li>「組織」とは、本サービスにおいてユーザーが所属するグループ単位を指します。</li>
            <li>「管理者」とは、組織内で管理権限を持つユーザーを指します。</li>
            <li>「コンテンツ」とは、ユーザーが本サービスに登録するデータ（スケジュール、ファイル等）を指します。</li>
          </ol>
        </section>

        <section>
          <h2>第3条（アカウント）</h2>
          <ol>
            <li>ユーザーは、正確かつ最新の情報を登録するものとします。</li>
            <li>アカウントの管理責任はユーザーにあります。パスワードの管理を適切に行ってください。</li>
            <li>アカウントの不正利用を発見した場合は、速やかに当社に連絡してください。</li>
          </ol>
        </section>

        <section>
          <h2>第4条（サービス内容）</h2>
          <p>本サービスは以下の機能を提供します。</p>
          <ul>
            <li>ミエルボード: 週間スケジュールの管理・表示</li>
            <li>サイネージモード: 大画面ディスプレイへの常時表示</li>
            <li>AIコンシェルジュ: 自然言語による情報検索</li>
            <li>カレンダー連携: Google/Outlookカレンダーとの同期</li>
            <li>その他、当社が提供する関連機能</li>
          </ul>
        </section>

        <section>
          <h2>第5条（料金・支払い）</h2>
          <ol>
            <li>本サービスの料金体系は、当社ウェブサイト上で別途定めるものとします。</li>
            <li>有料プランの決済はStripe社の決済システムを利用します。</li>
            <li>料金の改定は、30日前までにユーザーに通知するものとします。</li>
            <li>無料トライアル期間中に解約した場合、料金は発生しません。</li>
          </ol>
        </section>

        <section>
          <h2>第6条（禁止事項）</h2>
          <p>ユーザーは以下の行為を行ってはなりません。</p>
          <ol>
            <li>法令または公序良俗に違反する行為</li>
            <li>当社または第三者の知的財産権、プライバシー等を侵害する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>不正アクセスまたはそのおそれのある行為</li>
            <li>他のユーザーの情報を不正に取得する行為</li>
            <li>当社の許可なく本サービスを商業目的で第三者に提供する行為</li>
          </ol>
        </section>

        <section>
          <h2>第7条（データの取り扱い）</h2>
          <ol>
            <li>ユーザーが登録したコンテンツの所有権はユーザーに帰属します。</li>
            <li>当社は、サービス提供のために必要な範囲でコンテンツにアクセスすることがあります。</li>
            <li>当社は、適切なセキュリティ対策を講じてコンテンツを保護します。</li>
            <li>アカウント削除時のデータ取り扱いについては、プライバシーポリシーに従います。</li>
          </ol>
        </section>

        <section>
          <h2>第8条（サービスの変更・停止）</h2>
          <ol>
            <li>当社は、事前の通知なくサービスの内容を変更することがあります。</li>
            <li>以下の場合、サービスを一時的に停止することがあります。
              <ul>
                <li>システムの保守・点検を行う場合</li>
                <li>天災、停電、その他の不可抗力による場合</li>
                <li>その他、当社がやむを得ないと判断した場合</li>
              </ul>
            </li>
          </ol>
        </section>

        <section>
          <h2>第9条（免責事項）</h2>
          <ol>
            <li>当社は、本サービスの内容の正確性・完全性・有用性等について保証しません。</li>
            <li>当社は、ユーザーが本サービスを利用することにより生じた損害について、当社に故意または重大な過失がある場合を除き、責任を負いません。</li>
            <li>当社の賠償責任は、直近12ヶ月間にユーザーが支払った利用料金の総額を上限とします。</li>
          </ol>
        </section>

        <section>
          <h2>第10条（解約）</h2>
          <ol>
            <li>ユーザーは、いつでも本サービスを解約することができます。</li>
            <li>解約手続きは、管理画面またはStripe Customer Portalから行うことができます。</li>
            <li>解約後のデータは、30日間保持した後に削除されます。</li>
          </ol>
        </section>

        <section>
          <h2>第11条（規約の変更）</h2>
          <p>
            当社は、必要に応じて本規約を変更することがあります。
            変更後の規約は、当社ウェブサイト上に掲示した時点で効力を生じるものとします。
            重要な変更については、メールまたはサービス内通知でお知らせします。
          </p>
        </section>

        <section>
          <h2>第12条（準拠法・裁判管轄）</h2>
          <ol>
            <li>本規約は日本法に準拠します。</li>
            <li>本サービスに関する紛争については、当社所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</li>
          </ol>
        </section>

        <section class="contact-section">
          <h2>お問い合わせ</h2>
          <p>本規約に関するお問い合わせは、以下までご連絡ください。</p>
          <div class="contact-info">
            <p><strong>有限会社IYASAKA</strong></p>
            <p>メール: info@iyasaka.co.jp</p>
            <p>ウェブ: <a href="https://iyasaka.co.jp" target="_blank" rel="noopener noreferrer">https://iyasaka.co.jp</a></p>
          </div>
        </section>
      </div>
    </main>

    <footer class="legal-footer">
      <p>&copy; {{ new Date().getFullYear() }} ミエルプラス / 有限会社IYASAKA. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: '利用規約 | ミエルプラス',
  meta: [
    { name: 'description', content: 'ミエルプラスの利用規約です。サービスのご利用条件をご確認ください。' }
  ]
})
</script>

<style scoped>
.legal-page {
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
  line-height: 1.8;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.legal-nav {
  background: white;
  border-bottom: 1px solid #eee;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: #1a1a2e;
  font-weight: bold;
  font-size: 1.1rem;
}

.logo-icon {
  font-size: 1.3rem;
}

.back-link {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  color: #333;
}

.legal-content {
  flex: 1;
  background: #fafafa;
  padding: 3rem 0;
}

.legal-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
  background: white;
  border-radius: 12px;
  padding: 3rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

h1 {
  font-size: 2rem;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
}

.last-updated {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

section {
  margin-bottom: 2rem;
}

h2 {
  font-size: 1.2rem;
  color: #1a1a2e;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

p, li {
  color: #555;
  margin-bottom: 0.5rem;
}

ol, ul {
  padding-left: 1.5rem;
}

ul ul {
  margin-top: 0.5rem;
}

.contact-section {
  background: #f8f9ff;
  padding: 1.5rem;
  border-radius: 8px;
}

.contact-info {
  margin-top: 0.75rem;
}

.contact-info p {
  margin-bottom: 0.25rem;
}

.contact-info a {
  color: #4a90d9;
}

.legal-footer {
  background: #1a1a2e;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  padding: 1.5rem;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .legal-container {
    padding: 1.5rem;
    border-radius: 0;
  }

  h1 {
    font-size: 1.5rem;
  }

  .legal-content {
    padding: 1rem 0;
  }
}
</style>

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
        <h1>プライバシーポリシー</h1>
        <p class="last-updated">最終更新日: 2026年2月13日</p>

        <section>
          <h2>1. はじめに</h2>
          <p>
            有限会社IYASAKA（以下「当社」）は、「ミエルプラス」（以下「本サービス」）を通じて取得する
            個人情報の保護に努めています。本プライバシーポリシー（以下「本ポリシー」）は、
            当社が収集する情報の種類、利用目的、保護方法について説明します。
          </p>
        </section>

        <section>
          <h2>2. 収集する情報</h2>
          <h3>2-1. ユーザーが提供する情報</h3>
          <ul>
            <li>氏名</li>
            <li>メールアドレス</li>
            <li>会社名・組織名</li>
            <li>パスワード（暗号化して保存）</li>
          </ul>

          <h3>2-2. サービス利用に伴い自動的に収集される情報</h3>
          <ul>
            <li>IPアドレス</li>
            <li>ブラウザの種類・バージョン</li>
            <li>アクセス日時・利用履歴</li>
            <li>Cookie情報</li>
          </ul>

          <h3>2-3. 第三者サービスを通じて収集される情報</h3>
          <ul>
            <li>Googleアカウント情報（Googleログイン使用時）</li>
            <li>Googleカレンダーの予定データ（カレンダー連携使用時）</li>
            <li>Stripeの決済関連情報（有料プラン契約時）</li>
          </ul>
        </section>

        <section>
          <h2>3. 情報の利用目的</h2>
          <p>当社は、収集した情報を以下の目的で利用します。</p>
          <ol>
            <li>本サービスの提供・運営</li>
            <li>ユーザーアカウントの管理</li>
            <li>カスタマーサポートの提供</li>
            <li>サービスの改善・新機能の開発</li>
            <li>利用状況の分析</li>
            <li>セキュリティの確保・不正利用の防止</li>
            <li>法令に基づく対応</li>
            <li>重要なお知らせ・サービスに関する通知</li>
          </ol>
        </section>

        <section>
          <h2>4. 情報の共有・第三者提供</h2>
          <p>当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。</p>
          <ol>
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく開示請求がある場合</li>
            <li>サービス提供に必要な外部サービス（以下参照）との連携</li>
          </ol>

          <h3>利用する外部サービス</h3>
          <table class="service-table">
            <thead>
              <tr>
                <th>サービス</th>
                <th>目的</th>
                <th>データ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Stripe</td>
                <td>決済処理</td>
                <td>決済関連情報</td>
              </tr>
              <tr>
                <td>Google</td>
                <td>認証・カレンダー連携</td>
                <td>アカウント情報・カレンダーデータ</td>
              </tr>
              <tr>
                <td>Sentry</td>
                <td>エラー監視</td>
                <td>エラー情報（個人情報を含まない）</td>
              </tr>
              <tr>
                <td>Resend</td>
                <td>メール送信</td>
                <td>メールアドレス・メール内容</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>5. データの保存・保護</h2>
          <ol>
            <li>データは日本国内のセキュアなサーバーに保存されます。</li>
            <li>全ての通信はSSL/TLSで暗号化されています。</li>
            <li>パスワードはハッシュ化して保存され、平文では保存しません。</li>
            <li>マルチテナント構成により、組織ごとにデータが完全に分離されています。</li>
            <li>定期的なセキュリティ監査を実施しています。</li>
          </ol>
        </section>

        <section>
          <h2>6. Cookie の使用</h2>
          <p>本サービスでは以下の目的でCookieを使用します。</p>
          <ul>
            <li>ログイン状態の維持（セッションCookie）</li>
            <li>ユーザー設定の保存</li>
          </ul>
          <p>
            ブラウザの設定でCookieを無効にすることができますが、
            一部の機能が正常に動作しなくなる場合があります。
          </p>
        </section>

        <section>
          <h2>7. ユーザーの権利</h2>
          <p>ユーザーは以下の権利を有します。</p>
          <ol>
            <li><strong>アクセス権</strong>: 当社が保有するご自身の個人情報の開示を求める権利</li>
            <li><strong>訂正権</strong>: 不正確な個人情報の訂正を求める権利</li>
            <li><strong>削除権</strong>: 個人情報の削除を求める権利</li>
            <li><strong>データポータビリティ</strong>: 個人情報の提供を求める権利</li>
          </ol>
          <p>これらの権利の行使については、下記のお問い合わせ先までご連絡ください。</p>
        </section>

        <section>
          <h2>8. データの保持期間</h2>
          <ol>
            <li>アカウントが有効な間、ユーザーデータを保持します。</li>
            <li>アカウント削除後、30日以内にすべてのユーザーデータを削除します。</li>
            <li>法令で保存が義務付けられている情報は、所定の期間保持します。</li>
            <li>バックアップデータは、90日以内に完全削除されます。</li>
          </ol>
        </section>

        <section>
          <h2>9. 未成年者の保護</h2>
          <p>
            本サービスは、企業・組織向けのサービスです。
            16歳未満の方は、保護者の同意なく本サービスを利用することはできません。
          </p>
        </section>

        <section>
          <h2>10. ポリシーの変更</h2>
          <p>
            当社は、必要に応じて本ポリシーを変更することがあります。
            重要な変更については、メールまたはサービス内通知でお知らせします。
            変更後も本サービスを継続して利用する場合、
            変更後のポリシーに同意したものとみなされます。
          </p>
        </section>

        <section class="contact-section">
          <h2>11. お問い合わせ</h2>
          <p>個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。</p>
          <div class="contact-info">
            <p><strong>有限会社IYASAKA（個人情報保護担当）</strong></p>
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
  title: 'プライバシーポリシー | ミエルプラス',
  meta: [
    { name: 'description', content: 'ミエルプラスのプライバシーポリシーです。個人情報の取り扱いについてご確認ください。' }
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

h3 {
  font-size: 1rem;
  color: #444;
  margin: 1rem 0 0.5rem;
}

p, li {
  color: #555;
  margin-bottom: 0.5rem;
}

ol, ul {
  padding-left: 1.5rem;
}

.service-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.service-table th,
.service-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.service-table th {
  background: #f8f9ff;
  font-weight: 600;
  color: #333;
}

.service-table td {
  color: #555;
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

  .service-table {
    font-size: 0.85rem;
  }

  .service-table th,
  .service-table td {
    padding: 0.5rem;
  }
}
</style>

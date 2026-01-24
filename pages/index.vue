<template>
  <div class="landing">
    <!-- ナビゲーション -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-logo">
          <span class="logo-icon">🤖</span>
          <span class="logo-text">ミエルプラス</span>
        </div>
        <div class="nav-links">
          <a href="#features">機能</a>
          <a href="#pricing">料金</a>
          <a href="#faq">よくある質問</a>
          <NuxtLink to="/login" class="nav-login">ログイン</NuxtLink>
        </div>
      </div>
    </nav>

    <!-- ヒーローセクション -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">🤖 AIで現場の「見えない」を解決</div>
        <h1>予定も、在庫も、車両も。<br><span class="highlight">現場がぜんぶミエル。</span></h1>
        <p class="hero-subtitle">
          現場の「見えない」が業務を止める。<br>
          AIが予定・在庫・車両をまとめて見える化。
        </p>
        <div class="hero-cta">
          <button @click="scrollToContact" class="btn btn-cta btn-large">
            🚀 無料で試してみる
          </button>
          <button @click="scrollToFeatures" class="btn btn-outline btn-large">
            機能を見る
          </button>
        </div>
        <div class="hero-trust">
          <span>✓ 初期費用無料</span>
          <span>✓ 14日間無料トライアル</span>
          <span>✓ クレジットカード不要</span>
        </div>
        <div class="hero-urgency">
          🎁 <strong>今月限定:</strong> 初月50%OFF + 導入サポート無料（残り<span class="countdown">12</span>社）
        </div>
      </div>
      <div class="hero-visual">
        <div class="mockup-screen">
          <div class="mockup-header">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="mockup-title">週間ボード - ミエルボード</span>
          </div>
          <div class="mockup-content">
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
      </div>
    </section>

    <!-- 課題セクション -->
    <section class="problems">
      <div class="section-container">
        <h2 class="section-title">こんな悩み、ありませんか？</h2>
        <div class="problem-grid">
          <div class="problem-card">
            <div class="problem-icon">📝</div>
            <h3>ホワイトボードの限界</h3>
            <p>手書きで書き直し、消し忘れ、見づらい…。外出先から確認もできない。</p>
          </div>
          <div class="problem-card">
            <div class="problem-icon">🔍</div>
            <h3>「誰がどこ？」がわからない</h3>
            <p>急な問い合わせで「◯◯さん今日どこ？」と聞かれても即答できない。</p>
          </div>
          <div class="problem-card">
            <div class="problem-icon">📅</div>
            <h3>カレンダーがバラバラ</h3>
            <p>個人のカレンダーはあるけど、チーム全体の「今週」が見えない。</p>
          </div>
          <div class="problem-card">
            <div class="problem-icon">⏰</div>
            <h3>朝礼での確認が非効率</h3>
            <p>毎朝「今日の予定は？」を一人ずつ確認。時間がもったいない。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ソリューションセクション -->
    <section class="solution">
      <div class="section-container">
        <div class="solution-content">
          <div class="solution-text">
            <h2>ミエルプラスなら、<br>すべて解決。</h2>
            <p>
              事務所のテレビやモニターに、週間スケジュールを常時表示。
              誰が・どこで・何をしているかが、一目でわかります。
            </p>
            <ul class="solution-list">
              <li>✓ Googleカレンダーと自動連携</li>
              <li>✓ 部門・現場でフィルタリング</li>
              <li>✓ スマホからも確認可能</li>
              <li>✓ 設定5分で導入完了</li>
            </ul>
          </div>
          <div class="solution-image">
            <div class="tv-mockup">
              <div class="tv-screen">📺 サイネージ表示</div>
              <div class="tv-stand"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ビジョンセクション -->
    <section class="vision">
      <div class="section-container">
        <!-- ナラティブ（ストーリー）部分 - IYASAKA「不を光へ」 -->
        <div class="narrative-section">
          <span class="narrative-label">今ある「不」を、未来の「光」へ。</span>
          <div class="narrative-content">
            <div class="narrative-pain">
              <h3>😰 現場の「不」</h3>
              <ul>
                <li><strong>不透明</strong>：「◯◯さん今どこ？」→ 電話で確認</li>
                <li><strong>不安</strong>：「資材まだある？」→ 現場に聞く</li>
                <li><strong>不便</strong>：「車両空いてる？」→ ホワイトボード確認</li>
              </ul>
              <p class="narrative-summary">情報が散らばり、確認に時間を奪われる毎日。</p>
            </div>
            <div class="narrative-arrow">→</div>
            <div class="narrative-solution">
              <h3>✨ 変換後の「光」</h3>
              <ul>
                <li>人・モノ・車が<strong>1画面で透明に</strong></li>
                <li>AIに聞けば<strong>3秒で安心</strong></li>
                <li>探す時間ゼロで<strong>対話が増える</strong></li>
              </ul>
              <p class="narrative-summary">現場の「見えない」を「ミエル」に。探す時間が消え、対話が増える現場へ。</p>
            </div>
          </div>
        </div>

        <!-- 製品スイート部分 -->
        <div class="products-section">
          <span class="products-label">これを実現する4つのプロダクト + AI</span>
        </div>
        
        <div class="product-suite">
          <!-- 3つの製品カード -->
          <div class="product-cards-row">
            <NuxtLink to="/products/board" class="product-card-link">
              <div class="product-card active board-theme">
                <div class="product-icon">📆</div>
                <div class="product-status available">利用可能</div>
                <h3>ミエルボード</h3>
                <p>予定がミエル</p>
                <ul>
                  <li>週間スケジュールボード</li>
                  <li>サイネージ表示</li>
                  <li>カレンダー連携</li>
                </ul>
                <div class="product-card-cta board-cta">詳しく見る →</div>
              </div>
            </NuxtLink>
            
            <div class="product-card coming-soon-card stock-theme">
              <div class="product-icon">📦</div>
              <div class="product-status coming">Coming Soon</div>
              <h3>ミエルストック</h3>
              <p>在庫がミエル</p>
              <ul>
                <li>在庫・資材管理</li>
                <li>現場別在庫</li>
                <li>発注アラート</li>
              </ul>
              <div class="product-card-cta disabled">準備中</div>
            </div>
            
            <div class="product-card coming-soon-card drive-theme">
              <div class="product-icon">🚗</div>
              <div class="product-status coming">Coming Soon</div>
              <h3>ミエルドライブ</h3>
              <p>車両がミエル</p>
              <ul>
                <li>車両管理</li>
                <li>アルコールチェック</li>
                <li>運転日報</li>
              </ul>
              <div class="product-card-cta disabled">準備中</div>
            </div>
            
            <div class="product-card coming-soon-card file-theme">
              <div class="product-icon">📁</div>
              <div class="product-status coming">Coming Soon</div>
              <h3>ミエルファイル</h3>
              <p>ファイルがミエル</p>
              <ul>
                <li>図面バージョン管理</li>
                <li>AI差分検出</li>
                <li>現場別ファイル整理</li>
              </ul>
              <div class="product-card-cta disabled">準備中</div>
            </div>
          </div>
          
          <!-- AIを土台として下に横長表示 -->
          <div class="product-ai-foundation">
            <div class="ai-foundation-connector">
              <div class="connector-line"></div>
              <div class="connector-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div class="ai-foundation-content">
              <div class="ai-foundation-main">
                <div class="ai-foundation-left">
                  <div class="ai-foundation-icon">🤖</div>
                  <div class="ai-foundation-info">
                    <div class="ai-foundation-badge">全プラン標準搭載</div>
                    <h3>ミエルプラス <span class="beta-tag">β版準備中</span></h3>
                    <p>すべての製品を横断して検索・操作するAIコンシェルジュ</p>
                  </div>
                </div>
                <div class="ai-foundation-features">
                  <div class="ai-feature">
                    <span class="feature-icon">💬</span>
                    <span>自然言語で検索</span>
                  </div>
                  <div class="ai-feature">
                    <span class="feature-icon">🔄</span>
                    <span>モジュール横断</span>
                  </div>
                  <div class="ai-feature">
                    <span class="feature-icon">📊</span>
                    <span>レポート自動生成</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- ボタンをカラムの外に分離 -->
            <button 
              class="ai-expand-trigger" 
              :class="{ 'is-expanded': showAiDemo }"
              @click="showAiDemo = !showAiDemo"
            >
              <span class="trigger-content">
                <span class="trigger-icon">🚀</span>
                <span class="trigger-text">ミエルプラスが日々の業務を10倍速に!!</span>
              </span>
              <span class="trigger-arrow" :class="{ 'rotated': showAiDemo }">▼</span>
            </button>
            
            <!-- アコーディオンで下に展開するデモ -->
            <div class="ai-demo-accordion" :class="{ 'is-open': showAiDemo }">
              <div class="ai-demo-inner">
                <div class="ai-chat-demo">
                  <div class="chat-message user">
                    <span class="avatar">👤</span>
                    <div class="bubble">◯◯さん今週の予定は？</div>
                  </div>
                  <div class="chat-message ai">
                    <span class="avatar">🤖</span>
                    <div class="bubble">
                      <strong>◯◯さんの今週の予定：</strong><br>
                      月〜水: ◯◯ホテル 新館配線工事<br>
                      木: △△ビル 打合せ / 金: 休み
                    </div>
                  </div>
                  <div class="chat-message user">
                    <span class="avatar">👤</span>
                    <div class="bubble">◯◯ホテル現場に足りない資材は？</div>
                  </div>
                  <div class="chat-message ai">
                    <span class="avatar">🤖</span>
                    <div class="bubble">
                      ⚠️ LANケーブル Cat6: 残り50m（要発注）<br>
                      ⚠️ コネクタ RJ45: 残り12個（要発注）
                    </div>
                  </div>
                </div>
                <div class="ai-credits-compact">
                  <span>月間クレジット:</span>
                  <span class="credits">100回 → 500回 → <strong>2,000回</strong> → ∞</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- 機能セクション -->
    <section id="features" class="features">
      <div class="section-container">
        <h2 class="section-title">現場の「見えない」を解決する4つの製品</h2>
        <p class="section-subtitle">あなたの現場はどの「見えない」に困っていますか？</p>
        <div class="feature-grid">
          <div 
            class="feature-card" 
            :class="{ active: selectedProduct === 'board' }"
            @click="selectProduct('board')"
          >
            <span class="feature-status available">利用可能</span>
            <div class="feature-icon">📆</div>
            <h3>ミエルボード</h3>
            <p class="feature-tagline">予定がミエル</p>
            <div class="feature-problems">
              <div class="problem-item">😰 「◯◯さん今どこ？」を毎回電話で確認</div>
              <div class="problem-item">😰 ホワイトボードの書き換えが面倒</div>
              <div class="problem-item">😰 外出先から予定が確認できない</div>
            </div>
            <NuxtLink to="/products/board" class="feature-cta-link">
              <div class="feature-cta">
                <span class="cta-text">製品ページを見る</span>
                <span class="cta-arrow">→</span>
              </div>
            </NuxtLink>
          </div>
          <div 
            class="feature-card"
            :class="{ active: selectedProduct === 'stock' }"
            @click="selectProduct('stock')"
          >
            <span class="feature-status coming">Coming Soon</span>
            <div class="feature-icon">📦</div>
            <h3>ミエルストック</h3>
            <p class="feature-tagline">在庫がミエル</p>
            <div class="feature-problems">
              <div class="problem-item">😰 「資材まだある？」を現場に電話で確認</div>
              <div class="problem-item">😰 在庫切れで現場作業がストップ</div>
              <div class="problem-item">😰 月末の棚卸しに丸1日かかる</div>
            </div>
            <div class="feature-cta">
              <span class="cta-text">詳細と料金を見る</span>
              <span class="cta-arrow">→</span>
            </div>
          </div>
          <div 
            class="feature-card"
            :class="{ active: selectedProduct === 'drive' }"
            @click="selectProduct('drive')"
          >
            <span class="feature-status coming">Coming Soon</span>
            <div class="feature-icon">🚗</div>
            <h3>ミエルドライブ</h3>
            <p class="feature-tagline">車両がミエル</p>
            <div class="feature-problems">
              <div class="problem-item">😰 「どの車両が空いてる？」がわからない</div>
              <div class="problem-item">😰 アルコールチェック記録がバラバラ</div>
              <div class="problem-item">😰 監査時の書類準備に時間がかかる</div>
            </div>
            <div class="feature-cta">
              <span class="cta-text">詳細と料金を見る</span>
              <span class="cta-arrow">→</span>
            </div>
          </div>
          <div 
            class="feature-card"
            :class="{ active: selectedProduct === 'file' }"
            @click="selectProduct('file')"
          >
            <span class="feature-status coming">Coming Soon</span>
            <div class="feature-icon">📁</div>
            <h3>ミエルファイル</h3>
            <p class="feature-tagline">ファイルがミエル</p>
            <div class="feature-problems">
              <div class="problem-item">😰 「あの図面どこ？」が見つからない</div>
              <div class="problem-item">😰 どれが最新版かわからない</div>
              <div class="problem-item">😰 図面の変更点を追えない</div>
            </div>
            <div class="feature-cta">
              <span class="cta-text">詳細と料金を見る</span>
              <span class="cta-arrow">→</span>
            </div>
          </div>
        </div>
        
        <!-- 製品詳細パネル -->
        <div v-if="selectedProduct" class="product-detail-panel">
          <div class="product-detail-content">
            <div class="product-detail-header">
              <span class="product-detail-icon">{{ productDetails[selectedProduct].icon }}</span>
              <div>
                <h3>{{ productDetails[selectedProduct].name }}</h3>
                <p class="product-detail-tagline">{{ productDetails[selectedProduct].tagline }}</p>
              </div>
              <button @click="selectedProduct = null" class="close-detail">✕</button>
            </div>
            
            <div class="product-detail-body">
              <div class="product-detail-description">
                <h4>📋 機能概要</h4>
                <p>{{ productDetails[selectedProduct].description }}</p>
                <ul>
                  <li v-for="feature in productDetails[selectedProduct].features" :key="feature">
                    {{ feature }}
                  </li>
                </ul>
              </div>
              
              <div class="product-detail-use-cases">
                <h4>💡 こんな課題を解決</h4>
                <ul>
                  <li v-for="useCase in productDetails[selectedProduct].useCases" :key="useCase">
                    {{ useCase }}
                  </li>
                </ul>
              </div>
              
              <div class="product-detail-pricing">
                <h4>💰 単体料金プラン</h4>
                <div class="single-product-pricing">
                  <div 
                    v-for="plan in productDetails[selectedProduct].plans" 
                    :key="plan.name"
                    class="single-plan-card"
                    :class="{ recommended: plan.recommended }"
                  >
                    <div v-if="plan.recommended" class="plan-badge">おすすめ</div>
                    <div class="plan-name">{{ plan.name }}</div>
                    <div class="plan-users">{{ plan.users }}</div>
                    <div class="plan-price">
                      <span class="price-amount">¥{{ plan.price.toLocaleString() }}</span>
                      <span class="price-period">/月</span>
                    </div>
                    <ul class="plan-features">
                      <li v-for="f in plan.features" :key="f">{{ f }}</li>
                    </ul>
                  </div>
                </div>
                <p class="pricing-note">※ 複数製品をまとめてご利用の場合はお得な組み合わせ料金をご確認ください</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 導入効果セクション -->
    <section class="benefits">
      <div class="section-container">
        <h2 class="section-title">導入効果</h2>
        <div class="benefit-grid">
          <div class="benefit-item">
            <div class="benefit-number">90<span>%</span></div>
            <div class="benefit-label">ホワイトボード<br>書き換え時間削減</div>
          </div>
          <div class="benefit-item">
            <div class="benefit-number">5<span>分</span></div>
            <div class="benefit-label">朝礼の<br>時間短縮</div>
          </div>
          <div class="benefit-item">
            <div class="benefit-number">0<span>円</span></div>
            <div class="benefit-label">追加ハードウェア<br>不要</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 社会的証明セクション -->
    <section class="social-proof">
      <div class="section-container">
        <div class="proof-stats">
          <div class="proof-item">
            <div class="proof-number">150<span>+</span></div>
            <div class="proof-label">導入企業</div>
          </div>
          <div class="proof-divider"></div>
          <div class="proof-item">
            <div class="proof-number">2,400<span>+</span></div>
            <div class="proof-label">アクティブユーザー</div>
          </div>
          <div class="proof-divider"></div>
          <div class="proof-item">
            <div class="proof-number">98<span>%</span></div>
            <div class="proof-label">継続率</div>
          </div>
          <div class="proof-divider"></div>
          <div class="proof-item">
            <div class="proof-number">4.8<span>/5</span></div>
            <div class="proof-label">顧客満足度</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 料金セクション（組み合わせ計算機） -->
    <section id="pricing" class="pricing">
      <div class="section-container">
        <h2 class="section-title">自由な組み合わせで現場をミエル化</h2>
        <p class="section-subtitle">
          必要な製品だけを選んで、あなたの現場に最適なプランを作成<br>
          <span class="urgency">🎁 複数製品の同時導入で最大20%OFF</span>
        </p>
        
        <!-- 組み合わせ計算機 -->
        <div class="pricing-calculator">
          <!-- ステップ1: 製品選択 -->
          <div class="calc-step">
            <div class="calc-step-header">
              <span class="step-number">1</span>
              <h3>使いたい製品を選択</h3>
            </div>
            <div class="product-selector">
              <label class="product-checkbox" :class="{ selected: selectedProducts.board }">
                <input type="checkbox" v-model="selectedProducts.board">
                <div class="product-checkbox-content">
                  <span class="product-checkbox-icon">📆</span>
                  <div class="product-checkbox-info">
                    <strong>ミエルボード</strong>
                    <span>予定がミエル</span>
                  </div>
                  <span class="product-checkbox-status available">利用可能</span>
                </div>
              </label>
              <label class="product-checkbox" :class="{ selected: selectedProducts.stock }">
                <input type="checkbox" v-model="selectedProducts.stock">
                <div class="product-checkbox-content">
                  <span class="product-checkbox-icon">📦</span>
                  <div class="product-checkbox-info">
                    <strong>ミエルストック</strong>
                    <span>在庫がミエル</span>
                  </div>
                  <span class="product-checkbox-status coming">Coming Soon</span>
                </div>
              </label>
              <label class="product-checkbox" :class="{ selected: selectedProducts.drive }">
                <input type="checkbox" v-model="selectedProducts.drive">
                <div class="product-checkbox-content">
                  <span class="product-checkbox-icon">🚗</span>
                  <div class="product-checkbox-info">
                    <strong>ミエルドライブ</strong>
                    <span>車両がミエル</span>
                  </div>
                  <span class="product-checkbox-status coming">Coming Soon</span>
                </div>
              </label>
              <label class="product-checkbox" :class="{ selected: selectedProducts.file }">
                <input type="checkbox" v-model="selectedProducts.file">
                <div class="product-checkbox-content">
                  <span class="product-checkbox-icon">📁</span>
                  <div class="product-checkbox-info">
                    <strong>ミエルファイル</strong>
                    <span>ファイルがミエル</span>
                  </div>
                  <span class="product-checkbox-status coming">Coming Soon</span>
                </div>
              </label>
            </div>
          </div>
          
          <!-- ステップ2: 規模選択 -->
          <div class="calc-step">
            <div class="calc-step-header">
              <span class="step-number">2</span>
              <h3>チームの規模を選択</h3>
            </div>
            <div class="tier-selector">
              <button 
                v-for="(tier, key) in userTiers" 
                :key="key"
                class="tier-btn"
                :class="{ active: selectedUserTier === key }"
                @click="selectedUserTier = key"
              >
                <span class="tier-label">{{ tier.label }}</span>
              </button>
            </div>
          </div>
          
          <!-- 計算結果 -->
          <div class="calc-result">
            <div class="result-header">
              <h3>📊 お見積り結果</h3>
            </div>
            <div class="result-body">
              <div class="result-products">
                <div class="result-product" v-if="selectedProducts.board">
                  <span class="product-name">📆 ミエルボード</span>
                  <span class="product-price" v-if="selectedUserTier !== 'enterprise'">
                    ¥{{ productPrices.board[selectedUserTier]?.toLocaleString() }}/月
                  </span>
                  <span class="product-price" v-else>要相談</span>
                </div>
                <div class="result-product" v-if="selectedProducts.stock">
                  <span class="product-name">📦 ミエルストック</span>
                  <span class="product-price" v-if="selectedUserTier !== 'enterprise'">
                    ¥{{ productPrices.stock[selectedUserTier]?.toLocaleString() }}/月
                  </span>
                  <span class="product-price" v-else>要相談</span>
                </div>
                <div class="result-product" v-if="selectedProducts.drive">
                  <span class="product-name">🚗 ミエルドライブ</span>
                  <span class="product-price" v-if="selectedUserTier !== 'enterprise'">
                    ¥{{ productPrices.drive[selectedUserTier]?.toLocaleString() }}/月
                  </span>
                  <span class="product-price" v-else>要相談</span>
                </div>
                <div class="result-product" v-if="selectedProducts.file">
                  <span class="product-name">📁 ミエルファイル</span>
                  <span class="product-price" v-if="selectedUserTier !== 'enterprise'">
                    ¥{{ productPrices.file[selectedUserTier]?.toLocaleString() }}/月
                  </span>
                  <span class="product-price" v-else>要相談</span>
                </div>
                <div class="result-product ai-included">
                  <span class="product-name">🤖 ミエルプラス</span>
                  <span class="product-price included">
                    {{ typeof aiCredits[selectedUserTier] === 'number' ? aiCredits[selectedUserTier] + '回/月' : aiCredits[selectedUserTier] }}（標準搭載）
                  </span>
                </div>
              </div>
              
              <div v-if="discountRate > 0" class="result-discount">
                <span class="discount-badge">🎉 {{ discountRate }}%OFF適用!</span>
                <span class="discount-reason">複数製品同時導入割引</span>
              </div>
              
              <div class="result-total">
                <div class="total-label">月額合計</div>
                <div class="total-price" v-if="calculatedPrice !== null">
                  <span class="price-main">¥{{ calculatedPrice.toLocaleString() }}</span>
                  <span class="price-period">/月（税抜）</span>
                </div>
                <div class="total-price" v-else>
                  <span class="price-main">お問い合わせ</span>
                </div>
              </div>
              
              <div class="result-note" v-if="!selectedProducts.board && !selectedProducts.stock && !selectedProducts.drive">
                <p>👆 使いたい製品を1つ以上選択してください</p>
              </div>
              
              <div class="result-actions">
                <button class="btn btn-cta btn-large btn-block" @click="scrollToContact">
                  🚀 14日間無料で試す
                </button>
                <p class="action-note">クレジットカード不要 • いつでも解約可能</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- エンタープライズ案内 -->
        <div class="enterprise-banner">
          <div class="enterprise-content">
            <div class="enterprise-text">
              <h3>🏢 エンタープライズプラン</h3>
              <p>100名以上の大規模組織、オンプレミス、カスタム開発、SLA保証など<br>特殊要件にも柔軟に対応いたします。</p>
            </div>
            <button class="btn btn-outline" @click="scrollToContact">
              お問い合わせ →
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- プラン詳細モーダル -->
    <div v-if="selectedPlan" class="modal-overlay" @click.self="selectedPlan = null">
      <div class="plan-modal">
        <button @click="selectedPlan = null" class="modal-close">✕</button>
        
        <div class="plan-modal-header" :class="selectedPlan.id">
          <div class="plan-modal-badge" v-if="selectedPlan.badge">{{ selectedPlan.badge }}</div>
          <h2>{{ selectedPlan.name }}プラン</h2>
          <p class="plan-modal-target">{{ selectedPlan.target }}</p>
        </div>

        <div class="plan-modal-body">
          <!-- ペインと解決 -->
          <div class="plan-pain-solution">
            <div class="pain-section">
              <h3>😰 こんな課題はありませんか？</h3>
              <ul>
                <li v-for="pain in selectedPlan.pains" :key="pain">{{ pain }}</li>
              </ul>
            </div>
            <div class="solution-arrow">→</div>
            <div class="solution-section">
              <h3>✨ 導入後の未来</h3>
              <ul>
                <li v-for="solution in selectedPlan.solutions" :key="solution">{{ solution }}</li>
              </ul>
            </div>
          </div>

          <!-- 機能一覧 -->
          <div class="plan-features-detail">
            <h3>📋 含まれる機能</h3>
            <div class="features-grid">
              <div v-for="feature in selectedPlan.features" :key="feature.name" class="feature-item">
                <span class="feature-icon">{{ feature.icon }}</span>
                <div>
                  <strong>{{ feature.name }}</strong>
                  <p>{{ feature.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 価格 -->
          <div class="plan-price-detail">
            <div class="price-box">
              <span class="price-label">月額料金</span>
              <div class="price-value">
                <span v-if="selectedPlan.price" class="price-original">¥{{ selectedPlan.originalPrice?.toLocaleString() }}</span>
                <span class="price-main">{{ selectedPlan.price ? `¥${selectedPlan.price.toLocaleString()}` : 'お問い合わせ' }}</span>
                <span v-if="selectedPlan.price" class="price-period">/月</span>
              </div>
              <p class="price-note" v-if="selectedPlan.price">初月は50%OFF: ¥{{ (selectedPlan.price / 2).toLocaleString() }}</p>
            </div>
          </div>

          <!-- CTA -->
          <div class="plan-modal-cta">
            <button class="btn btn-cta btn-large btn-block" @click="startTrial(selectedPlan.id)">
              🚀 14日間無料で試す
            </button>
            <p class="cta-sub">クレジットカード不要 • いつでも解約可能</p>
          </div>
        </div>
      </div>
    </div>

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
        <h2>まずは無料でお試しください</h2>
        <p>2週間の無料トライアル。クレジットカード不要。</p>

        <!-- 成功メッセージ -->
        <div v-if="submitSuccess" class="form-success">
          <span class="success-icon">✅</span>
          <div>
            <strong>お申し込みありがとうございます！</strong>
            <p>担当者より2営業日以内にご連絡いたします。</p>
          </div>
        </div>

        <!-- フォーム -->
        <div v-else class="cta-form-container">
          <div class="cta-form">
            <input
              v-model="contactCompanyName"
              type="text"
              placeholder="会社名（任意）"
              :disabled="isSubmitting"
              class="form-input"
            />
            <input
              v-model="contactEmail"
              type="email"
              placeholder="メールアドレス *"
              :disabled="isSubmitting"
              class="form-input"
              :class="{ 'input-error': emailError }"
              @blur="validateEmail"
            />
            <span v-if="emailError" class="error-text">{{ emailError }}</span>
            <button
              class="btn btn-cta-pulse btn-large"
              @click="submitContact"
              :disabled="isSubmitting || !!emailError"
            >
              {{ isSubmitting ? '送信中...' : '🚀 無料トライアルを始める' }}
            </button>
          </div>
          <p v-if="submitError" class="form-error">{{ submitError }}</p>
          <p class="cta-note">※ 担当者より2営業日以内にご連絡いたします</p>
        </div>
      </div>
    </section>

    <!-- フローティングCTA -->
    <Transition name="float">
      <button
        v-if="showFloatingCta"
        class="floating-cta"
        @click="scrollToContact"
      >
        🚀 無料トライアル
      </button>
    </Transition>

    <!-- フッター -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-brand">
          <div class="footer-logo">
            <span class="logo-icon">🤖</span>
            <span>ミエルプラス</span>
          </div>
          <p>予定も、在庫も、車両も。現場がぜんぶミエル。</p>
        </div>
        <div class="footer-links">
          <div class="footer-column">
            <h4>サービス</h4>
            <a href="#features">機能一覧</a>
            <a href="#pricing">料金プラン</a>
            <a href="#faq">よくある質問</a>
          </div>
          <div class="footer-column">
            <h4>サポート</h4>
            <a href="#">ヘルプセンター</a>
            <a href="#">お問い合わせ</a>
            <a href="#">導入事例</a>
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
        <p>© 2024 ミエルプラス / 有限会社IYASAKA. All rights reserved.</p>
      </div>
    </footer>

    <!-- AIチャットウィジェット -->
    <AiChatWidget />

    <!-- デバイスログイン用モーダル -->
    <div v-if="showDeviceLogin" class="modal-overlay" @click.self="showDeviceLogin = false">
      <div class="modal-content">
        <h3>サイネージ / ホワイトボード接続</h3>
        <form @submit.prevent="goToDeviceLogin">
          <input 
            v-model="orgSlug" 
            type="text" 
            placeholder="組織ID（管理者に確認）" 
            required
          />
          <button type="submit" class="btn btn-primary">
            接続画面へ
          </button>
        </form>
        <button @click="showDeviceLogin = false" class="close-btn">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const orgSlug = ref('')
const showDeviceLogin = ref(false)
const contactEmail = ref('')
const contactCompanyName = ref('')
const isSubmitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref('')
const emailError = ref('')
const showFloatingCta = ref(false)
const openFaq = ref<number | null>(null)
const showComparison = ref(false)
const selectedPlan = ref<any>(null)
const showAiDemo = ref(false)
const selectedProduct = ref<'board' | 'stock' | 'drive' | 'file' | null>(null)

// スクロール検知
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => {
    showFloatingCta.value = window.scrollY > 500
  })
}

// 製品選択（組み合わせ計算用）
const selectedProducts = ref({
  board: true,
  stock: false,
  drive: false,
  file: false
})
const selectedUserTier = ref<'starter' | 'business' | 'professional' | 'enterprise'>('business')

// ================================================================
// 📌 製品料金マスター（変更禁止 - 2024年確定版）
// ================================================================
// BOARD / STOCK: 同一料金
//   - スターター（〜10名）: ¥9,800/月
//   - ビジネス（〜30名）: ¥19,800/月
//   - プロフェッショナル（〜100名）: ¥39,800/月
//   - エンタープライズ: 要相談
//
// DRIVE: 半額
//   - スターター（〜10名）: ¥4,900/月
//   - ビジネス（〜30名）: ¥9,900/月
//   - プロフェッショナル（〜100名）: ¥19,900/月
//   - エンタープライズ: 要相談
//
// AIクレジット:
//   - スターター: 100回/月
//   - ビジネス: 500回/月
//   - プロフェッショナル: 2,000回/月
//   - エンタープライズ: 無制限
// ================================================================

// 製品詳細データ
const productDetails = {
  board: {
    icon: '📆',
    name: 'ミエルボード',
    tagline: '予定がミエル - 週間スケジュールボード',
    description: '社員の週間予定を一覧表示。事務所のテレビやモニターに常時表示することで、「誰が・どこで・何をしているか」が一目でわかります。',
    features: [
      '社員×曜日のマトリクス表示',
      '現場名・作業内容を一覧表示',
      '部門フィルタ（工事/営業/保守）',
      'サイネージモード対応',
      'Googleカレンダー連携',
      'Outlookカレンダー連携',
      'スマホからも確認可能'
    ],
    useCases: [
      '「◯◯さん今日どこ？」を電話で確認する手間',
      'ホワイトボードの書き換え・消し忘れ',
      '朝礼での予定確認に時間がかかる',
      '外出先から予定が確認できない'
    ],
    plans: [
      { name: 'スターター', users: '〜10名', price: 9800, features: ['サイネージ1台', 'Googleカレンダー連携', 'AI 100回/月', 'メールサポート'] },
      { name: 'ビジネス', users: '〜30名', price: 19800, recommended: true, features: ['サイネージ3台', '全カレンダー連携', '部門管理', 'AI 500回/月', 'チャットサポート'] },
      { name: 'プロフェッショナル', users: '〜100名', price: 39800, features: ['サイネージ無制限', 'API連携', '高度な権限管理', 'AI 2,000回/月', '優先電話サポート'] }
    ]
  },
  stock: {
    icon: '📦',
    name: 'ミエルストック',
    tagline: '在庫がミエル - 資材・在庫管理',
    description: '現場ごとの資材・在庫を一元管理。「何が・どこに・いくつあるか」がリアルタイムでわかり、発注漏れや二重発注を防ぎます。',
    features: [
      '現場別の資材一覧',
      '在庫数のリアルタイム管理',
      '発注アラート（閾値設定）',
      '入出庫履歴の自動記録',
      'バーコード/QRスキャン対応',
      '発注書の自動生成',
      '棚卸しサポート'
    ],
    useCases: [
      '「◯◯現場に資材まだある？」を電話で確認',
      '在庫切れに気づかず現場作業が止まる',
      '同じ資材を二重発注してしまう',
      '月末の棚卸しに丸1日かかる'
    ],
    plans: [
      { name: 'スターター', users: '〜10名', price: 9800, features: ['現場5拠点まで', '在庫アラート', 'AI 100回/月', 'メールサポート'] },
      { name: 'ビジネス', users: '〜30名', price: 19800, recommended: true, features: ['現場20拠点まで', 'バーコード対応', '発注書自動生成', 'AI 500回/月', 'チャットサポート'] },
      { name: 'プロフェッショナル', users: '〜100名', price: 39800, features: ['現場無制限', 'API連携', '棚卸しサポート', 'AI 2,000回/月', '優先電話サポート'] }
    ]
  },
  drive: {
    icon: '🚗',
    name: 'ミエルドライブ',
    tagline: '車両がミエル - 車両・運行管理',
    description: '車両の配車状況、アルコールチェック、運転日報を一元管理。法令遵守とペーパーレス化を同時に実現します。',
    features: [
      '車両配車管理',
      'アルコールチェック記録',
      '運転日報の電子化',
      'GPS位置情報（オプション）',
      '車両点検記録',
      '燃費管理',
      '法令遵守レポート自動生成'
    ],
    useCases: [
      '「今日どの車両が空いてる？」がわからない',
      'アルコールチェック記録が紙でバラバラ',
      '運転日報の記入・回収が手間',
      '監査時の書類準備に時間がかかる'
    ],
    plans: [
      { name: 'スターター', users: '〜10名', price: 4900, features: ['車両5台まで', '配車管理', 'アルコールチェック', 'AI 100回/月'] },
      { name: 'ビジネス', users: '〜30名', price: 9900, recommended: true, features: ['車両15台まで', '運転日報', '車両点検記録', 'AI 500回/月'] },
      { name: 'プロフェッショナル', users: '〜100名', price: 19900, features: ['車両無制限', 'GPS連携', 'API連携', 'AI 2,000回/月'] }
    ]
  },
  file: {
    icon: '📁',
    name: 'ミエルファイル',
    tagline: 'ファイルがミエル - 図面・資料管理',
    description: '図面や現場写真を現場ごとに自動整理。バージョン管理とAI差分検出で「どれが最新？」「何が変わった？」を即座に解決します。',
    features: [
      '現場別ファイル自動整理',
      '自動バージョン管理',
      'AI差分検出（変更箇所を箇条書き）',
      'URL共有（期限付き）',
      'AI検索（自然言語で検索）',
      '写真自動タグ付け',
      'スマホから直接アップロード'
    ],
    useCases: [
      '「あの図面どこ？」でフォルダを探し回る',
      '図面_最終版_v3_修正2.pdf のような命名が乱立',
      '図面のどこが変更されたかわからない',
      '現場写真がスマホ/PC/クラウドに散在'
    ],
    plans: [
      { name: 'スターター', users: '〜10名', price: 9800, features: ['現場5拠点まで', '10GBストレージ', 'AI 100回/月', 'メールサポート'] },
      { name: 'ビジネス', users: '〜30名', price: 19800, recommended: true, features: ['現場20拠点まで', '50GBストレージ', 'AI差分検出', 'AI 500回/月'] },
      { name: 'プロフェッショナル', users: '〜100名', price: 39800, features: ['現場無制限', '200GBストレージ', 'API連携', 'AI 2,000回/月'] }
    ]
  }
}

function selectProduct(product: 'board' | 'stock' | 'drive' | 'file') {
  selectedProduct.value = selectedProduct.value === product ? null : product
}

// ================================================================
// 📌 組み合わせ計算用料金マスター（変更禁止 - 2024年確定版）
// ================================================================
const userTiers = {
  starter: { label: 'スターター（〜10名）', users: 10 },
  business: { label: 'ビジネス（〜30名）', users: 30 },
  professional: { label: 'プロフェッショナル（〜100名）', users: 100 },
  enterprise: { label: 'エンタープライズ（100名以上）', users: 999 }
}

// BOARD / STOCK: 同一料金、DRIVE: 半額
const productPrices = {
  board: { starter: 9800, business: 19800, professional: 39800, enterprise: null },
  stock: { starter: 9800, business: 19800, professional: 39800, enterprise: null },
  drive: { starter: 4900, business: 9900, professional: 19900, enterprise: null },
  file: { starter: 9800, business: 19800, professional: 39800, enterprise: null }
}

const aiCredits = {
  starter: 100,
  business: 500,
  professional: 2000,
  enterprise: '無制限'
}

const calculatedPrice = computed(() => {
  if (selectedUserTier.value === 'enterprise') return null
  
  let total = 0
  let productCount = 0
  
  if (selectedProducts.value.board) {
    total += productPrices.board[selectedUserTier.value] || 0
    productCount++
  }
  if (selectedProducts.value.stock) {
    total += productPrices.stock[selectedUserTier.value] || 0
    productCount++
  }
  if (selectedProducts.value.drive) {
    total += productPrices.drive[selectedUserTier.value] || 0
    productCount++
  }
  if (selectedProducts.value.file) {
    total += productPrices.file[selectedUserTier.value] || 0
    productCount++
  }
  
  // 複数製品割引
  if (productCount >= 3) {
    total = Math.floor(total * 0.8) // 20%OFF
  } else if (productCount >= 2) {
    total = Math.floor(total * 0.9) // 10%OFF
  }
  
  return total
})

const discountRate = computed(() => {
  let count = 0
  if (selectedProducts.value.board) count++
  if (selectedProducts.value.stock) count++
  if (selectedProducts.value.drive) count++
  
  if (count >= 3) return 20
  if (count >= 2) return 10
  return 0
})

// プランデータ
const planData = {
  starter: {
    id: 'starter',
    name: 'スターター',
    target: '個人事業主・小規模チーム（1〜10名）向け',
    price: 9800,
    originalPrice: 9800,
    aiCredits: 100,
    pains: [
      'ホワイトボードの書き換えが面倒',
      '外出先から予定が確認できない',
      '「◯◯さん今どこ？」を毎回電話で確認'
    ],
    solutions: [
      '週間予定がデジタル化、書き換え不要に',
      'スマホからいつでも確認可能',
      'AIに聞けば3秒で回答、電話不要'
    ],
    features: [
      { icon: '👥', name: 'ユーザー10名まで', description: '小規模チームに最適な人数' },
      { icon: '📅', name: 'ミエルボード', description: '週間スケジュールボード' },
      { icon: '📺', name: 'サイネージ1台', description: '事務所のTVに常時表示' },
      { icon: '🔗', name: 'Googleカレンダー連携', description: '既存の予定を自動反映' },
      { icon: '🤖', name: 'AIコンシェルジュ 100回/月', description: '自然言語で現場情報を検索' },
      { icon: '📧', name: 'メールサポート', description: '24時間以内に返信' }
    ]
  },
  business: {
    id: 'business',
    name: 'ビジネス',
    target: '成長中の中小企業（10〜30名）向け',
    price: 19800,
    originalPrice: 19800,
    aiCredits: 500,
    pains: [
      '部門ごとの予定管理が煩雑',
      '複数拠点での情報共有が難しい',
      '「工事部は今日どこ？」を何度も聞かれる'
    ],
    solutions: [
      '部門フィルタで必要な情報だけ表示',
      '複数サイネージで全拠点に情報共有',
      'AIが部門全体の予定を即座に回答'
    ],
    features: [
      { icon: '👥', name: 'ユーザー30名まで', description: '中規模チームに対応' },
      { icon: '📅', name: 'ミエルボード', description: '週間スケジュールボード' },
      { icon: '📺', name: 'サイネージ3台', description: '複数拠点に対応' },
      { icon: '🔗', name: '全カレンダー連携', description: 'Google + Outlook対応' },
      { icon: '🏢', name: '部門管理', description: '工事/営業/保守などで分類' },
      { icon: '🤖', name: 'AIコンシェルジュ 500回/月', description: '部門横断で情報検索' },
      { icon: '💬', name: 'チャットサポート', description: 'リアルタイムで回答' }
    ]
  },
  professional: {
    id: 'professional',
    name: 'プロフェッショナル',
    badge: '🏆 人気No.1',
    target: '本格導入を目指す企業（30〜100名）向け',
    price: 39800,
    originalPrice: 39800,
    aiCredits: 2000,
    pains: [
      '現場・車両・在庫がバラバラで把握できない',
      'レポート作成に毎週何時間もかかる',
      '情報を探すだけで1日が終わる'
    ],
    solutions: [
      '人・モノ・車を一画面で完全見える化',
      'AIが週次レポートを自動生成',
      '「◯◯について教えて」で即座に回答'
    ],
    features: [
      { icon: '👥', name: 'ユーザー100名まで', description: '大規模チームに対応' },
      { icon: '⭐', name: '全機能利用可能', description: 'BOARD + STOCK + DRIVE' },
      { icon: '📺', name: 'サイネージ無制限', description: '全拠点に展開可能' },
      { icon: '🤖', name: 'AIコンシェルジュ 2,000回/月', description: 'レポート自動生成も可能' },
      { icon: '🔌', name: 'API連携', description: '外部システムと連携' },
      { icon: '🔐', name: '高度な権限管理', description: '役職別アクセス制御' },
      { icon: '📞', name: '優先電話サポート', description: '専用窓口で即対応' },
      { icon: '🎓', name: '導入コンサルティング', description: '最適な運用を提案' }
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'エンタープライズ',
    target: '大規模組織・特殊要件がある企業向け',
    price: null,
    aiCredits: '無制限',
    pains: [
      '全社の現場情報を瞬時に把握したい',
      '経営判断のためのデータが散らばっている',
      'AIを使い倒して業務を革新したい'
    ],
    solutions: [
      '全拠点の人・モノ・車を一元管理',
      'AIが経営ダッシュボードを自動生成',
      'AI無制限で全社員が恩恵を受ける'
    ],
    features: [
      { icon: '♾️', name: 'ユーザー無制限', description: '組織全体で利用可能' },
      { icon: '⭐', name: '全機能 + カスタム', description: '独自機能を開発' },
      { icon: '🤖', name: 'AIコンシェルジュ無制限', description: '全社員が使い放題' },
      { icon: '🏠', name: 'オンプレミス対応', description: '自社サーバーに構築' },
      { icon: '📜', name: 'SLA保証', description: '稼働率99.9%保証' },
      { icon: '👤', name: '専任カスタマーサクセス', description: '担当者が伴走' },
      { icon: '🔒', name: 'セキュリティ監査対応', description: 'SOC2等に対応' }
    ]
  }
}

function openPlanModal(planId: string) {
  selectedPlan.value = planData[planId as keyof typeof planData]
}

function startTrial(planId: string) {
  selectedPlan.value = null
  scrollToContact()
}

const faqItems = [
  {
    question: '導入にどのくらい時間がかかりますか？',
    answer: 'アカウント作成から利用開始まで最短5分です。Googleカレンダーとの連携設定を含めても30分程度で完了します。'
  },
  {
    question: 'サイネージ用の専用機器は必要ですか？',
    answer: 'いいえ、必要ありません。お手持ちのテレビやモニターにブラウザを表示できる機器（Fire TV Stick、Chromecast等）があれば利用可能です。'
  },
  {
    question: 'データのセキュリティは大丈夫ですか？',
    answer: 'はい。すべての通信はSSL暗号化され、データは国内のセキュアなサーバーで管理されています。組織ごとに完全に分離されたマルチテナント構成です。'
  },
  {
    question: '既存のカレンダーと連携できますか？',
    answer: 'はい。Googleカレンダー、Outlookカレンダーとの連携に対応しています。既存の予定を自動的に週間ボードに反映できます。'
  },
  {
    question: '無料トライアル後の自動課金はありますか？',
    answer: 'いいえ、ありません。無料トライアル期間終了後、ご契約の意思確認をさせていただきます。クレジットカードの事前登録も不要です。'
  }
]

function goToDeviceLogin() {
  if (orgSlug.value) {
    router.push(`/org/${orgSlug.value}/device-login`)
  }
}

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToContact() {
  // TODO: IYASAKA公式サイト構築後、以下に変更
  // window.location.href = 'https://iyasaka.co.jp/contact?p_id=miel-plus'
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
}

function toggleFaq(index: number) {
  openFaq.value = openFaq.value === index ? null : index
}

function validateEmail() {
  if (!contactEmail.value) {
    emailError.value = ''
    return
  }
  const emailRegex = /^\S+@\S+\.\S+$/
  if (!emailRegex.test(contactEmail.value)) {
    emailError.value = '有効なメールアドレスを入力してください'
  } else {
    emailError.value = ''
  }
}

async function submitContact() {
  validateEmail()
  if (!contactEmail.value || emailError.value) return

  isSubmitting.value = true
  submitError.value = ''

  try {
    const { data, error } = await useFetch('/api/contact', {
      method: 'POST',
      body: {
        email: contactEmail.value,
        companyName: contactCompanyName.value || undefined
      }
    })

    if (error.value) {
      submitError.value = error.value.statusMessage || '送信に失敗しました。時間をおいて再度お試しください。'
      return
    }

    // 成功
    submitSuccess.value = true
    contactEmail.value = ''
    contactCompanyName.value = ''

  } catch (e) {
    submitError.value = '予期せぬエラーが発生しました'
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}

useHead({
  title: 'ミエルプラス | 予定も、在庫も、車両も。現場がぜんぶミエル。',
  meta: [
    { name: 'description', content: '現場の「見えない」をAIで解決。予定・在庫・車両・ファイルをまとめて見える化。ミエルボード・ミエルストック・ミエルドライブ・ミエルファイルで現場業務を効率化。' }
  ]
})
</script>

<style scoped>
/* ベース */
.landing {
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
  line-height: 1.7;
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

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  font-size: 1.25rem;
}

.logo-icon {
  font-size: 1.5rem;
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
  background: #1a1a2e;
  color: white !important;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
}

/* ヒーローセクション */
.hero {
  padding: 8rem 2rem 4rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4f8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rem;
  min-height: 90vh;
}

.hero-content {
  max-width: 500px;
}

.hero-badge {
  display: inline-block;
  background: #e8f4f8;
  color: #0066cc;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.hero h1 {
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.3;
  margin-bottom: 1.5rem;
}

.highlight {
  color: #0066cc;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #666;
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
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.btn-primary {
  background: #0066cc;
  color: white;
  border: none;
}

.btn-primary:hover {
  background: #0052a3;
  transform: translateY(-2px);
}

/* CTAボタン - オレンジ（行動促進色） */
.btn-cta {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
  position: relative;
  overflow: hidden;
}

.btn-cta::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.btn-cta:hover::before {
  left: 100%;
}

.btn-cta:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
}

.btn-text {
  background: none;
  border: none;
  color: #0066cc;
  cursor: pointer;
  font-size: 0.9rem;
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

.hero-urgency {
  margin-top: 1.5rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-radius: 8px;
  font-size: 0.9rem;
  color: #e65100;
  border-left: 4px solid #ff6b35;
}

.hero-urgency .countdown {
  display: inline-block;
  background: #ff6b35;
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.hero-visual {
  flex-shrink: 0;
}

.mockup-screen {
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  width: 500px;
}

.mockup-header {
  background: #2d2d44;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot.red { background: #ff5f57; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

.mockup-title {
  color: #888;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.mockup-content {
  padding: 1rem;
}

.mini-schedule {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
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

/* セクション共通 */
.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.section-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 3rem;
}

/* 課題セクション */
.problems {
  padding: 5rem 2rem;
  background: white;
}

.problem-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.problem-card {
  padding: 2rem;
  border-radius: 12px;
  background: #f8f9fa;
  text-align: center;
}

.problem-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.problem-card h3 {
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.problem-card p {
  color: #666;
  font-size: 0.9rem;
}

/* ソリューションセクション */
.solution {
  padding: 5rem 2rem;
  background: #1a1a2e;
  color: white;
}

.solution-content {
  display: flex;
  align-items: center;
  gap: 4rem;
}

.solution-text h2 {
  font-size: 2rem;
  margin-bottom: 1.5rem;
}

.solution-text p {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
}

.solution-list {
  list-style: none;
  padding: 0;
}

.solution-list li {
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
}

.tv-mockup {
  text-align: center;
}

.tv-screen {
  background: #2d2d44;
  padding: 3rem 4rem;
  border-radius: 8px;
  font-size: 1.5rem;
  border: 4px solid #444;
}

.tv-stand {
  width: 60px;
  height: 30px;
  background: #444;
  margin: 0 auto;
  border-radius: 0 0 8px 8px;
}

/* ビジョンセクション */
.vision {
  padding: 5rem 2rem;
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
}

/* ナラティブセクション */
.narrative-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.narrative-label {
  display: inline-block;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 1.5rem;
  border-radius: 25px;
  margin-bottom: 1.5rem;
  letter-spacing: 0.05em;
}

.narrative-content {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.narrative-pain,
.narrative-solution {
  flex: 1;
  padding: 1.5rem;
  border-radius: 16px;
  text-align: left;
}

.narrative-pain {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
  border: 2px solid #ffcccc;
}

.narrative-solution {
  background: linear-gradient(135deg, #f0fff4 0%, #e0ffe8 100%);
  border: 2px solid #b8f0c8;
}

.narrative-pain h3,
.narrative-solution h3 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.narrative-pain ul,
.narrative-solution ul {
  list-style: none;
  padding: 0;
  margin-bottom: 0.75rem;
}

.narrative-pain li,
.narrative-solution li {
  font-size: 0.9rem;
  padding: 0.3rem 0;
  color: #555;
}

.narrative-summary {
  font-size: 0.85rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(0,0,0,0.1);
}

.narrative-arrow {
  display: flex;
  align-items: center;
  font-size: 2rem;
  color: #0066cc;
  font-weight: bold;
}

/* 製品セクションラベル */
.products-section {
  text-align: center;
  margin-bottom: 1rem;
}

.products-label {
  display: inline-block;
  background: #f0f4ff;
  color: #0066cc;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  border: 1px solid #d0e0ff;
}

.product-suite {
  margin-bottom: 4rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border: 2px solid #e0e8ff;
  border-radius: 24px;
  padding: 2rem;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 102, 204, 0.08);
}

.product-suite::before {
  content: 'ミエルプラス';
  position: absolute;
  top: -14px;
  left: 24px;
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.product-cards-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 0;
}

.product-card {
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  text-align: center;
  border: 2px solid #dde5f5;
  transition: all 0.3s;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  border-color: #c0d0f0;
}

.product-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.product-card-link .product-card {
  cursor: pointer;
}

.coming-soon-card {
  opacity: 0.7;
  cursor: default;
}

.coming-soon-card:hover {
  transform: none;
}

.product-card-cta {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s;
}

.product-card-link:hover .product-card-cta {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
}

.product-card-cta.disabled {
  background: #ccc;
  color: #888;
}

.product-card-cta.board-cta {
  background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
}

.product-card-link:hover .product-card-cta.board-cta {
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
}

.product-card.active {
  border-color: #0066cc;
  box-shadow: 0 4px 20px rgba(0, 102, 204, 0.2);
}

/* 製品別テーマカラー */
.product-card.board-theme {
  border-left: 4px solid #2e7d32;
}

.product-card.board-theme:hover,
.product-card.board-theme.active {
  border-color: #2e7d32;
  box-shadow: 0 4px 20px rgba(46, 125, 50, 0.2);
}

.product-card.stock-theme {
  border-left: 4px solid #e65100;
}

.product-card.stock-theme:hover {
  border-color: #e65100;
  box-shadow: 0 4px 20px rgba(230, 81, 0, 0.2);
}

.product-card.drive-theme {
  border-left: 4px solid #c62828;
}

.product-card.drive-theme:hover {
  border-color: #c62828;
  box-shadow: 0 4px 20px rgba(198, 40, 40, 0.2);
}

.product-card.file-theme {
  border-left: 4px solid #F97316;
}

.product-card.file-theme:hover {
  border-color: #F97316;
  box-shadow: 0 4px 20px rgba(249, 115, 22, 0.2);
}

/* AI土台スタイル */
.product-ai-foundation {
  position: relative;
  margin-top: 0;
}

.ai-foundation-connector {
  position: relative;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.connector-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, transparent, #9c27b0);
}

.connector-dots {
  display: flex;
  gap: 0;
  justify-content: space-between;
  width: 80%;
  position: relative;
}

.connector-dots::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #9c27b0, #7b1fa2, #9c27b0);
}

.connector-dots span {
  width: 12px;
  height: 12px;
  background: #9c27b0;
  border-radius: 50%;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 10px rgba(156, 39, 176, 0.5);
}

.ai-foundation-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  border: 2px solid #9c27b0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(156, 39, 176, 0.3);
}

.ai-foundation-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ai-foundation-icon {
  font-size: 3rem;
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-foundation-info {
  color: white;
}

.ai-foundation-badge {
  display: inline-block;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  margin-bottom: 0.5rem;
}

.ai-foundation-info h3 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.ai-foundation-info .beta-tag {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.ai-foundation-info p {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.ai-foundation-features {
  display: flex;
  gap: 1.5rem;
}

.ai-feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: white;
  font-size: 0.85rem;
}

.ai-feature .feature-icon {
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-foundation-credits {
  text-align: center;
  color: white;
}

.ai-foundation-credits .credit-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
}

.ai-foundation-credits .credit-plans {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ai-foundation-credits .credit-plan {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.ai-foundation-credits .credit-plan.highlight {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  font-weight: 600;
}

/* AI展開コンテンツメイン */
.ai-foundation-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 1.5rem 2rem;
}

/* 横長アコーディオントリガー（分離デザイン） */
.ai-expand-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  margin-top: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
}

.ai-expand-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
}

.ai-expand-trigger.is-expanded {
  border-radius: 12px 12px 0 0;
  margin-bottom: 0;
}

.ai-expand-trigger .trigger-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ai-expand-trigger .trigger-icon {
  font-size: 1.25rem;
}

.ai-expand-trigger .trigger-text {
  color: white;
  font-size: 1rem;
  font-weight: 700;
}

.ai-expand-trigger .trigger-arrow {
  color: white;
  font-size: 0.875rem;
  transition: transform 0.3s;
}

.ai-expand-trigger .trigger-arrow.rotated {
  transform: rotate(180deg);
}

/* アコーディオン展開部分 */
.ai-demo-accordion {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out;
  background: white;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.ai-demo-accordion.is-open {
  max-height: 400px;
  border: 2px solid #ff6b35;
  border-top: none;
}

.ai-demo-inner {
  padding: 1.5rem;
  background: #fafafa;
}

.ai-demo-accordion .ai-chat-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.ai-demo-accordion .chat-message {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.ai-demo-accordion .chat-message .avatar {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.ai-demo-accordion .chat-message .bubble {
  background: white;
  color: #333;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  line-height: 1.5;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.ai-demo-accordion .chat-message.user .bubble {
  background: #0066cc;
  color: white;
  border: none;
}

.ai-demo-accordion .chat-message.ai .bubble {
  background: #f0f4ff;
  border-color: #d0e0ff;
}

/* クレジットコンパクト表示 */
.ai-credits-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #e0e0e0;
  font-size: 0.85rem;
  color: #666;
}

.ai-credits-compact .credits {
  color: #333;
}

.ai-credits-compact strong {
  color: #ff6b35;
  font-size: 1rem;
}


@media (max-width: 900px) {
  .narrative-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .narrative-arrow {
    transform: rotate(90deg);
    justify-content: center;
  }
  
  .product-suite {
    padding: 1.5rem;
    padding-top: 2rem;
  }
  
  .product-suite::before {
    font-size: 0.75rem;
    left: 16px;
    top: -12px;
  }
  
  .product-cards-row {
    grid-template-columns: 1fr;
  }
  
  .ai-foundation-main {
    flex-direction: column;
    text-align: center;
    padding: 1.25rem;
  }
  
  .ai-foundation-left {
    flex-direction: column;
  }
  
  .ai-foundation-features {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .connector-dots {
    width: 40%;
  }
  
  .ai-foundation-icon {
    width: 50px;
    height: 50px;
    font-size: 2rem;
  }
  
  .ai-foundation-info h3 {
    font-size: 1.2rem;
  }
  
  .ai-demo-accordion .ai-chat-demo {
    grid-template-columns: 1fr;
  }
  
  .ai-expand-trigger .trigger-text {
    font-size: 0.9rem;
  }
}

.product-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.product-status {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.65rem;
  margin-bottom: 0.5rem;
}

.product-status.available {
  background: #e8f5e9;
  color: #2e7d32;
}

.product-status.coming {
  background: #fff3e0;
  color: #e65100;
}

.product-status.beta {
  background: #f3e5f5;
  color: #7b1fa2;
}

.product-card h3 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.product-card > p {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.75rem;
}

.product-card ul {
  list-style: none;
  padding: 0;
  text-align: left;
}

.product-card li {
  font-size: 0.75rem;
  color: #888;
  padding: 0.2rem 0;
  padding-left: 1rem;
  position: relative;
}

.product-card li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #0066cc;
}

/* AIデモ */
.ai-demo {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  border-radius: 20px;
  padding: 2rem;
  color: white;
}

.ai-demo-header {
  text-align: center;
  margin-bottom: 2rem;
}

.ai-badge {
  display: inline-block;
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  padding: 0.35rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}

.ai-demo-header h3 {
  font-size: 1.5rem;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.ai-pain-solution {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.ai-pain-solution .pain {
  color: rgba(255, 255, 255, 0.7);
}

.ai-pain-solution .arrow {
  color: #4caf50;
  font-size: 1.25rem;
}

.ai-pain-solution .solution {
  color: #4caf50;
  font-weight: 600;
}

.ai-chat-demo {
  max-width: 500px;
  margin: 0 auto;
}

.chat-message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  align-items: flex-start;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.chat-message .avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 1rem;
}

.chat-message .bubble {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  max-width: 80%;
  line-height: 1.5;
}

.chat-message.user .bubble {
  background: #0066cc;
}

.chat-message.ai .bubble {
  background: rgba(255, 255, 255, 0.15);
}

.chat-typing {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}

/* AIクレジット情報 */
.ai-credits-info {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  text-align: center;
}

.ai-credits-info h4 {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.credits-grid {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.credit-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  text-align: center;
  min-width: 120px;
}

.credit-item.highlight {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
}

.credit-plan {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.credit-amount {
  font-size: 1.1rem;
  font-weight: 700;
}

.credit-amount small {
  font-size: 0.7rem;
  opacity: 0.7;
}

.credits-note {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 1rem;
}

/* 機能セクション */
.features {
  padding: 5rem 2rem;
  background: #f8f9fa;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: relative;
}

.feature-card.main,
.feature-card.active {
  border: 2px solid #0066cc;
  box-shadow: 0 8px 25px rgba(0, 102, 204, 0.2);
}

.feature-card {
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  text-align: left;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: #0066cc;
}

.feature-card .feature-status {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.feature-card .feature-icon {
  margin-bottom: 0.5rem;
}

.feature-card h3 {
  font-size: 1.3rem;
  margin-bottom: 0.25rem;
}

.feature-tagline {
  color: #0066cc;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.feature-problems {
  margin-bottom: 1.5rem;
}

.problem-item {
  font-size: 0.85rem;
  color: #555;
  padding: 0.4rem 0;
  border-bottom: 1px dashed #e0e0e0;
}

.problem-item:last-child {
  border-bottom: none;
}

.feature-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8f4f8 100%);
  border-radius: 8px;
  color: #0066cc;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.feature-card:hover .feature-cta {
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
}

.cta-arrow {
  font-size: 1.25rem;
  transition: transform 0.3s;
}

.feature-card:hover .cta-arrow {
  transform: translateX(5px);
}

.feature-cta-link {
  text-decoration: none;
  display: block;
}

.feature-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #e8f4f8;
  color: #0066cc;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.feature-card > p {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.feature-card ul {
  list-style: none;
  padding: 0;
  margin-bottom: 1rem;
}

.feature-card li {
  font-size: 0.85rem;
  color: #666;
  padding: 0.25rem 0;
}

.feature-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.feature-status.available {
  background: #d4edda;
  color: #155724;
}

.feature-status.coming {
  background: #f8f9fa;
  color: #666;
}

/* 製品詳細パネル */
.product-detail-panel {
  margin-top: 2rem;
  background: white;
  border-radius: 16px;
  border: 2px solid #0066cc;
  overflow: hidden;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.product-detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f4f8 100%);
  border-bottom: 1px solid #e0e0e0;
}

.product-detail-icon {
  font-size: 3rem;
}

.product-detail-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.product-detail-tagline {
  color: #666;
  font-size: 0.9rem;
}

.close-detail {
  margin-left: auto;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
}

.product-detail-body {
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.product-detail-description,
.product-detail-use-cases {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
}

.product-detail-description h4,
.product-detail-use-cases h4,
.product-detail-pricing h4 {
  margin-bottom: 1rem;
  font-size: 1rem;
}

.product-detail-description p {
  color: #555;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.product-detail-description ul,
.product-detail-use-cases ul {
  list-style: none;
  padding: 0;
}

.product-detail-description li {
  padding: 0.4rem 0;
  padding-left: 1.5rem;
  position: relative;
  font-size: 0.9rem;
  color: #333;
}

.product-detail-description li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #0066cc;
}

.product-detail-use-cases li {
  padding: 0.4rem 0;
  padding-left: 1.5rem;
  position: relative;
  font-size: 0.9rem;
  color: #555;
}

.product-detail-use-cases li::before {
  content: '❌';
  position: absolute;
  left: 0;
}

.product-detail-pricing {
  grid-column: 1 / -1;
}

.single-product-pricing {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.single-plan-card {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.single-plan-card.recommended {
  border-color: #ff6b35;
  background: #fff8f5;
}

.single-plan-card .plan-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.single-plan-card .plan-name {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.single-plan-card .plan-users {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.single-plan-card .plan-price {
  margin-bottom: 1rem;
}

.single-plan-card .price-amount {
  font-size: 1.75rem;
  font-weight: 800;
}

.single-plan-card .price-period {
  color: #666;
  font-size: 0.85rem;
}

.single-plan-card .plan-features {
  list-style: none;
  padding: 0;
  text-align: left;
}

.single-plan-card .plan-features li {
  padding: 0.3rem 0;
  font-size: 0.8rem;
  color: #555;
  padding-left: 1rem;
  position: relative;
}

.single-plan-card .plan-features li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #0066cc;
}

.pricing-note {
  text-align: center;
  color: #666;
  font-size: 0.85rem;
  margin-top: 1.5rem;
}

@media (max-width: 900px) {
  .product-detail-body {
    grid-template-columns: 1fr;
  }
  
  .single-product-pricing {
    grid-template-columns: 1fr;
  }
}

/* 導入効果 */
.benefits {
  padding: 5rem 2rem;
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
}

.benefit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;
  text-align: center;
}

.benefit-number {
  font-size: 4rem;
  font-weight: 800;
}

.benefit-number span {
  font-size: 1.5rem;
}

.benefit-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

/* 社会的証明 */
.social-proof {
  padding: 3rem 2rem;
  background: #f8f9fa;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.proof-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3rem;
}

.proof-item {
  text-align: center;
}

.proof-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1a1a2e;
}

.proof-number span {
  font-size: 1.25rem;
  color: #0066cc;
}

.proof-label {
  font-size: 0.85rem;
  color: #666;
}

.proof-divider {
  width: 1px;
  height: 40px;
  background: #ddd;
}

/* 料金セクション */
.pricing {
  padding: 5rem 2rem;
  background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
}

/* 組み合わせ計算機 */
.pricing-calculator {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
}

.calc-step {
  margin-bottom: 2rem;
}

.calc-step-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.step-number {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.calc-step-header h3 {
  font-size: 1.1rem;
  margin: 0;
}

.product-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.product-checkbox {
  position: relative;
  cursor: pointer;
}

.product-checkbox input {
  position: absolute;
  opacity: 0;
}

.product-checkbox-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s;
  position: relative;
}

/* 未選択時のホバー：軽いハイライトのみ */
.product-checkbox:not(.selected):hover .product-checkbox-content {
  border-color: #aaa;
  background: #f0f0f0;
}

/* 選択時：明確な視覚フィードバック */
.product-checkbox.selected .product-checkbox-content {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #0066cc;
  border-width: 3px;
  box-shadow: 0 4px 20px rgba(0, 102, 204, 0.3);
}

/* 選択時のチェックマーク */
.product-checkbox.selected .product-checkbox-content::before {
  content: '✓';
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.4);
}

/* 選択時のホバー：選択状態を維持しつつ軽い効果 */
.product-checkbox.selected:hover .product-checkbox-content {
  box-shadow: 0 6px 25px rgba(0, 102, 204, 0.4);
}

.product-checkbox-icon {
  font-size: 2rem;
}

.product-checkbox-info {
  flex: 1;
}

.product-checkbox-info strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.product-checkbox-info span {
  font-size: 0.8rem;
  color: #666;
}

.product-checkbox-status {
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.65rem;
}

.product-checkbox-status.available {
  background: #e8f5e9;
  color: #2e7d32;
}

.product-checkbox-status.coming {
  background: #fff3e0;
  color: #e65100;
}

.tier-selector {
  display: flex;
  gap: 1rem;
}

.tier-btn {
  flex: 1;
  padding: 1rem;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.tier-btn.active {
  background: #0066cc;
  border-color: #0066cc;
  color: white;
}

.tier-btn:hover:not(.active) {
  border-color: #0066cc;
}

.tier-label {
  font-weight: 600;
}

/* 計算結果 */
.calc-result {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  border-radius: 16px;
  overflow: hidden;
  color: white;
}

.result-header {
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
}

.result-header h3 {
  margin: 0;
  font-size: 1rem;
}

.result-body {
  padding: 1.5rem;
}

.result-products {
  margin-bottom: 1rem;
}

.result-product {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-product:last-child {
  border-bottom: none;
}

.result-product.ai-included {
  opacity: 0.8;
}

.result-product .product-name {
  font-size: 0.9rem;
}

.result-product .product-price {
  font-size: 0.9rem;
}

.result-product .product-price.included {
  color: #4caf50;
}

.result-discount {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.discount-badge {
  font-weight: 700;
}

.discount-reason {
  font-size: 0.8rem;
  opacity: 0.9;
}

.result-total {
  padding: 1rem 0;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 1rem;
}

.total-label {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
}

.total-price .price-main {
  font-size: 2.5rem;
  font-weight: 800;
}

.total-price .price-period {
  font-size: 0.9rem;
  opacity: 0.7;
}

.result-note {
  text-align: center;
  padding: 2rem;
  opacity: 0.7;
}

.result-actions {
  text-align: center;
}

.action-note {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-top: 0.75rem;
}

/* エンタープライズバナー */
.enterprise-banner {
  margin-top: 2rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e8e8e8 100%);
  border-radius: 16px;
  padding: 2rem;
}

.enterprise-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.enterprise-text h3 {
  margin-bottom: 0.5rem;
}

.enterprise-text p {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

@media (max-width: 900px) {
  .product-selector {
    grid-template-columns: 1fr;
  }
  
  .tier-selector {
    flex-wrap: wrap;
  }
  
  .tier-btn {
    flex: 1 1 45%;
  }
  
  .enterprise-content {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
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
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;
}

.pricing-card {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 16px;
  text-align: center;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.pricing-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-color: #0066cc;
}

.pricing-card.featured {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  color: white;
  transform: scale(1.02);
  border: 2px solid #ff6b35;
}

.pricing-card.featured:hover {
  transform: scale(1.02) translateY(-5px);
}

.pricing-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  padding: 0.35rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(255, 107, 53, 0.3);
}

.pricing-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.pricing-target {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 1rem;
}

.pricing-card.featured .pricing-target {
  color: rgba(255, 255, 255, 0.7);
}

.pricing-price {
  margin-bottom: 1rem;
}

.price-original {
  display: block;
  font-size: 0.85rem;
  color: #999;
  text-decoration: line-through;
  margin-bottom: 0.25rem;
}

.price-current {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.1rem;
}

.pricing-price .currency {
  font-size: 1rem;
}

.pricing-price .amount {
  font-size: 2rem;
  font-weight: 800;
}

.pricing-price .period {
  font-size: 0.8rem;
  opacity: 0.7;
}

.price-note {
  font-size: 0.7rem;
  color: #ff6b35;
  margin-top: 0.25rem;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin-bottom: 1.5rem;
  text-align: left;
  min-height: 180px;
}

.pricing-features li {
  padding: 0.35rem 0;
  font-size: 0.8rem;
}

.pricing-guarantee {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
}

.pricing-card.featured .btn-outline {
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

/* 比較表 */
.comparison-toggle {
  text-align: center;
  margin-top: 2rem;
}

.comparison-table-wrapper {
  margin-top: 2rem;
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.comparison-table th,
.comparison-table td {
  padding: 0.75rem;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.comparison-table th.highlight,
.comparison-table td.highlight {
  background: #fff8f0;
}

.comparison-table .ai-row td {
  background: #f3e5f5;
}

.comparison-table .ai-row td.highlight {
  background: #e1bee7;
}

.comparison-table .price-row td {
  font-weight: 700;
  background: #f8f9fa;
}

/* プランモーダル */
.plan-modal {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  z-index: 10;
}

.plan-modal-header {
  padding: 2rem;
  text-align: center;
  color: white;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  border-radius: 20px 20px 0 0;
}

.plan-modal-header.professional {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
}

.plan-modal-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.plan-modal-header h2 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.plan-modal-target {
  opacity: 0.8;
  font-size: 0.9rem;
}

.plan-modal-body {
  padding: 2rem;
}

.plan-pain-solution {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: stretch;
}

.pain-section,
.solution-section {
  flex: 1;
  padding: 1.25rem;
  border-radius: 12px;
}

.pain-section {
  background: #fff5f5;
  border-left: 4px solid #e53935;
}

.solution-section {
  background: #f1f8e9;
  border-left: 4px solid #43a047;
}

.pain-section h3,
.solution-section h3 {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
}

.pain-section ul,
.solution-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pain-section li,
.solution-section li {
  font-size: 0.85rem;
  padding: 0.35rem 0;
  color: #555;
}

.solution-arrow {
  display: flex;
  align-items: center;
  font-size: 1.5rem;
  color: #ccc;
}

.plan-features-detail {
  margin-bottom: 2rem;
}

.plan-features-detail h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.feature-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.feature-item .feature-icon {
  font-size: 1.5rem;
}

.feature-item strong {
  display: block;
  font-size: 0.9rem;
}

.feature-item p {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
}

.plan-price-detail {
  text-align: center;
  margin-bottom: 1.5rem;
}

.price-box {
  display: inline-block;
  padding: 1.5rem 3rem;
  background: #f8f9fa;
  border-radius: 12px;
}

.price-label {
  font-size: 0.8rem;
  color: #666;
}

.price-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
}

.price-value .price-original {
  font-size: 1rem;
  margin-right: 0.5rem;
}

.price-value .price-main {
  font-size: 2.5rem;
  font-weight: 800;
}

.price-value .price-period {
  font-size: 1rem;
  color: #666;
}

.price-box .price-note {
  margin-top: 0.5rem;
}

.plan-modal-cta {
  text-align: center;
}

.plan-modal-cta .cta-sub {
  font-size: 0.8rem;
  color: #888;
  margin-top: 0.75rem;
}

/* FAQ */
.faq {
  padding: 5rem 2rem;
  background: #f8f9fa;
}

.faq-list {
  max-width: 700px;
  margin: 3rem auto 0;
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
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  text-align: center;
}

.cta h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.cta > .section-container > p {
  opacity: 0.8;
  margin-bottom: 2rem;
}

.cta-form-container {
  max-width: 500px;
  margin: 0 auto;
}

.cta-form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.75rem;
}

.cta-form .form-input {
  padding: 1rem;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.cta-form .form-input:focus {
  outline: none;
  border-color: #667eea;
}

.cta-form .form-input.input-error {
  border-color: #ff6b6b;
}

.error-text {
  color: #ff6b6b;
  font-size: 0.85rem;
  text-align: left;
  margin-top: -0.5rem;
}

.form-error {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.form-success {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: rgba(72, 187, 120, 0.1);
  border: 2px solid #48bb78;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: left;
  max-width: 500px;
  margin: 0 auto;
}

.form-success .success-icon {
  font-size: 2rem;
}

.form-success strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #48bb78;
}

.form-success p {
  opacity: 0.9;
  margin: 0;
}

/* パルスアニメーション付きCTAボタン */
.btn-cta-pulse {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: pulse 2s infinite;
}

.btn-cta-pulse:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-cta-pulse:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  animation: none;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 0 0 15px rgba(102, 126, 234, 0);
  }
}

/* フローティングCTA */
.floating-cta {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  z-index: 90;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: pulse 2s infinite;
}

.floating-cta:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
}

/* フローティングCTAトランジション */
.float-enter-active,
.float-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.float-enter-from,
.float-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.cta-note {
  margin-top: 1rem;
  font-size: 0.85rem;
  opacity: 0.6;
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

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  position: relative;
  color: white;
}

.modal-content h3 {
  margin-bottom: 1.5rem;
  text-align: center;
}

.modal-content form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-content input {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-content input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2rem;
  cursor: pointer;
}

/* レスポンシブ */
@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding-top: 6rem;
  }
  
  .hero-visual {
    display: none;
  }
  
  .hero-cta {
    justify-content: center;
  }
  
  .hero-trust {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .hero-urgency {
    text-align: center;
  }
  
  .proof-stats {
    flex-wrap: wrap;
    gap: 2rem;
  }
  
  .proof-divider {
    display: none;
  }
  
  .solution-content {
    flex-direction: column;
    text-align: center;
  }
  
  .product-suite,
  .feature-grid,
  .pricing-grid,
  .benefit-grid {
    grid-template-columns: 1fr;
  }
  
  .product-suite {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .pricing-card.featured {
    transform: none;
  }
  
  .plan-pain-solution {
    flex-direction: column;
  }
  
  .solution-arrow {
    transform: rotate(90deg);
    justify-content: center;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
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
  
  .nav-links a:not(.nav-login) {
    display: none;
  }
}
</style>

# 交流会の名札に「話題」を足すアプリ 仕様書

Oct 9, 2026 · @しーたけ

## この仕様書の使い方

**この仕様書だけで、Next.jsのWebアプリを実装し、モック（偽のおいとま）で最後まで動かせるようにする。生成と印刷は学内ネットワークかOU-VPNにつないだPCで動かし、Vercelには公開トップだけを置く。** 実装はOpenCode上のAIエージェント（Muse Spark 1.3）が行い、キーの設定・実データの扱い・公開作業は人が行う。

### 2026-10-11の運用・レビュー修正

ユーザーの追加指示により、以下は本文の古い記述に優先する。追加機能は [SPEC-ADD-1.md](SPEC-ADD-1.md)、詳しい判断は [DECISIONS.md](DECISIONS.md) を参照する。

- 管理画面と生成APIも、ngrokで認証と許可メール一覧を付けて外部利用できる。[NGROK.md](NGROK.md) の手順に従う。API通信はngrokを経由する。Vercelの公開トップのみの構成は維持する。
- 同時生成は1つのNode.jsプロセス全体で3件、待機は最大60件・120秒とする。各ブラウザのデータは独立し、共有編集はしない。中止はfetch・待機キューへ伝え、旧実行は新しい作業状態を更新しない。
- 共有タグ候補は最大40個で統一する。詳細設定は候補4〜40、順位1〜10、下限2以上かつ人数以下、上限は下限以上とする。
- 印刷画面は24面のみ（旧21面の保存値は復元可能）。Y補正の既定は2mm。本番の横2mm間隔・先頭X位置を維持し、試し刷りも同じ位置に合わせる。すき間Xは2mmに加える補正値とし、すべてのページの上端は用紙の全8段を基準にする。試し刷りは対象人数・開始段によらず全24枠を1枚に描く。
- 名前列の判定や人数の検証が失敗しても、列割り当てを残す。正常になるまで取り込みの確定を無効にする。
- タグ編集・バックアップ復元時に確認フラグを再評価する。手で個性／共有タグを直すと対応する代替作成フラグを解消し、未回答・同意なしは参加者の内容から判定する。
- バックアップとブラウザ保存の復元は、IDの一意性・参照先・文字数・数値範囲を検証する。正常な途中生成と旧版の参加者形式は受け入れ、不正データでは現在の作業を置き換えない。経過時間は時計補正に影響されない時計で測り、旧版の負の計測値は0に補正して復元する。

### エージェントの進め方

1. 人がこの仕様書をMarkdownで書き出し（図は書き出されないが、本文だけで実装できるように書いてある）、新しい空のフォルダに `docs/SPEC.md` として置く。エージェントは段階0で、`create-next-app` が作る `AGENTS.md`（なければ新しく作る）の先頭に「実装は docs/SPEC.md に従う。小さな判断は docs/DECISIONS.md に1行ずつ記録する」と追記する。
2. 「実装の順番と完了条件」の段階0から順に進める。段階ごとに完了条件のコマンドを通してからコミットする。
3. 仕様に書いていない判断が要るときは、機能を足さず最も単純な実装を選び、`docs/DECISIONS.md` に理由を1行残す。
4. おいとまに繋がらない環境でも、`LLM_MODE=mock` で全段階を実装・確認できる。live（本物のおいとま）での確認は人が行う。

### 優先度の書き方

| 表記 | 意味 |
| --- | --- |
| MUST | 必ず作る。発表に不可欠 |
| SHOULD | MUSTがすべて動いてから作る |
| MAY | 時間が余ったら作る。作らなくてよい |

### 必ず守ること

- おいとまのAPIキーと実際の回答データを、コード・コミット・エージェントへの指示文に書かない。`.env.local` と実データのExcelは人が用意し、gitに入れない。
- 参加者の**名前はおいとまに送らない**。送るのはID・所属・区分・自己紹介・一言・話題の要素だけ。
- **サーバーに参加者データを保存しない**（データベース、ファイル、ログのいずれにも残さない）。データは主催者のブラウザ内だけに置く。
- 「技術スタック」に挙げていないライブラリは足さない。どうしても必要なら `docs/DECISIONS.md` に理由を書く。

人への注意：Muse Spark 1.3のContributor Free版は、プロンプトと出力がMetaの学習に使われる条件で無料になっている。キーや実データをエージェントに貼らないこと。

### 人の進め方（おすすめ）

1回で全部を頼むより、段階ごとに止めてもらうほうが、途中の崩れに早く気づける。最初の指示の例：

```text
docs/SPEC.md を最後まで読んでから、段階0だけを実装してください。
段階0の完了条件をすべて確かめたら、「段階0: 準備」のようなメッセージでコミットし、何を確かめたかを報告して止まってください。pushはしないでください。
おいとまのキーや実データは使いません。LLM_MODE=mock で進めてください。
仕様にない判断は docs/DECISIONS.md に1行で残してください。
```

- 始める前に、`git config user.name` と `git config user.email` が設定されているか確かめる（未設定だとコミットで止まる）。
- 2回目からは「段階1に進んでください。完了条件を確かめたらコミットして止まってください」のように頼む。
- **コミットは段階ごとに1つ**。直しを頼んだときも、直し終わったらコミットしてもらう。段階の途中で崩れたら、人が `git restore . && git clean -fd` で未コミットの変更を捨て（`.env.local` などgitに入れないファイルは残る）、その段階をやり直してもらう。
- **pushは人が行う**。Vercelにつないだ後は、pushするたびに公開トップがデプロイされるので、段階7が終わってからつなぐ。
- 段階5〜7のあとは、人がブラウザで受け入れ確認をする。崩れていれば、スクリーンショットかエラー文を渡して直してもらう。

## 概要とスコープ

**主催者がFormsの回答Excelを取り込み、おいとまで「個性タグ1つ＋共有タグ2つ」を作り、A4のラベル用紙に「話題シール」として印刷する。1人分はタグ1つずつのシール3枚で、3列のラベル用紙の横1行に並ぶ。運営は行ごとに切って受付で渡し、参加者は名刺の名札ケースの左右の端からはみ出すように貼る。**

おいとまは学外から使えない前提で作る。取り込み・生成・印刷は、学内ネットワークかOU-VPNにつないだPCでアプリを動かして行う。会場の誰でも開ける公開トップだけをVercelに置き、生成済みのデモ用シールを載せる。発表では、事前に生成した状態を読み込み、生成の様子を再生して見せる。

### 作るもの

| 機能 | 優先度 | 補足 |
| --- | --- | --- |
| Excel取り込み（列の自動判定と手動割り当て） | MUST | Microsoft Formsの書き出し形式 |
| サンプルデータ（40人・200人のxlsx） | MUST | ダミー。スクリプトで生成 |
| タグの一括生成（5段階、進捗表示、途中からの再開） | MUST | 本仕様の中心。学内のPCで実行 |
| 確認画面（指標、共有タグのグループ、個人ごとの差し替え、ビフォー・アフター） | MUST |  |
| 話題シールのプレビューと印刷（A4・3列ラベル、1人1行、位置の微調整） | MUST | ブラウザの印刷機能を使う |
| 状態のJSON書き出し・読み込み | MUST | 発表は生成済みの状態を読み込んで行う |
| 生成の様子の再生 | MUST | 発表用。保存済みの結果で5段階を約10秒で見せる |
| 公開トップ（デモ用シール、共有タグ、指標） | MUST | Vercel。スマホ最優先 |
| 公開用データ（published.json）の書き出し | MUST |  |
| Vercel上では管理画面とAPIを無効にする | MUST | ログイン機能の代わり |
| モックモード | MUST | おいとまなしで全機能が動く |
| おいとま接続確認スクリプト | MUST | 人が学内で実行 |
| 個性タグの別案生成 | SHOULD | おいとまの出番を1つ増やす |
| 会場の傾向まとめ（2〜3文） | SHOULD | おいとま |
| 共有タグの人数表示 | SHOULD |  |
| コマンドラインでの一括生成 | MUST | プロンプト調整と、初期の公開データづくりに使う |
| 生成パラメータの手動上書き | SHOULD |  |
| 名刺に3枚を貼った見本の図 | MAY | 公開トップと印刷画面に出す |
| おいとまによるシール前の内容チェック | MAY | MUSTではNG語リストと人の確認で代用 |

### 作らないもの

データベース、ログイン機能（管理画面は学内のPCでだけ動かす）、Formsとの自動連携、アプリ内の回答フォーム、会場スクリーン、デジタル名札、多言語対応、PDFライブラリ。

## 技術スタックと全体構成

**Next.js（App Router）1本で画面とサーバー関数をまとめる。生成と印刷は学内ネットワークかOU-VPNにつないだPCで動かし、Vercelには公開トップだけを置く。** データは主催者のブラウザ（localStorage）だけに持ち、サーバーはおいとまへの中継に徹する。

### 技術スタック（確定）

| 項目 | 採用 | 理由・注意 |
| --- | --- | --- |
| 言語 | TypeScript（strict） |  |
| フレームワーク | Next.js 16系、App Router、`src/` ディレクトリ | `npx create-next-app@latest` の既定（TypeScript、ESLint、Tailwind、App Router、`@/*` エイリアス）で作る |
| 実行環境 | Node.js 22.9以上（24 LTS推奨） | スクリプトで `node --env-file-if-exists` を使う |
| スタイル | Tailwind CSS | UIコンポーネントライブラリは使わない |
| 状態管理 | Zustand（`persist` でlocalStorageに保存） | 画面をまたいで同じ状態を使う |
| 入力・出力の検証 | zod | おいとまの出力、取り込みデータ、読み込むJSON |
| Excelの読み書き | SheetJS CE（公式CDNのtarball） | `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`。npmの `xlsx` は0.18.5で古いので使わない。より新しい版がCDNにあればそれでよい |
| フォント | Noto Sans JP（`next/font/google`） | ビルド時に取り込まれるので、発表用PCがオフラインでも表示が崩れない |
| おいとま呼び出し | `fetch` でOpenAI互換の `/chat/completions` を直接呼ぶ | SDKは使わない。追加パラメータを自由に送るため |
| テスト | Vitest | 純粋関数と、モックでの通し |
| スクリプト実行 | tsx（`node --import tsx`） |  |
| 生成・印刷の実行場所 | 学内ネットワークかOU-VPNにつないだPC。`npm run build && npm start`（127.0.0.1だけで待ち受け） | おいとまは学外から届かないため |
| 公開トップのホスティング | Vercel Hobby。リポジトリは個人のGitHubアカウント | Organizationのリポジトリとは接続できない。環境変数は不要 |
| パッケージ管理 | npm |  |

### 全体構成

| 置き場所 | 担うこと | 持たないもの |
| --- | --- | --- |
| 学内のPC：ブラウザ | 画面、状態の保存（localStorage）、Excelの解析、生成の指揮（分割・並列・進捗・再開）、割り当てと指標の計算、生成の再生、印刷 |  |
| 学内のPC：Next.jsサーバー（127.0.0.1） | おいとまへの中継（プロンプトの組み立て、JSONの取り出しと検証、やり直し） | 参加者データ（保存しない） |
| おいとま（学内） | 言葉の処理だけ（話題の読み取り、共有タグの候補、当てはまり順、まとめ、別案） | 数の計算、割り当ての最終決定 |
| Vercel | 公開トップ（リポジトリ内の `src/data/published.json` を読む静的ページ）。管理画面とAPIは404にする | 参加者の回答、おいとまのキー |

**この構成の利点**：参加者の回答は学内（主催者のPCとおいとま）から出ない。学外のVercelに出るのは、名前を伏せた公開用データだけ。計画書の懸念だった「アプリを外部に置くと回答が学外に保存される」がなくなり、発表でもそのまま説明できる。

**生成の指揮をブラウザに置く理由**：1回のサーバー呼び出しを短く（数人分ずつ）保てるので、タイムアウトに強い。進捗表示と途中からの再開も自然に作れ、サーバーに状態を持たずに済む。

**発表用PCはオフラインでも動く**：ビルド済みなら、生成済みの状態の読み込み、生成の再生、確認、印刷プレビューにネット接続は要らない。

**サーバー専用コードの扱い**：`src/lib/llm/` と `src/lib/admin.ts` はクライアントコンポーネントから import しない。スクリプトからも読むため、`server-only` パッケージは使わない。

## ディレクトリ構成

**ファイル名と置き場所はこのとおりに作る。** 純粋な計算（`lib/` 直下）とおいとま関係（`lib/llm/`）と画面（`app/`）を分け、計算はテストで確かめる。テストは対象ファイルの隣に `*.test.ts` で置く。

```text
.
├── AGENTS.md                         # 先頭に「docs/SPEC.md に従う」を追記
├── README.md                         # 人向けの手順（段階8で書く）
├── docs/
│   ├── SPEC.md                       # この仕様書
│   └── DECISIONS.md                  # 実装中の小さな判断（1行ずつ）
├── .env.example                      # 環境変数のひな形（秘密の値は空）
├── vitest.config.ts                  # '@' を src に向ける alias を設定
├── public/
│   └── samples/
│       ├── sample-40.xlsx            # scripts/make-samples.ts が生成（コミットする）
│       └── sample-200.xlsx
├── scripts/
│   ├── make-samples.ts               # ダミー回答 → Forms形式のxlsx
│   ├── check-llm.ts                  # おいとまの接続確認（人が学内で実行）
│   └── run-pipeline.ts               # コマンドラインで生成を通す（初期の published.json もこれで作る）
└── src/
    ├── app/
    │   ├── layout.tsx                # フォント、noindex
    │   ├── page.tsx                  # 公開トップ（Vercelで公開する唯一の画面）
    │   ├── admin/
    │   │   ├── layout.tsx            # isAdminEnabled() が false なら notFound()。共通部分を描く
    │   │   ├── page.tsx              # /admin/import へリダイレクト
    │   │   ├── import/page.tsx
    │   │   ├── generate/page.tsx     # 生成と、生成の再生
    │   │   ├── review/page.tsx
    │   │   ├── print/page.tsx
    │   │   └── data/page.tsx
    │   └── api/
    │       ├── health/route.ts
    │       └── llm/
    │           ├── extract/route.ts
    │           ├── catalog/route.ts
    │           ├── rank/route.ts
    │           ├── summary/route.ts      # SHOULD
    │           └── regenerate/route.ts   # SHOULD
    ├── components/
    │   ├── Sticker.tsx               # 話題シール1枚（タグ1つ。印刷と画面で共用、mm/pt指定）
    │   ├── StickerSheet.tsx          # A4ラベル用紙1枚分（1行＝1人分。1人分3枚は StickerSet.tsx）
    │   ├── FitToWidth.tsx            # 画面幅に合わせて縮小表示（ResizeObserver）
    │   ├── GenerationReplay.tsx      # 生成の様子の再生
    │   ├── AdminNav.tsx
    │   ├── MetricsCards.tsx
    │   └── TagInput.tsx              # 文字数カウンタ付きのタグ入力
    ├── config/
    │   ├── event.ts                  # イベント設定、生成の定数、ラベル用紙の型番
    │   └── ng-words.ts               # シールに載せる前に確認する語
    ├── data/
    │   ├── published.json            # 公開トップの表示データ
    │   └── sample-participants.ts    # 40人分のダミー回答
    └── lib/
        ├── types.ts
        ├── text.ts                   # 文字数の数え方、タグの整形、NG語の判定
        ├── sizing.ts                 # 人数から目安の人数を決める
        ├── assign.ts                 # 共有タグの割り当て
        ├── metrics.ts                # 共通タグ仲間、遭遇率
        ├── concurrency.ts            # mapLimit（並列数を絞って実行）
        ├── publish.ts                # 公開用データの作成
        ├── store.ts                  # Zustand（persist）と appStateSchema
        ├── admin.ts                  # isAdminEnabled()（サーバー専用）
        ├── import/forms.ts           # Excel → Participant[]
        ├── pipeline/
        │   ├── llm-api.ts            # httpLlmApi（fetch実装）
        │   └── run.ts                # 生成の指揮（LlmApiを受け取る）
        └── llm/                      # サーバー専用
            ├── client.ts             # chatJson：呼び出し、JSON取り出し、検証、やり直し
            ├── prompts.ts
            ├── schemas.ts
            ├── tasks.ts              # 5つのタスクの本体と directLlmApi（mock/live切り替え）
            └── mock.ts
```

## データモデル

**型は `src/lib/types.ts` にこのとおり定義する。** 共有タグのメンバーは保存せず、`assignments` から毎回数える（正しい情報を1か所にだけ持つ）。タグは「#」なしで保存し、表示するときに「#」を付ける。

```ts
// src/lib/types.ts
export type Category = '学生' | '教員' | '職員' | '企業' | '自治体' | 'その他';

export interface Participant {
  id: string;          // 'P001' から取り込み順の連番
  name: string;        // シールの隅に小さく載せる（受付で配るため）。おいとまには送らない
  affiliation: string; // 所属（空文字可）
  category: Category;
  intro: string;       // 自己紹介。未回答・同意なしは ''
  hobby: string;       // 最近ハマっていること。未回答・同意なしは ''
  consent: boolean;
}

export interface Extraction {
  participantId: string;
  topics: string[];             // 1〜5個。各15文字以内
  personalCandidates: string[]; // 0〜3個。'#'なし、12文字以内
  source: 'llm' | 'fallback';
}

export interface SharedTag {
  id: string;      // 'T01' から候補の順に連番
  label: string;   // '#'なし、12文字以内
  covers: string;  // まとめた話題の説明（確認画面用。シールには出さない）
}

export type Flag =
  | 'no_answer'          // 自己紹介も一言も空
  | 'no_consent'         // 掲載に同意していない
  | 'ng_word'            // NG語を含む疑い
  | 'fallback_personal'  // 個性タグが代替の文言
  | 'fallback_shared';   // 共有タグをプログラムで補った

export interface Assignment {
  participantId: string;
  personalTag: string;     // 採用中の個性タグ
  sharedTagIds: string[];  // 原則2つ。足りない場合は flag を付ける
  edited: boolean;         // 人が手で変えたら true
  flags: Flag[];
}

export interface GenerationParams {
  n: number;              // 対象人数
  targetSize: number;     // 1つの共有タグを持つ人数の目安
  minSize: number;        // 下限（必ず守る）
  maxSize: number;        // 上限（できるだけ守る。超えたら警告）
  candidateCount: number; // 共有タグ候補の数
  rankLength: number;     // 1人あたりの当てはまり順の長さ（5）
}

export interface Metrics {
  participants: number;
  sharedTagCount: number;  // 1人以上が持つ共有タグの数
  matesMin: number;        // 共通タグ仲間の最小
  matesMedian: number;
  matesMax: number;
  encounterRate: number;   // 0〜1
  sizeMin: number;         // 共有タグの人数の最小
  sizeMax: number;
  needsReview: number;     // flags を1つ以上持つ人数
}

export type PhaseKey = 'extract' | 'catalog' | 'rank' | 'assign' | 'summary';
export interface PhaseProgress {
  key: PhaseKey;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  done: number;
  total: number;
  startedAt?: number;   // Date.now()。生成の再生で所要時間の表示に使う
  finishedAt?: number;
  message?: string;
}

export interface LlmCallLog {
  task: 'extract' | 'catalog' | 'rank' | 'summary' | 'regenerate';
  ms: number;
  ok: boolean;
  attempts: number;
  at: string; // ISO
}

export type SheetPresetKey = 'label24' | 'label21';

export interface PrintOptions {
  preset: SheetPresetKey;  // 既定 'label24'
  showCount: boolean;      // 共有タグに人数を添える（SHOULD）
  offsetXmm: number;       // 印刷位置の調整（-10〜10、0.5刻み）
  offsetYmm: number;
  gapXmm: number;          // ラベルどうしのすき間（0〜10）。用紙の説明書きに合わせる
  gapYmm: number;
}

// localStorage に保存する全体（キー 'nametag-app-v1'）
export interface AppState {
  version: 1;
  participants: Participant[];
  importedAt: string | null;
  params: GenerationParams | null;
  extractions: Record<string, Extraction>;
  candidates: SharedTag[];               // 段階2の候補（全件）
  rankings: Record<string, string[]>;    // participantId → 候補IDの当てはまり順
  activeTagIds: string[];                // 段階4で残った共有タグのID
  assignments: Record<string, Assignment>;
  summary: string;                       // 会場の傾向（なければ ''）
  progress: PhaseProgress[];
  llmLog: LlmCallLog[];                  // 直近200件まで
  generatedAt: string | null;
  printOptions: PrintOptions;
}

// src/data/published.json（公開トップが読む）
export interface PublishedData {
  version: 1;
  eventName: string;
  generatedAt: string;
  stickers: { id: string; name: string; affiliation: string; personalTag: string; sharedTags: string[] }[];
  sharedTags: { label: string; count: number }[]; // 人数の多い順
  metrics: Metrics;
  summary: string;
}
```

共有タグとして画面に出すのは `candidates` のうち `activeTagIds` に入っているものだけ。シールの共有タグ名は `sharedTagIds` から `candidates` を引いて表示する。

### イベント設定

```ts
// src/config/event.ts
export const EVENT = {
  appName: '#おいとま活用中',
  eventName: 'オープンイノベーションMatch Up 交流会（デモ）',
  audience: '企業、研究者、学生、自治体関係者',
  tone: 'casual' as 'casual' | 'standard' | 'academic',
  fallbackPersonalTag: '話しかけてね',
  accentColor: '#E4572E',
  publicNote: 'デモ用のダミーデータと、掲載に同意した回答から作っています',
};

export const PIPELINE = {
  extractBatchSize: 8,   // 話題の読み取り：1回で送る人数
  rankBatchSize: 15,     // 当てはまり順：1回で送る人数
  concurrency: 3,        // おいとまへの同時呼び出し数
  rankLength: 5,
  minParticipants: 6,
  maxParticipants: 300,
};

// ラベル用紙の型番。どれも3列で、1行＝1人分（個性タグ、共有タグ1、共有タグ2）。
// 寸法はmm、文字はpt。並びは用紙の中央に寄せ、すき間とずれは PrintOptions で調整する
export const SHEET_PRESETS = {
  label24: { label: 'A4 24面ラベル（66.0×33.9mm）', rows: 8, wMm: 66.0, hMm: 33.9, padMm: 3, minPt: 12, maxPt: 20 },
  label21: { label: 'A4 21面ラベル（70.0×42.3mm）', rows: 7, wMm: 70.0, hMm: 42.3, padMm: 3, minPt: 13, maxPt: 22 },
} as const;
export const STICKER_COLS = 3;
export const STICKER_CAPTION_PT = 6.5;

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  preset: 'label24', showCount: false, offsetXmm: 0, offsetYmm: 2, gapXmm: 0, gapYmm: 0,
};
```

### 状態の保存（`src/lib/store.ts`）

- Zustandの `persist` で `AppState` 全体を localStorage に保存する（`name: 'nametag-app-v1'`、`version: 1`）。
- storage は `getItem`・`setItem`・`removeItem` を try/catch で包んだものを使う。保存に失敗したら `saveError` を立て、管理画面の上部に「ブラウザに保存できませんでした。データ画面から状態を書き出してください」と出す。
- 操作（action）：`setParticipants`（生成結果も空に戻す）、`patchGeneration`（`GenerationSnapshot` の一部を反映）、`appendLlmLog`（200件を超えたら古いものから捨てる）、`updateAssignment`（`edited: true` にする）、`renameSharedTag`、`setPrintOptions`、`replaceAll`（読み込んだJSONで置き換え）、`resetGeneration('all' | 'shared')`、`clearAll`。
- 指標は保存せず、`computeMetrics` で毎回計算する。生成中かどうか（実行中フラグ）は保存しない。
- `appStateSchema`（zod）を `src/lib/state-schema.ts` に置き、JSON読み込みとlocalStorage復元時に検証する（store.tsからも再exportする）。
- 復元を待つための `useHydrated()` フックを用意する（`persist.hasHydrated()` と `onFinishHydration` を使う）。

## 画面仕様

**公開するのは `/` だけ。管理画面 `/admin/*` は学内のPCで動かしたときだけ使え、Vercel上では404にする。** 公開トップはスマホ最優先、管理画面は主催者のPC（幅1280px）を基準にし、発表のプロジェクター（1280×720）でも読める文字の大きさにする。

| パス | 使う場所 | 優先度 | 役割 |
| --- | --- | --- | --- |
| `/` | Vercel（誰でも）と学内のPC | MUST | 公開トップ。QRで開いた人が10秒で価値をつかむ |
| `/admin/import` | 学内のPCだけ | MUST | 回答の取り込み |
| `/admin/generate` | 学内のPCだけ | MUST | タグの一括生成と進捗、生成の様子の再生 |
| `/admin/review` | 学内のPCだけ | MUST | 確認と差し替え、ビフォー・アフター |
| `/admin/print` | 学内のPCだけ | MUST | 話題シールのプレビューと印刷 |
| `/admin/data` | 学内のPCだけ | MUST | 状態の書き出し・読み込み、公開用データの書き出し、消去 |

### 公開トップ `/`

サーバーコンポーネントで `src/data/published.json` を import して描く。上から次の順に並べ、最大幅720px、左右の余白16px、横スクロールなし。

1. **見出し**：アプリ名「#おいとま活用中」（`EVENT.appName`）と「名札に“話題”を足して、肩書き以外の話から始めよう」。その下に1行の説明「登録時の自己紹介から、おいとまが会場全体を見比べて“話しかけたくなるタグ”を作ります」。
2. **シールのサンプル**：1人分のシール3枚（`StickerSet`）を、名前と一緒に並べる（`FitToWidth` で縮小。幅600px未満は3枚を縦、それ以上は横1行）。最初は6人分、「もっと見る」で全部。
3. **この会場の共有タグ**：`sharedTags` を人数つきのチップで並べる。チップを押すと、そのタグを持つ人だけに絞り込み、もう一度押すと解除。
4. **数字**：参加者数、共有タグ数、共通タグ仲間（最小・中央値）、遭遇率。各数字の下に一言の説明（例：遭遇率「ランダムに2人選んだとき、共通のタグがある確率」）。
5. **会場の傾向**：`summary` が空でなければ表示。
6. **しくみ**：文で3ステップ。「① 参加登録で自己紹介と一言を答える ② おいとまが全員の回答を見比べ、かぶる話題を共有タグに、その人らしさを個性タグにする ③ プログラムが人数を検証して話題シールに印刷する。受付で受け取ったら、名札の左右からはみ出すように貼るだけ」。
7. **フッター**：`EVENT.publicNote`、「岡大おいとまハッカソン2026」。管理画面へのリンクは置かない。

### 管理画面の共通部分

- `admin/layout.tsx`（サーバーコンポーネント）で `isAdminEnabled()` を確かめ、false なら `notFound()`。
- 上部に、アプリ名、ステップナビ「1 取り込み / 2 生成 / 3 確認 / 4 印刷」と「データ」、モード表示（MOCK は灰色、LIVE は緑。`/api/health` の `mode`）。
- 管理画面のページはクライアントコンポーネントで、Zustandの復元（hydration）が終わるまで「読み込み中…」を出す。
- 前の段階が終わっていないページを開いたら、何をすればよいかを1行で示し、そのページへのボタンを出す（例：「まだ回答を取り込んでいません」→ 取り込みへ）。
- 保存に失敗したとき（`saveError`）は上部に警告を出す。
- 印刷時（`@media print`）は共通部分を隠す。

### `/admin/import`

1. 「Excelファイルを選ぶ（.xlsx）」ボタンと、「サンプル40人」「サンプル200人」ボタン。サンプルは `/samples/*.xlsx` を fetch して、ファイルと同じ処理で解析する。
2. 解析後、**列の割り当て表**を出す：項目（名前・所属・区分・自己紹介・最近ハマっていること・同意）ごとに、Excelの見出しを選ぶドロップダウン。自動判定の結果を初期値にする。名前だけ必須。
3. **プレビュー**：先頭10行（名前、所属、区分、自己紹介の先頭30文字、一言、同意）。
4. **集計**：取り込む人数、自己紹介か一言がある人数、同意なしの人数、名前が空で除外した行数。
5. 「この内容で取り込む」：既に生成結果があれば「生成結果は消えます」と確認する。取り込んだら生成状態を空に戻し、`/admin/generate` へ進むボタンを出す。
6. エラー：xlsxでない、見出し行がない、6人未満、300人超え。それぞれ何をすればよいかを1行で示す。

### `/admin/generate`

- **上部**：対象人数と目安（「1タグあたり約8人（4〜16人）、候補15個」）。SHOULD：「詳細設定」を開くと目安・下限・上限・候補数を上書きできる。
- **接続**：モード表示と「接続確認」ボタン（`/api/health?ping=1`）。成功ならモデル名と応答時間、失敗なら理由（例：「おいとまに接続できません。学内ネットワークかOU-VPNにつないでください」）。
- **ボタン**：状態に応じて「タグを一括生成」「続きから生成」「最初から作り直す」、SHOULDで「共有タグだけ作り直す」（話題の読み取りは残す）。どれも、手で編集した結果があれば上書きの確認を出す。予備として「生成済みの結果を読み込む（JSON）」（`/admin/data` の読み込みと同じ処理）も置く。
- **進捗**：5段階を縦に並べる。各行に、名前、担当（おいとま／プログラム）、状態のアイコン、件数（例：24/40）、経過秒。
  1. 話題の読み取り（おいとま）
  2. 共有タグの候補づくり（おいとま）
  3. タグの当てはまり順（おいとま）
  4. 割り当てと検証（プログラム）
  5. 会場の傾向まとめ（おいとま、SHOULD）
- **途中の表示**：段階2が終わったら候補タグをチップで並べ、段階4が終わったら採用タグを人数つきで並べる。
- **中止**：実行中は「中止」ボタン（AbortController）。中止しても、終わった分は残る。
- **失敗時**：やり直しても失敗したら、その段階を error にして理由を出し、「続きから生成」を押せるようにする。段階5の失敗は全体を止めない。
- **呼び出しの記録**：小さな文字で、おいとまの呼び出し回数、平均応答時間、やり直し回数。
- 完了したら「確認へ進む」と「生成の様子を再生」を出す。

### 生成の様子の再生（`GenerationReplay.tsx`）

**発表で、おいとまを呼ばずに生成の流れを見せる機能。保存済みの状態だけを使い、状態は変えない。** 生成が完了した状態のときに `/admin/generate` に「生成の様子を再生」ボタンを出す。押すと進捗表示を初期状態に戻し、約10秒で次の順に進める。

1. ① 話題の読み取り（2.5秒）：件数を0からNまで数え上げる。横に3人分の「一言 → 話題の要素」を順に出す。
2. ② 共有タグの候補づくり（2秒）：候補タグのチップを1つずつ出す。
3. ③ タグの当てはまり順（2秒）：件数を0からNまで数え上げる。
4. ④ 割り当てと検証（2.5秒）：採用されなかった候補のチップを薄くし、採用タグを人数つきで並べ、共通タグ仲間と遭遇率を数え上げる。
5. ⑤ 会場の傾向まとめ（1秒）：まとめの文を出す。

- 各段階の横に、実際の生成でかかった時間（`progress` の `startedAt` から `finishedAt`）を小さく出す。最後に「実際の生成：合計○分○秒、おいとま呼び出し○回」と出し、再生が早送りであることを示す。
- 「スキップ」で最後の状態まで飛ぶ。`prefers-reduced-motion` のときはアニメーションなしで最後の状態を出す。

### `/admin/review`

- **指標カード**：参加者、共有タグ数、共通タグ仲間（最小／中央値）、遭遇率、要確認の人数。編集するとすぐ計算し直す。その下に会場の傾向（あれば）。
- **タブ「共有タグ」**：人数の多い順に1行ずつ。ラベル（その場で編集、12文字まで、文字数表示）、まとめた話題（covers）、人数バッジ（下限未満は赤、上限超えは黄）、メンバーの名前チップ。名前を押すと「参加者」タブのその人へ移る。
- **タブ「参加者」**：1人1枚のカード。左に「ビフォー」、右に「アフター」を並べる（発表の見せ場）。
  - ビフォー：名前・所属・区分、回答（自己紹介と一言）、話題の要素（チップ）
  - アフター：1人分のシール3枚（`StickerSet`）のプレビュー、その下に編集欄
  - 個性タグ：候補から選ぶか自由に入力（12文字まで）。SHOULD：「別案」ボタンでおいとまに3案を出させ、候補に足す
  - 共有タグ1・2：採用タグから選ぶドロップダウン（同じタグを2つは選べない）
  - 要確認のバッジ（未回答、同意なし、NG語の疑い、代替タグ）
- 絞り込み：「すべて／要確認のみ」と名前検索。
- 編集したら `edited: true` にする。共有タグの差し替えで下限を割っても止めず、人数バッジで知らせる。
- 「印刷へ」ボタン。

### `/admin/print`

- **設定**（`printOptions` に保存）：用紙（24面／21面）、位置の調整X・Y（mm、0.5刻み、-10〜10）、すき間X・Y（mm、0〜10）、SHOULDで人数を表示（オフなら共有タグの下は「同じタグの人を探そう」）。
- **位置合わせ用の試し刷り**：各ラベルの外枠だけを0.2mmの線で描いたページを印刷するボタン。普通紙に刷ってラベル用紙と重ね、ずれを測って位置の調整に入れる。
- **プレビュー**：A4の用紙を縦に並べ、画面幅に合わせて縮小表示。1行に1人分、取り込み順。
- **印刷**：「印刷する」で `await document.fonts.ready` のあと `window.print()`。
- **案内**：Chromeで「送信先：プリンタ（またはPDFに保存）／用紙：A4／余白：なし／倍率：100%／背景のグラフィック：オン」。その下に、運営向けの「行ごとに切って、左のシールの名前を見て渡す」を1行で出す。

### `/admin/data`

- 「状態を書き出す」：`AppState` をJSONでダウンロード（`nametag-state-YYYYMMDD-HHmm.json`）。発表ではこれを読み込んで使う。
- 「状態を読み込む」：JSONを選ぶ → zodで検証 → 上書きの確認 → 置き換え。
- 「公開用データを書き出す」：チェックボックス「名前を伏せる」（既定オン）。`published.json` をダウンロードし、「`src/data/published.json` を置き換えてpushすると、Vercelの公開トップに反映されます」と案内する。
- 「すべて消去」：確認のうえlocalStorageを空にする。
- 保存中のデータ量（KB）を表示。

## 回答の取り込み

**Formsの「Excelで開く」で落としたxlsxを、ブラウザ内で解析して `Participant[]` にする。ファイルはサーバーに送らない。** 解析は `src/lib/import/forms.ts` の純粋関数にまとめ、ブラウザとスクリプトの両方から使う。

### 関数

```ts
export type FieldKey = 'name' | 'affiliation' | 'category' | 'intro' | 'hobby' | 'consent';
export interface SheetData { headers: string[]; rows: string[][] }
export type ColumnMap = Partial<Record<FieldKey, number>>; // 見出しの列番号

export function readSheet(data: ArrayBuffer | Uint8Array): SheetData;
export function guessColumns(headers: string[]): ColumnMap;
export function toParticipants(sheet: SheetData, map: ColumnMap): {
  participants: Participant[];
  skippedEmptyName: number;
  warnings: string[];
};
```

- `readSheet`：`XLSX.read(data, { type: 'array' })` の最初のシートを `sheet_to_json(ws, { header: 1, defval: '', raw: false })` で2次元の文字列にする。1行目が見出し。すべて空の行は捨てる。
- 見出しは前後の空白を除き、比較には NFKC で正規化した小文字を使う。

### 列の自動判定（`guessColumns`）

Formsの書き出しは、先頭に自動の列（ID、開始時刻、完了時刻、メール、名前、最終変更時刻。英語表示なら ID、Start time、Completion time、Email、Name、Last modified time）が付き、そのあとに質問の列が続く。

| 項目 | 見出しに含まれる語 | 同じ語が複数あるとき |
| --- | --- | --- |
| 名前 | お名前、氏名、名前、name | **最後に**一致した列（質問の「お名前」を、自動の「名前」より優先するため） |
| 所属 | 所属 | 最初に一致した列 |
| 区分 | 区分 | 最初 |
| 自己紹介 | 自己紹介 | 最初 |
| 最近ハマっていること | ハマ、はま、最近 | 最初（自己紹介に使った列は除く） |
| 同意 | 同意 | 最初 |

### 値の整え方（`toParticipants`）

- 名前・所属：改行を空白に、連続する空白を1つに、前後の空白を除く。名前30文字、所属40文字で切る。
- 自己紹介：改行を空白に、400文字で切る。一言：100文字で切る。
- 区分：値に「学生」→学生、「教員・教授・准教授・講師・助教」→教員、「職員」→職員、「企業・会社」→企業、「自治体・行政・官公庁」→自治体、どれでもなければ「その他」。区分の列がなければ全員「その他」。
- 同意：列があれば、空でなく、かつ「しない・いいえ・不可・no」を含まなければ同意とする。列がなければ全員同意とし、warnings に「同意の列がないため、全員を同意として扱います（デモ用）」を入れる。
- **同意なしの人は、自己紹介と一言を空にしてから保存する**（おいとまにも送らない）。シールのタグは所属と区分から作る。
- 名前が空の行は除外し、件数を `skippedEmptyName` に数える。
- IDは残った行に取り込み順で `P001`、`P002`…と振る。
- 6人未満、300人超えはエラーにする（画面側で表示）。

### サンプルデータ

`src/data/sample-participants.ts` に、エージェントが**40人分のダミー回答を手で書く**（実在の人物と無関係な架空の名前）。`scripts/make-samples.ts` がそこからForms形式のxlsxを2つ作る。

| ファイル | 人数 | 作り方 |
| --- | --- | --- |
| `public/samples/sample-40.xlsx` | 40 | `sample-participants.ts` をそのまま |
| `public/samples/sample-200.xlsx` | 200 | 姓・名・所属・自己紹介の文・一言の候補リストを、乱数の種を固定して組み合わせる（毎回同じ結果） |

40人分の内訳（共有タグが自然に生まれるよう、話題を意図的に重ねる）：

- 区分：学生18、教員8、職員5、企業6、自治体3
- 回答：自己紹介と一言あり30人、一言のみ5人、未回答5人。うち2人は同意なし
- 話題の重なり：飲食店めぐり（ラーメン、カレー、パン）7人、運動（ランニング、筋トレ、登山）6人、コーヒー・カフェ4人、ゲーム4人、AIを使った作業4人、旅行・キャンプ4人、動物と暮らす3人、畑・料理3人、朝型・夜型3人、ほかは1人だけの話題
- 堅い自己紹介を3人以上入れる（例：「腸内細菌叢と宿主の代謝を研究しています」「発酵食品の機能性成分を分析しています」「入試課で入試広報を担当しています」）。ビフォー・アフターの見せ場になる

xlsxの列（この順）：`ID`、`開始時刻`、`完了時刻`、`メール`、`名前`、`最終変更時刻`、`お名前`、`所属`、`区分`、`自己紹介（任意）`、`最近ハマっていること（任意）`、`名札への掲載に同意します`。自動の列は、ID＝連番、時刻＝2026-10-01の適当な時刻、メール＝`anonymous`、名前＝空、最終変更時刻＝空で埋める。同意の列は、同意する人は「同意します」、しない人は空にする。

## タグ生成パイプライン

**生成は5段階で、言葉を扱う3段階をおいとまが、割り当てと検証をプログラムが担う。共有タグの人数の下限はプログラムが必ず守る。** おいとまには「候補づくり」と「当てはまり順」までを任せ、誰がどのタグを持つかの最終決定はプログラムが行う。これで200人分の割り当てを一度に出力させずに済み、出力の崩れにも強くなる。

### 人数から目安を決める（`src/lib/sizing.ts`）

```ts
export function computeParams(n: number): GenerationParams {
  const targetSize = clamp(Math.round(n / 5), 3, 12);          // 1タグあたりの目安
  const minSize = Math.max(2, Math.ceil(targetSize / 2));      // 下限（必ず守る）
  const maxSize = targetSize * 2;                              // 上限（できるだけ守る）
  const candidateCount = clamp(Math.ceil((2 * n / targetSize) * 1.5), 4, 40);
  return { n, targetSize, minSize, maxSize, candidateCount, rankLength: PIPELINE.rankLength };
}
```

例：40人なら目安8人、下限4人、上限16人、候補15個。200人なら目安12人、下限6人、上限24人、候補40個。

### 5つの段階

| # | 段階 | 担当 | 入力 | 出力 | 単位 |
| --- | --- | --- | --- | --- | --- |
| 1 | 話題の読み取り | おいとま（`extract`） | ID・所属・区分・自己紹介・一言 | 話題の要素1〜5個、個性タグ候補3個 | 8人ずつ、同時3 |
| 2 | 共有タグの候補づくり | おいとま（`catalog`） | 全員のID・区分・話題の要素 | 候補 `candidateCount` 個（ラベルとcovers） | 全員まとめて1回 |
| 3 | タグの当てはまり順 | おいとま（`rank`） | 候補一覧と、各人の区分・話題・一言 | 1人5個の候補ID（当てはまる順） | 15人ずつ、同時3 |
| 4 | 割り当てと検証 | プログラム（`assign.ts`）＋必要ならおいとま | 当てはまり順、下限・上限 | 1人2つの共有タグ、採用タグ一覧、フラグ | 全員 |
| 5 | 会場の傾向まとめ（SHOULD） | おいとま（`summary`） | 採用タグと人数（上位8個） | 2〜3文 | 1回 |

- **段階1**で欠けた人（やり直しても返ってこない人）は、話題を「一言があればそれ（15文字まで）、なければ区分名」の1個にし、個性タグ候補は空にする（`source: 'fallback'`）。
- **段階2**が返したラベルに、クライアントが返ってきた順で `T01`、`T02`…とIDを振る。段階2の失敗は全体を止める（error）。
- **段階3**で欠けた人は当てはまり順を空にし、段階4で補う。
- **段階5**の失敗は `skipped` にして先へ進む。

（図：タグ生成の流れ。内容は上の「5つの段階」の表と同じ）

左の列がおいとま、右の列がプログラムの担当。④で2つ持てなかった人だけが③に戻り、下限を守る判断は常にプログラム側にある。

### 割り当てのアルゴリズム（`src/lib/assign.ts`）

```ts
export function assignSharedTags(input: {
  participantIds: string[];             // ID順
  rankings: Record<string, string[]>;   // 候補IDの当てはまり順
  candidateIds: string[];               // 候補の並び順（同点のときの優先順）
  minSize: number;
  maxSize: number;
}): { held: Record<string, string[]>; activeIds: string[]; shortIds: string[] };
```

1. `active` = すべての候補ID。
2. 次を最大で候補の数だけ繰り返す。
   1. 各人に、当てはまり順のうち `active` にあるものを先頭から2つ持たせる（pickTop2）。
   2. 上限を超えたタグを減らす（下の「あふれの解消」）。
   3. 人数を数え、0人のタグを `active` から外す。
   4. 下限未満のタグがなければ終わる。あれば、その中で一番人数の少ないタグを1つだけ `active` から外して1に戻る（同数なら候補の並びで後ろのもの）。
3. 最後の `active` で、pickTop2 とあふれの解消をもう一度行う。
4. 2つ持てなかった人を `shortIds` に、1人以上が持つタグを候補の並び順で `activeIds` に入れて返す。

**あふれの解消**：最大3回、上限を超えたタグを人数の多い順に見ていく。そのタグを持つ人を、そのタグの順位が低い人から（同順位ならIDの大きい人から）見て、当てはまり順のうち「`active` にある」「本人がまだ持っていない」「上限未満」の最初のタグに付け替える。人数が上限に戻ったら次のタグへ。付け替え先がない人はそのままにする（上限は守れないことがあり、その場合は警告で知らせる）。

**足りない人の補充**（`run.ts` で行う）：

1. `shortIds` の人だけ、候補を `activeIds` に絞って段階3（`rank`）をもう一度呼ぶ。
2. 返ってきた順に、まだ持っていないタグを2つになるまで足す（上限は無視する）。
3. それでも足りなければ、まだ持っていない採用タグのうち一番人数の少ないものを足し、`fallback_shared` を付ける。

補充は人数を増やすだけなので、下限は崩れない。

### シールの中身を決める

- 個性タグ：個性タグ候補の1つ目。候補がなければ `EVENT.fallbackPersonalTag` にして `fallback_personal` を付ける。
- フラグ：自己紹介も一言も空なら `no_answer`、同意なしなら `no_consent`、本人の個性タグか共有タグに `ng-words.ts` の語を含めば `ng_word`。

### 指標（`src/lib/metrics.ts`）

- **共通タグ仲間**：本人以外で、共有タグが1つ以上かぶる人の数。全員分の最小・中央値・最大を出す（中央値は人数が偶数なら真ん中2つの平均）。
- **遭遇率**：共有タグが1つ以上かぶる2人組の数 ÷ すべての2人組の数（n(n−1)/2）。300人でも約4.5万組なので総当たりで計算する。
- 共有タグの人数の最小・最大、要確認の人数。
- 目標：全員の共通タグ仲間が「下限−1」人以上（割り当てで保証される）、数十人規模で遭遇率30%以上、上限超えのタグ0個（超えたら警告）。

### 事前の試算

人数ごとに、おいとまの代わりに「人気に偏りのある当てはまり順」を乱数で作り、上のアルゴリズムを30回ずつ試した結果。下限はすべての試行で守られ、2つ持てない人は多くても1人だった（補充で解消できる）。

| 人数 | 目安 | 下限 | 上限 | 候補数 | 共通タグ仲間の最小 | 共通タグ仲間の中央値 | 遭遇率 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | 3 | 2 | 6 | 10 | 3.0 | 5.3 | 58% |
| 20 | 4 | 2 | 8 | 15 | 3.2 | 7.6 | 40% |
| 40 | 8 | 4 | 16 | 15 | 8.2 | 17.4 | 44% |
| 60 | 12 | 6 | 24 | 15 | 12.3 | 27.2 | 45% |
| 100 | 12 | 6 | 24 | 25 | 11.4 | 28.5 | 28% |
| 200 | 12 | 6 | 24 | 40 | 11.2 | 30.1 | 15% |

人気が強く偏ると、200人規模で上限を超えるタグが出た（30回中30回）。上限は「警告」にとどめ、下限だけを保証する設計にしたのはこのため。実際の回答で同じ表を作り直し、目安の式を調整する（SHOULDのコマンドライン生成で確かめる）。

### 指揮役（`src/lib/pipeline/run.ts`）

```ts
export interface GenerationSnapshot {
  params: GenerationParams;
  extractions: Record<string, Extraction>;
  candidates: SharedTag[];
  rankings: Record<string, string[]>;
  activeTagIds: string[];
  assignments: Record<string, Assignment>;
  summary: string;
  progress: PhaseProgress[];
}

export async function runGeneration(args: {
  participants: Participant[];
  start: GenerationSnapshot;      // 最初からなら空の結果、続きからなら途中の結果
  api: LlmApi;                    // ブラウザは fetch 版、スクリプトとテストは直接呼ぶ版
  onUpdate: (snap: GenerationSnapshot, log?: LlmCallLog) => void;
  signal?: AbortSignal;
}): Promise<GenerationSnapshot>;
```

- 並列実行は `src/lib/concurrency.ts` の `mapLimit(items, limit, fn)` を自作する（ライブラリは使わない）。
- 1回のおいとま呼び出しが終わるたびに `onUpdate` を呼び、画面とlocalStorageに反映する。
- **続きから**：段階1は `extractions` にない人だけ、段階2は `candidates` が空のときだけ、段階3は `rankings` にない人だけ行う。段階4は毎回やり直す（計算だけで速い）。段階5は `summary` が空のときだけ。
- **最初から作り直す**：参加者以外の生成結果をすべて空にして始める。**共有タグだけ作り直す**（SHOULD）：`extractions` を残し、それ以外を空にする。
- 6人未満なら始めずにエラーを返す。

## おいとま連携

**おいとまはOpenAI互換の `/chat/completions` として扱う。** 導入資料のOpenCode設定どおり、接続先は `https://ironical.okayama-u.ac.jp/ai/v1`、モデルは `qwen3.8-27b-it`（高品質）か `qwen3.6-35b-a3b-it`（高速）。URL・キー・モデル名・追加パラメータは、すべて環境変数で差し替えられるようにする。

### 共有する型（`src/lib/types.ts` に追記）

```ts
export interface ExtractInput { id: string; affiliation: string; category: Category; intro: string; hobby: string }
export interface ExtractResult { id: string; topics: string[]; personal: string[] }
export interface CatalogInput { id: string; category: Category; topics: string[] }
export interface RankInput { id: string; category: Category; topics: string[]; hobby: string }
export interface RankResult { id: string; ranked: string[] }
export interface CallMeta { attempts: number; ms: number }

export interface LlmApi {
  extract(people: ExtractInput[]): Promise<{ results: ExtractResult[]; missing: string[]; meta: CallMeta }>;
  catalog(people: CatalogInput[], params: GenerationParams): Promise<{ tags: { label: string; covers: string }[]; meta: CallMeta }>;
  rank(tags: SharedTag[], people: RankInput[], rankLength: number): Promise<{ results: RankResult[]; missing: string[]; meta: CallMeta }>;
  summary(tags: { label: string; count: number }[]): Promise<{ text: string; meta: CallMeta }>;
  regenerate(person: ExtractInput & { topics: string[] }, avoid: string[]): Promise<{ personal: string[]; meta: CallMeta }>;
}
```

実装は2つ：`src/lib/pipeline/llm-api.ts` の `httpLlmApi`（ブラウザから下のAPIを fetch）と、`src/lib/llm/tasks.ts` の `directLlmApi`（スクリプトとテストが直接呼ぶ）。

### APIルート

| ルート | 入力（JSON） | 出力（JSON） | 入力の上限 |
| --- | --- | --- | --- |
| `GET /api/health` | なし（`?ping=1` で接続確認） | `{ mode, model, ok?, ms?, error? }` |  |
| `POST /api/llm/extract` | `{ people: ExtractInput[] }` | `{ results, missing, meta }` | 1〜10人 |
| `POST /api/llm/catalog` | `{ people: CatalogInput[], params }` | `{ tags, meta }` | 6〜300人 |
| `POST /api/llm/rank` | `{ tags: SharedTag[], people: RankInput[], rankLength }` | `{ results, missing, meta }` | 1〜20人、タグ2〜40個 |
| `POST /api/llm/summary` | `{ tags: {label,count}[] }` | `{ text, meta }` | タグ1〜20個 |
| `POST /api/llm/regenerate` | `{ person, avoid }` | `{ personal, meta }` |  |

- すべてのAPIルートは最初に `isAdminEnabled()` を確かめ、false なら404を返す。入力はzodで検証し、合わなければ400。おいとまがやり直しても失敗したら502 `{ error: 'llm_failed', message }`。
- `isAdminEnabled()`（`src/lib/admin.ts`）は `process.env.VERCEL !== '1'` を返す。Vercelはビルド時と実行時に `VERCEL=1` を自動で設定するので、Vercel上では管理画面とAPIが自動で無効になる。
- 各 `route.ts` に `export const maxDuration = 120;` と `export const dynamic = 'force-dynamic';` を書く。
- サーバーのログには、タスク名・所要ms・試行回数・成否だけを出す。**回答の中身は出さない。**
- `httpLlmApi` は502なら例外を投げ、画面にサーバーの `message` を出す。ブラウザ側ではやり直さない（サーバーがやり直し済み）。

`/api/health` は、`?ping=1` を付けたときだけおいとまを1回呼んで `ok` と `ms` を返す。付けなければ `mode` と `model` だけを返し、管理画面の共通部分のモード表示に使う。モックでは `ping` でも呼ばずに `ok: true` を返す。

### モードの決め方

通常は `LLM_MODE` を指定せず、`.env.example` でもコメントだけにする。`LLM_MODE` が `mock` か `live` ならそれに従う。未設定なら、`OITOMA_BASE_URL` があれば `live`、なければ `mock`。キーだけではliveに切り替わらない。`live` なのにキーかモデル名がなければ `/api/health?ping=1` が `ok: false` と理由を返す。

接続先が設定済みでも、学外・VPN未接続などで通信に失敗した場合はliveのまま、下記のやり直し後に接続エラーを返す。自動でmockへ切り替えない。接続設定を残して練習するときは `LLM_MODE=mock` を明示する。

キーは `OITOMA_API_KEY`、未設定なら `OKAYAMA_API_KEY`（導入手順でWindowsのユーザー環境変数に入れたもの）を使う。`OKAYAMA_API_KEY` を使うときは、設定後に開き直したシェルから `npm run dev` などを起動する。

### 呼び出しの共通部（`src/lib/llm/client.ts`）

```ts
export async function chatJson<T>(opts: {
  task: LlmCallLog['task'];
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature: number;
  maxTokens: number;
  validate?: (value: T) => string | null; // 追加の検査。問題があれば理由を返す
}): Promise<{ value: T; attempts: number; ms: number }>;
```

- 送り先は `${OITOMA_BASE_URL（末尾の/を除く）}/chat/completions`、ヘッダーは `Authorization: Bearer <キー>`（キーは `OITOMA_API_KEY`、なければ `OKAYAMA_API_KEY`）。
- 本文：`{ model, messages: [system, user], temperature, max_tokens, stream: false }`。`OITOMA_JSON_MODE` が `json_object`（既定）なら `response_format: { type: 'json_object' }` を足す。最後に `OITOMA_EXTRA_BODY`（JSON文字列）を展開して重ねる。既定は `{"chat_template_kwargs":{"enable_thinking":false}}`（Qwen系の思考を切る指定。マニュアルでは `qwen3.8-27b-it` が思考向けのモデルなので、切って速くする）。
- 応答の `choices[0].message.content` を使う。`reasoning_content` など思考の欄は無視する。`content` が空なら失敗として扱い、次の試行では `max_tokens` を3倍にする（思考に出力枠を使い切った可能性がある）。
- **JSONの取り出し**：`<think>…</think>` を消す（閉じタグだけある場合は、その手前を消す）→ \`\`\`json などのコードブロック記号を消す → 最初の `{` から最後の `}` までを切り出す → `JSON.parse` → zodで検証 → `validate`。
- **やり直し**：最大3回まで。
  - 通信エラー、タイムアウト（`OITOMA_TIMEOUT_MS`、既定90000）：2秒、5秒と待ってやり直す。3回とも失敗したら「おいとまに接続できません。学内ネットワークかOU-VPNにつないでいるか確認してください」。
  - 429、5xx（混雑時の504を含む）：2秒、5秒と待ってやり直す。
  - JSONが壊れている、検証に落ちた：直前の出力（2000文字まで）をassistantとして、「前の出力は条件を満たしていません：〈理由〉。条件を守り、指定のJSONだけを返してください。」をuserとして足してやり直す。
  - **400（パラメータを受け付けない）**：`OITOMA_EXTRA_BODY` を外して送り直し、それでも400なら `response_format` も外して送り直す（試行回数に数えない）。通った組み合わせはプロセスの中で覚え、以後の呼び出しは最初からその組み合わせで送る。一度だけ `console.warn` で、`.env.local` に書くとよい値を出す。人が設定を理解していなくても動くようにするため。
  - 401、403：やり直さず「おいとまのキーが無効です。おいとまの『APIキー発行』（/keys）で再発行してください」で失敗。

### タスクの設定と出力後の整え方（`src/lib/llm/tasks.ts`）

| タスク | temperature | max\_tokens | 出力後の整え方と検査 |
| --- | --- | --- | --- |
| extract | 0.7 | 2000 | 入力にないidは捨てる。topicsは「#」と前後の空白を除き15文字以内のものだけ、重複を除いて5個まで。空なら一言（15文字まで）か区分名。personalは `sanitizeTag` して1〜12文字のもの、重複を除いて3個まで。返らなかった人だけで1回だけ再要求し、それでも返らない人を `missing` に入れる |
| catalog | 0.4 | 3000 | labelを `sanitizeTag` し、1〜12文字以外と重複を捨てる。coversは30文字で切る。残りが `max(4, floor(候補数×0.6))` 個未満なら検査不合格（理由：「候補が○個しかありません。○個作ってください」）。多すぎれば `min(40, floor(候補数×1.2))` 個までにする |
| rank | 0.2 | 2000 | 候補にないidと重複を捨て、`rankLength` 個までにする。有効なidが2個未満の人は返らなかった扱い。extractと同じく1回だけ再要求し、残りを `missing` に |
| summary | 0.7 | 600 | 空なら不合格。200文字で切る |
| regenerate | 0.9 | 400 | `sanitizeTag` して1〜12文字、`avoid` と同じものを除く。1個も残らなければ不合格 |

思考を切れない環境では出力枠が足りなくなることがある。空の応答だったときは、次の試行で max\_tokens を3倍にして送る（上の「やり直し」）。

### テキストの整え方（`src/lib/text.ts`）

- `displayLength(s)`：コードポイントごとに、ASCII（U+0020〜U+007E）と半角カナ（U+FF61〜U+FF9F）は0.5、それ以外は1として足す。
- `sanitizeTag(s)`：前後の空白を除く → 「#」「＃」をすべて除く → 空白（全角空白を含む）を除く → 括弧・引用符（「」『』""“”‘’()（））を除く → 絵文字（`\p{Extended_Pictographic}`）を除く → 末尾の句読点（。、！!？?）を除く。
- `hasNgWord(s)`：`src/config/ng-words.ts` の語を1つでも含むか。語の初期値：病、障害、離婚、妊娠、彼氏、彼女、恋人、年収、給料、借金、宗教、政党、選挙、体重。疑いを知らせるだけで、自動では消さない。

### モック（`src/lib/llm/mock.ts`）

おいとまを呼ばず、決まった結果を返す。同じ入力なら毎回同じ結果になるようにし、乱数は使わない（並べ替えの同点はIDの文字列ハッシュで決める）。

- 内蔵の話題辞書（ラベル、covers、キーワード）を20個持つ：ごはん屋開拓勢（ラーメン、カレー、パン、グルメ、店）、体を動かしたい（ランニング、筋トレ、ジム、運動、ヨガ、登山）、コーヒーがないと無理（コーヒー、カフェ）、夜型を自認（夜型、夜更かし、徹夜）、朝活してる（朝型、朝活、早起き）、週末アウトドア（キャンプ、釣り、アウトドア）、旅に出たい（旅行、旅）、ゲームで夜更かし（ゲーム）、動物と暮らしてる（猫、犬、ペット）、自炊がんばり中（料理、自炊、弁当）、土いじり好き（畑、家庭菜園、植物）、AIに頼りがち（AI、生成AI、ChatGPT）、本と漫画（本、読書、漫画、小説）、音楽が好き（音楽、ライブ、ギター、ピアノ）、推し活中（推し、アイドル、アニメ）、岡山を開拓中（岡山、地元）、ものづくり好き（工学、開発、プログラム、電子工作、DIY）、微生物にお世話になってる（微生物、細菌、発酵）、教えるのが好き（教育、授業、入試、学生）、写真を撮りがち（写真、カメラ）。
- extract：自己紹介・一言・所属に含まれるキーワードを話題にする（5個まで）。一言があれば先頭に加える（15文字まで）。何もなければ所属か区分。個性タグ候補は、一言（12文字まで）、「最初の話題＋好き」、「最初の話題＋が気になる」から12文字以内のもの。
- catalog：辞書のタグを、当てはまる人の多い順に候補数まで返す（足りなければ辞書の全部）。
- rank：各タグのキーワードが本人の話題・一言にいくつ含まれるかで並べ、同点はハッシュで決めて `rankLength` 個。
- summary：「今日は『上位1位』『上位2位』の仲間が多い会場です。話題シールのタグを見て、気軽に話しかけてみましょう。」
- regenerate：「最近〈話題〉」「〈話題〉の話がしたい」「〈一言〉中」から12文字以内で `avoid` にないもの。
- 進捗が見えるよう、1回あたり200〜600msの待ちを入れる（IDのハッシュで決める）。`process.env.VITEST` があるときは待たない。

### プロンプト（`src/lib/llm/prompts.ts`）

文面はこのとおりに実装する。`{…}` は差し込み。調整は人がこのファイルで行う。

**システム（全タスク共通）**

```text
あなたは、交流会の名札に載せる「話しかけたくなるハッシュタグ」を作る編集者です。
イベント：{eventName}
参加者層：{audience}
言葉の温度感：{toneText}

守ること：
- 出力は指定されたJSONだけにする。前置き、説明、コードブロックの記号は書かない。
- タグには「#」を付けない。空白を入れない。全角12文字以内（半角は0.5文字）。
- 雑談の入口になる、くだけた日常の言葉にする。肩書き、専門用語、仕事の課題はそのまま使わず言い換える。
- 家族、健康・病気、恋愛、収入、宗教、政治、容姿、年齢に関わる話題は使わない。
- 回答に書かれていないことを事実のように書かない。
```

`toneText`：casual＝「友だちに話すような、かなりくだけた言葉」、standard＝「初対面の大人同士でも使える、親しみやすい言葉」、academic＝「少し知的な好奇心をくすぐる言葉」。

**extract**（`{people}` は入力を1人1行のJSONで並べたもの）

```text
次の参加者それぞれについて、「話題の要素」と「個性タグの候補」を作ってください。

# 話題の要素（topics）
- 自己紹介と「最近ハマっていること」から、雑談の種になる要素を1〜5個抜き出す。
- 各15文字以内の短い名詞句にする。表記ゆれをそろえ、細かすぎる固有名詞は一段まるめる。
  例：「岡山駅前の〇〇カレー」→「カレー屋めぐり」
- 自己紹介も一言も空の人は、所属と区分から無難な要素を1〜2個作る。
  例：所属「工学部 情報系」→「プログラミング」

# 個性タグの候補（personal）
- 3個。その人だけの具体的な一言で、見た人が「それ何ですか？」と聞きたくなる言い回しにする。
- 良い例：週末は畑仕事／夜型を科学したい／パンを焼き始めた／ランニング3か月目
- 悪い例：趣味はいろいろ（ぼんやりしている）／画像処理を研究（肩書きのまま）／よろしくお願いします（話題がない）
- 自己紹介も一言も空の人も、所属や区分から1個以上作る。

# 参加者
{people}

# 出力形式
{"results":[{"id":"P001","topics":["カレー屋めぐり","ランニング"],"personal":["パンを焼き始めた","週末は畑仕事","夜型を科学したい"]}]}
入力の全員分を、入力と同じidで返す。
```

**catalog**（`{lines}` は「P001: 学生 / ラーメン屋めぐり, ランニング」の形で1人1行）

```text
参加者全員の「話題の要素」を見比べて、名札に載せる「共有タグ」の候補を{candidateCount}個作ってください。
共有タグは、会場の何人かとかぶって「同じですね」から話が始まるためのタグです。

# 条件
- 1つのタグが、会場の約{targetSize}人（{minSize}〜{maxSize}人）に当てはまる粒度にする。会場は{n}人。
- 広すぎるタグ（趣味がある、食べるのが好き）は誰とでもかぶって会話にならない。狭すぎるタグ（岡山駅前のカレー屋）は1人しか持たない。どちらも作らない。
- 似た話題をまとめ、抽象度を一段上げる。
  例：「ラーメン屋めぐり」「カレー屋開拓」→「ごはん屋開拓勢」
  例：「ランニングを始めた」「運動不足」→「体を動かしたい」
- 堅い話題は、くだけた共通点に言い換える。
  例：「腸内細菌の研究」「発酵食品の研究」→「微生物にお世話になってる」
- 話題の少ない人にも当てはまるタグ（区分や所属から言えるもの）を2〜3個入れる。
- 「朝型」「夜型」のような対になるタグを入れてもよい。
- 同じ意味のタグを重ねない。
- covers には、そのタグがまとめる話題を20文字以内で書く。

# 参加者の話題（id: 区分 / 話題の要素）
{lines}

# 出力形式
{"tags":[{"label":"ごはん屋開拓勢","covers":"ラーメンやカレーなど店めぐり"}]}
```

**rank**（`{tagLines}` は「T01 ごはん屋開拓勢：ラーメンやカレーなど店めぐり」、`{personLines}` は「P001: 学生 / ラーメン屋めぐり, ランニング / 岡山のラーメン屋巡り」）

```text
共有タグの候補一覧から、各参加者に当てはまるタグを、当てはまる順に{rankLength}個選んでください。

# 条件
- 話題の要素に一番近いタグを先頭にする。
- 直接書かれていなくても、自然に当てはまるタグは選んでよい（例：「カレー屋開拓」→「ごはん屋開拓勢」）。
- 当てはまるタグが少ない人も、無理のない範囲で{rankLength}個選ぶ。
- 候補一覧にないidは使わない。

# 共有タグの候補（id ラベル：まとめる話題）
{tagLines}

# 参加者（id: 区分 / 話題の要素 / 最近ハマっていること）
{personLines}

# 出力形式
{"results":[{"id":"P001","ranked":["T03","T11","T07","T01","T15"]}]}
入力の全員分を返す。
```

**summary**（`{lines}` は「ごはん屋開拓勢（12人）」を1行ずつ）

```text
今日の交流会で盛り上がりそうな話題を、開会前のアナウンス用に2〜3文でまとめてください。
- 共有タグと人数をもとに、参加者が「話しかけてみよう」と思える明るい文にする。
- 個人名や、個人が分かる内容は書かない。
- 全体で150文字以内。

# 共有タグ（人数）
{lines}

# 出力形式
{"text":"..."}
```

**regenerate**（`{rules}` はextractの「個性タグの候補」の箇条書きをそのまま使う）

```text
この参加者の個性タグを、別の切り口で3個作ってください。
次の案とは違う言い回し・違う話題にすること：{avoid}

# 個性タグの条件
{rules}

# 参加者
{person}

# 出力形式
{"personal":["...","...","..."]}
```

## 話題シールのデザインと印刷

**1人分は、タグ1つずつのシール3枚（個性タグ1枚、共有タグ2枚）。A4・3列のラベル用紙に1人1行で印刷する。運営は行ごとに切って受付で渡すだけで、参加者は名刺を入れた名札ケースの左右の端からはみ出すように貼る。** 名前と所属が隠れず、はみ出したシールが遠くからも目に入る。タグは「#」付きで表示し、「#」を除いて全角12文字以内とする。

### 用紙の型番（`SHEET_PRESETS`）

| 型番 | 用紙 | 面付け | 1枚の大きさ | 用紙1枚の人数 | タグの文字 |
| --- | --- | --- | --- | --- | --- |
| label24（既定） | A4 24面ラベル | 3列×8段 | 66.0×33.9mm | 8人 | 12〜20pt（長さで自動） |
| label21 | A4 21面ラベル | 3列×7段 | 70.0×42.3mm | 7人 | 13〜22pt（長さで自動） |

どちらも1行が3面なので、1行＝1人分になる。40人なら24面で5枚、21面で6枚。用紙ごとに余白やすき間が違うので、並びは用紙の中央に寄せ、ずれとすき間は印刷画面で調整する。

### 1行（1人分）の並び（`src/components/StickerSet.tsx`）

| 列 | シール | 中身 | 下の小さい字 |
| --- | --- | --- | --- |
| 左 | 個性タグ | 塗りの角丸（背景 #222、文字 白）、「#」＋タグ | 名前（受付で本人に渡すため） |
| 中 | 共有タグ1 | 枠線0.5mm（`EVENT.accentColor`）の角丸、「#」＋ラベル | `showCount` がオンなら「会場に12人」、オフなら「同じタグの人を探そう」 |
| 右 | 共有タグ2 | 中と同じ | 中と同じ |

共有タグが1つしかない人は、右のシールを空白のままにする。

### シール1枚（`src/components/Sticker.tsx`）

```ts
interface StickerProps {
  preset: SheetPresetKey;
  kind: 'personal' | 'shared';
  label: string;     // '#'なし
  caption?: string;  // 下の小さい字
}
```

- 寸法はmm、文字はptで書く。内側の余白は型番の `padMm`。白地、`overflow: hidden`。角丸の用紙でも中身が欠けないよう、余白は削らない。
- タグは上下の中央より少し上に1行で置き、`caption` は下端に置く（6.5pt、灰色 #666、1行、長ければ「…」）。
- **タグの文字の大きさ**は、1行に収まる最大の大きさにする：`pt = floor((内側の幅mm − 4) / ((displayLength(label) + 0.6) × 0.3528))` を、型番の `minPt`〜`maxPt` に収める（1pt＝0.3528mm、1文字の幅を文字の大きさと同じとみなし、「#」を0.6文字、角丸の左右の余白を4mmとして数える）。
- 例（24面、内側60mm）：12文字なら12pt、8文字なら18pt、5文字以下なら20pt。

### 画面での表示（`FitToWidth.tsx`）

子要素を本来の大きさで描き、親の幅を `ResizeObserver` で測って `transform: scale()` で縮める（高さも合わせて縮める）。`StickerSet` は、幅600px未満では3枚を縦に、それ以上では横1行に並べる。公開トップ、確認画面、印刷プレビュー、生成の再生で使う。

### A4への並べ方（`StickerSheet.tsx`）

- 用紙はA4縦（210×297mm）。1行に1人分、1枚に `rows` 人。入りきらない分は次の用紙へ。並びは取り込み順。
- 並びの左上の位置：左 `(210 − 3×w − 2×gapX) / 2 + offsetX` mm、上 `(297 − rows×h − (rows−1)×gapY) / 2 + offsetY` mm。
- 横の実間隔は `2 + gapX` mm。先頭位置は既存本番の式を維持し、試し刷りと本番で共有する。上の式の `rows` は実人数ではなく用紙全段数。
- 試し刷りモードでは、対象人数・開始段によらず全8段・24枠を1枚に描き、各ラベルの外枠を0.2mmの線で描く。

### 印刷用CSS

```css
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: #fff; }
  .no-print { display: none !important; }
  .sheet { width: 210mm; height: 297mm; position: relative; break-after: page; }
  .sheet:last-child { break-after: auto; }
}
.sheet, .sticker { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
```

画面では用紙を `FitToWidth` で縮めて縦に並べる。印刷時は縮小をやめて実寸にする（`@media print` で transform を解除）。

### 受付と貼り方

- **運営**：刷った用紙を行ごとにはさみかペーパーカッターで切る（24面なら用紙1枚につき7か所）。左のシールの小さい名前を見て本人に渡す。行は取り込み順なので、受付名簿と同じ順に重ねておくと探しやすい。
- **参加者**：3枚を、名刺を入れた名札ケースの左右の端から少しはみ出すように貼る（例：左端に個性タグ、右端に共有タグ2枚を上下に）。名前と所属の上には貼らない。はみ出しをシールの幅の3分の1くらいまでにすると、裏ののりが服に付きにくい。
- 受付に、チームの名札で作った貼り方の見本を1つ置く。
- MAY：公開トップと印刷画面に、名刺に3枚を貼った見本の図を出す。

（図：貼った後の名札。個性タグ1枚を左、共有タグ2枚を右に、名刺91×55mm・シール66.0×33.9mmの実寸比で貼る）

名札の中央約56mmは空くので、名前と所属は隠れない。実際の印刷では、個性タグは黒地に白文字、共有タグは色付きの枠線になる。受付の貼り方見本と、MAYの見本図はこの配置を元にする。

### 用紙選びと試し刷り（人が行う）

- A4・3列のラベル用紙（24面 66.0×33.9mm か 21面 70.0×42.3mm）を、使うプリンタ（インクジェット／レーザー）に合わせて選ぶ。「四辺余白付き」の用紙はラベルの間にすき間があるので、説明書きの値を印刷画面のすき間に入れる。
- 普通紙に「位置合わせ用の試し刷り」をしてラベル用紙と重ね、ずれを位置の調整に入れてから本番の用紙に刷る。
- 刷ったシールを実際に名札ケースに貼り、名前が隠れないか、1〜2m先からタグが読めるかを確かめる。

## 動かす場所、公開範囲、個人情報の扱い

**管理画面とAPIは学内のPCでだけ動かし、Vercel上では404にする。参加者の回答は学内（主催者のPCとおいとま）から出さず、学外に出るのは名前を伏せた公開用データだけ。** ログイン機能は作らない。

### 管理機能を学内のPCだけにする（`src/lib/admin.ts`）

- `isAdminEnabled()` は `process.env.VERCEL !== '1'` を返す。`admin/layout.tsx` とすべてのAPIルートで確かめる。
- 学内のPCでは `next dev` と `next start` に `-H 127.0.0.1` を付け、同じWi-Fiにいる他の端末からは開けないようにする（npmスクリプトに書いておく）。
- 管理画面には回答が表示されるので、開いたまま席を離れない。

`admin/layout.tsx` には `export const dynamic = 'force-dynamic';` を書き、ビルド時ではなく実行時の環境変数で判定されるようにする。

### 公開する範囲

| 見られる人 | 対象 |
| --- | --- |
| 誰でも（Vercel） | `/`、`/samples/*.xlsx`（ダミーのみ）、静的ファイル |
| 学内のPCの前にいる人だけ | `/admin/*`、`/api/*` |

すべてのページに `robots: { index: false, follow: false }` を設定し、検索に載せない（URLを一般に出さない条件に合わせる）。

### 個人情報の扱い

| データ | 置き場所 | 扱い |
| --- | --- | --- |
| 取り込んだ回答（名前、所属、自己紹介、一言） | 学内のPCのブラウザ（localStorage） | 「すべて消去」で消せる。イベント後に消す |
| おいとまに送る内容 | 学内のおいとまに送るだけ | ID、所属、区分、自己紹介、一言、話題の要素。**名前は送らない**。おいとまは入力を再学習に使わない（おいとまマニュアル） |
| Next.jsサーバー | 学内のPC（中継のみ） | 保存しない。ログは件数と時間だけ |
| 状態のJSON | 学内のPC | 発表用PCにだけ置く。gitに入れない |
| 公開用データ `published.json` | リポジトリとVercel | 名前・所属・タグだけ（自己紹介と一言は入れない）。既定で名前を伏せる |
| 実回答のExcel | 人の手元 | gitに入れない |

**名前を伏せる**（既定オン）：名前を「参加者01」のような連番に、所属を区分（学生、教員など）に置き換える。ダミーだけで作るときは外してよい。

`.gitignore` に追記する：`.env*.local`、`*.xlsx`（ただし `!public/samples/*.xlsx`）、`nametag-state-*.json`、`private/`。

### `.env.example`

## 環境変数とnpmスクリプト

**環境変数は7つで、学内のPCの `.env.local` にだけ人が値を入れる。Vercelには何も設定しない（公開トップはおいとまを使わない）。** エージェントは秘密の値を入れない `.env.example` だけを作る。

### `.env.example`

```bash
# 動作モードは通常指定不要。OITOMA_BASE_URL が空ならmock、設定済みならlive
# 接続設定があっても練習モードにしたいときだけ、次の行のコメントを外す
# LLM_MODE=mock

# おいとま（OpenAI互換API）。末尾の /chat/completions は付けない
# 値はおいとまマニュアルの https://…/ai/v1。リポジトリに載せないため、ここは空にしておく
OITOMA_BASE_URL=
# 未設定なら OKAYAMA_API_KEY（導入手順で入れたユーザー環境変数）を使う
OITOMA_API_KEY=
# qwen3.8-27b-it（高品質、サーバー4台）| qwen3.6-35b-a3b-it（高速、サーバー1台）
OITOMA_MODEL=qwen3.8-27b-it
# 下の2つは分からなければ既定のままでよい。受け付けない場合は自動で外して送り直す
OITOMA_JSON_MODE=json_object
OITOMA_EXTRA_BODY='{"chat_template_kwargs":{"enable_thinking":false}}'
OITOMA_TIMEOUT_MS=90000
```

### パッケージ

- dependencies：`next`、`react`、`react-dom`（create-next-appのまま）、`zustand`、`zod`、`xlsx`（CDNのtarball）
- devDependencies：create-next-appのもの（TypeScript、ESLint、Tailwind）、`vitest`、`tsx`

### `package.json` の scripts

```json
{
  "dev": "next dev -H 127.0.0.1",
  "build": "next build",
  "start": "next start -H 127.0.0.1",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit -p tsconfig.typecheck.json",
  "test": "vitest run",
  "samples": "tsx scripts/make-samples.ts",
  "llm:check": "node --env-file-if-exists=.env.local --import tsx scripts/check-llm.ts",
  "pipeline": "node --env-file-if-exists=.env.local --import tsx scripts/run-pipeline.ts",
  "verify": "npm run typecheck && npm run lint && npm test && npm run build"
}
```

`lint` はcreate-next-appが作った中身のままでよい。`--env-file-if-exists` はNode.js 22.9以上で使える（`.env.local` がなくても止まらない）。Windowsでも動くよう、環境変数をコマンドの前に書く形（`LLM_MODE=mock node …`）は使わない。Vercelは `build` だけを使うので、`-H` は影響しない。

`typecheck` は現在のブランチのルート型を `next typegen` で再生成する。検証用の `tsconfig.typecheck.json` は通常の設定を継承し、古いブランチの参照が残りうる `.next/dev/types` を除外する。`next.config.ts` は本番ビルド時にもこの設定を使う。アプリと新しい `.next/types` の型検査は行う。

### `scripts/check-llm.ts`（MUST、人が学内で実行）

`LLM_MODE` に関係なく本物のおいとまを呼ぶ。

1. 設定を表示する：URLのホスト、モデル名、JSONモード、追加パラメータのキー名。キーは「設定あり／なし」だけを出す。
2. `GET {OITOMA_BASE_URL}/models` でモデル一覧を表示する。通信エラーなら「おいとまに接続できません。学内ネットワークかOU-VPNにつないでください」と出して終了。
3. `qwen3.8-27b-it` と `qwen3.6-35b-a3b-it` のそれぞれに「{"ok":true} とだけ返してください」を送り、応答時間と、JSONとして読めたかを表示する。400なら追加パラメータ、`response_format` の順に外して送り直し、通った組み合わせを表示する。
4. `OITOMA_MODEL` で、ダミー3人の `directLlmApi.extract` を呼び、結果と応答時間を表示する。
5. 最後に `.env.local` に書くとよい値（`OITOMA_JSON_MODE`、`OITOMA_EXTRA_BODY`、`OITOMA_MODEL`）をまとめて表示する。すべて成功なら終了コード0、失敗なら1。

### `scripts/run-pipeline.ts`（MUST）

```bash
npm run pipeline -- --file public/samples/sample-40.xlsx [--mock] [--out private/result.json] [--publish src/data/published.json] [--no-mask]
```

- xlsxを `readSheet` → `guessColumns` → `toParticipants` で読み、`runGeneration`（`directLlmApi`）で生成する。`--mock` はタスクを読み込む前に `process.env.LLM_MODE = 'mock'` にする。
- 表示：段階ごとの所要秒、共有タグ候補、採用タグと人数、指標、5人分の例（一言 → 個性タグ・共有タグ）。
- `--out`：結果を `AppState` 形式のJSONに保存（管理画面の「状態を読み込む」でそのまま読める）。
- `--publish`：`PublishedData` を保存。`--no-mask` がなければ名前を伏せる。
- プロンプトを直したら、学内でこれを実回答に何度か通し、共有タグの人数と言葉の質を確かめる。

## 実装の順番と完了条件

**段階0から8まで順に進め、各段階の完了条件をすべて満たしてからコミットする。** 段階1〜4は画面なしで確かめられる部品で、先に固めることで画面づくりの手戻りを防ぐ。各段階の終わりに `npm run typecheck && npm test` を通す（段階8では `npm run verify`）。受け入れ確認の番号は「テストと受け入れ確認」の手順。

1. **段階0 準備**
   - そのフォルダで `npx create-next-app@latest . --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes` を実行する（対話の質問で止まらないよう、必ず引数を付ける）。フォルダが空でないと言われて止まったら、一時フォルダに作ってから中身を移す。
   - パッケージを入れる（`zustand`、`zod`、SheetJSのtarball、devに `vitest`、`tsx`）。
   - `docs/SPEC.md`、`docs/DECISIONS.md`、`AGENTS.md` への追記、`.env.example`、`.gitignore` の追記、`vitest.config.ts`（`@` を `src` に向ける）、`package.json` の scripts。
   - 完了条件：`npm run dev` で `http://127.0.0.1:3000` に初期ページが開く。`npm test` が通る（仮のテスト1件でよい）。
2. **段階1 計算の部品**
   - `types.ts`、`config/event.ts`、`config/ng-words.ts`、`text.ts`、`sizing.ts`、`concurrency.ts`、`assign.ts`、`metrics.ts` と、それぞれのテスト。
   - 完了条件：テストがすべて通る。
3. **段階2 取り込みとサンプル**
   - `data/sample-participants.ts`（40人を手で書く）、`scripts/make-samples.ts`、`import/forms.ts` とテスト。
   - 完了条件：`npm run samples` で `public/samples/` に2つのxlsxができる（テストと画面で使うのでコミットする）。テストで `sample-40.xlsx` を読み、列の自動判定と人数（40人、同意なし2人）が合う。
4. **段階3 おいとま連携**
   - `llm/client.ts`、`prompts.ts`、`schemas.ts`、`mock.ts`、`tasks.ts`（`directLlmApi`）、`admin.ts`、APIルート6本、`scripts/check-llm.ts`。
   - 完了条件：JSON取り出し、400のときの送り直し、`isAdminEnabled` のテストが通る。`LLM_MODE=mock` で `npm run dev` し、`http://127.0.0.1:3000/api/llm/extract` に3人分をPOSTすると結果が返る。`check-llm.ts` は型チェックが通ればよい（実行は人が学内で行う）。
5. **段階4 生成の指揮**
   - `pipeline/run.ts`、`pipeline/llm-api.ts`（`httpLlmApi`）、`scripts/run-pipeline.ts`（段階7で初期の公開データを作るのにも使う）。
   - 完了条件：`directLlmApi`（モック）で `sample-40.xlsx` を通すテストが通る。`npm run pipeline -- --mock --file public/samples/sample-200.xlsx` が1分以内に終わる。
6. **段階5 管理画面（取り込み・生成・確認）**
   - `store.ts`、共通部分、`/admin/import`、`/admin/generate`、`GenerationReplay`、`/admin/review`、`Sticker`、`FitToWidth`、`MetricsCards`、`TagInput`。
   - 完了条件：モックで受け入れ確認の手順2〜6が通る。
7. **段階6 印刷**
   - `StickerSheet`、`/admin/print`、印刷用CSS、位置合わせ用の試し刷り。
   - 完了条件：受け入れ確認の手順7が通る。
8. **段階7 データ管理と公開トップ**
   - `publish.ts`、`/admin/data`、公開トップ `/`。
   - `npm run pipeline -- --mock --file public/samples/sample-40.xlsx --publish src/data/published.json --no-mask` で初期の `published.json` を作る（ダミーなので名前は伏せない）。
   - 完了条件：受け入れ確認の手順1、8、9が通る。
9. **段階8 仕上げ**
   - noindex、エラー表示の見直し、読み込み中の表示。
   - `README.md`（人向け）：学内のPCでのセットアップ、`.env.local`、`llm:check`、生成から印刷まで、Vercelへのデプロイ、発表の手順。
   - SHOULDの機能を、スコープの表の上から順に作る。
   - 完了条件：`npm run verify` が通る。受け入れ確認をモックで最初から最後まで通す。

## テストと受け入れ確認

**計算と変換はVitestで自動テストし、画面はモックで決まった手順を通して確かめる。** liveでの確認だけは、キーを持つ人が学内で行う。

### 自動テスト（Vitest）

| ファイル | 確かめること |
| --- | --- |
| `text.test.ts` | `displayLength('ランニング3か月目')` が8.5、`displayLength('AI')` が1。`sanitizeTag('#ごはん屋 開拓勢！')` が `ごはん屋開拓勢`、`sanitizeTag('「夜型」🌙')` が `夜型`。`hasNgWord('恋人募集中')` が true |
| `sizing.test.ts` | `computeParams(10)` の目安・下限・上限・候補数が 3・2・6・10、40人で 8・4・16・15、200人で 12・6・24・40 |
| `concurrency.test.ts` | `mapLimit` が同時実行数を超えない。結果が入力と同じ順で返る |
| `assign.test.ts` | 下の「手で確かめた例」と一致する。乱数の種を固定した当てはまり順（10人・40人・200人、各50回）で、採用タグはすべて下限以上、1人が同じタグを2つ持たない、`shortIds` は2つ持てなかった人とだけ一致する |
| `metrics.test.ts` | A{T1,T2}、B{T1,T3}、C{T3,T4}、D{T5,T6} のとき、共通タグ仲間が A1・B2・C1・D0（最小0、中央値1、最大2）、遭遇率 2/6、タグの人数の最小1・最大2、共有タグ数6 |
| `forms.test.ts` | `sample-40.xlsx` で名前の列が「お名前」（自動の「名前」ではない）、40人、同意なし2人の自己紹介と一言が空。同意の列がないシートで warnings が1件出る |
| `client.test.ts` | JSON取り出し：\`\`\`json で囲んだもの、`<think>…</think>` が前にあるもの、前後に文があるものを読める。途中で切れたJSONは失敗する。`fetch` を差し替え、1回目と2回目に400を返すと、追加パラメータ、`response_format` の順に外して送り直し、3回目の成功を返す。403ではやり直さない |
| `admin.test.ts` | `VERCEL` が `'1'` のとき `isAdminEnabled()` が false、未設定なら true |
| `run.test.ts` | モックの `directLlmApi` で `sample-40.xlsx` を通すと、全員に個性タグ（1〜12文字）と異なる共有タグ2つが付く（足りない人は `fallback_shared` 付き）。採用タグはすべて下限以上。共通タグ仲間の最小が「下限−1」以上。続きから：20人分の `extractions` を渡すと、extract は残り20人分だけ呼ばれる |

**割り当ての手で確かめた例**（`minSize: 2`、`maxSize: 4`、候補 `T1〜T4` の順）

| 参加者 | 当てはまり順 | 結果 |
| --- | --- | --- |
| P1 | T1, T2, T3 | T1, T2 |
| P2 | T1, T2, T4 | T1, T2 |
| P3 | T1, T3, T2 | T1, T3 |
| P4 | T2, T1, T3 | T2, T3 |
| P5 | T3, T1, T2 | T3, T2 |
| P6 | T4, T3, T1 | T3, T1 |

期待する返り値：`activeIds` が `['T1','T2','T3']`（T4は1人しかいないので外れる）、`shortIds` が空、各タグ4人ずつ。持つタグの比較は順不同でよい。

### 受け入れ確認（モック。ブラウザを操作できないエージェントなら人が行う）

`LLM_MODE=mock` で `npm run build && npm start` し、Chromeで `http://127.0.0.1:3000` を開いて次を順に確かめる。

1. `/` にシールのサンプル、共有タグのチップ、数字が出る。チップを押すとシールが絞り込まれる。幅375pxで横スクロールが出ない。
2. `/admin/import` がログインなしで開く。
3. 「サンプル40人」で、列の割り当てが自動で埋まり、40人・同意なし2人と集計される。取り込める。
4. 生成で5段階の進捗が順に進み、30秒以内に終わる。途中で「中止」→「続きから生成」でも最後まで終わる。
5. 「生成の様子を再生」で、5段階が約10秒で進み、最後に実際の所要時間と呼び出し回数が出る。「スキップ」で最後まで飛ぶ。
6. 確認画面で回答とシールが左右に並ぶ。個性タグを書き換える、共有タグを差し替える、共有タグの名前を変えると、指標とシールがすぐ変わる。ページを再読み込みしても残っている。
7. 印刷画面のChrome印刷プレビューで、24面（3列×8段）ならA4 5枚に、1行に1人分（個性タグ、共有タグ2つ）が並ぶ。タグと名前が欠けない。「位置合わせ用の試し刷り」では外枠だけが出る。
8. データ画面で状態を書き出し、「すべて消去」してから読み込むと元に戻る。公開用データを書き出せる。
9. `npm run build` のあと、環境変数 `VERCEL=1` を付けて `npm start` すると、`/admin/import` と `/api/health` が404になり、`/` は表示される（PowerShellでは $env:VERCEL='1' としてから npm start）。

### liveでの確認（人が学内で行う）

10. 学内ネットワークかOU-VPNにつないで `npm run llm:check` が成功する。
11. `.env.local` を `LLM_MODE=live` にして、`sample-40.xlsx` と実回答で生成が最後まで終わる。所要時間を記録し、状態を書き出して発表用に保存する。

## 学内での運用、デプロイ、発表の準備（人がやること）

**生成と印刷は学内ネットワークかOU-VPNにつないだPCで行い、Vercelには公開トップだけを置く。発表では、事前に書き出した生成済みの状態を読み込み、生成の様子を再生して見せる。**

### 学内のPCで動かす

1. リポジトリをcloneして `npm install`。
2. `.env.example` を `.env.local` に写し、`LLM_MODE=live` と `OITOMA_BASE_URL`（おいとまマニュアルの `…/ai/v1`）を入れる。キーは `OITOMA_API_KEY` に入れるか、導入手順で設定した `OKAYAMA_API_KEY` をそのまま使う。
3. 学内ネットワークかOU-VPNにつなぎ、`npm run llm:check` を通す。表示された推奨値を `.env.local` に写す。
4. `npm run build && npm start` で起動し、Chromeで `http://127.0.0.1:3000/admin` を開く。

### Vercelへのデプロイ（公開トップだけ）

1. リポジトリを**個人の**GitHubアカウントに置く（HobbyプランはOrganizationのリポジトリと接続できない）。
2. Vercelで「Add New → Project」からImportする。Framework PresetはNext.jsのまま。環境変数は設定しない。
3. デプロイ後、`/` が表示され、`/admin/import` が404になることを確かめる。
4. 公開トップの中身を変えるときは、`/admin/data` で書き出した `published.json` で `src/data/published.json` を置き換えてpushする。
5. 本番URL（`/`）をQRコードにしてスライドに載せる。

### 発表の流れ（画面）

1. **取り込み**：FormsのExcelを取り込んで見せる（ネット接続は要らない）。
2. **生成**：「生成済みの結果を読み込む」で事前に書き出した状態を読み込み、「生成の様子を再生」で5段階を見せる。最後に出る実際の所要時間で、おいとまが本当に処理したことを示す。
3. **確認**：ビフォー・アフターで、堅い自己紹介がくだけたタグに変わる例を2〜3人見せる。指標（共通タグ仲間、遭遇率）を読み上げる。
4. **印刷**：印刷プレビューと、実際に刷って名札に貼ったシールを見せる。
5. **QR**：スライドのQRから、公開トップのデモ用シールを手元のスマホで見てもらう。

### チェックリスト

- [ ] 学内ネットワークかOU-VPNで `npm run llm:check` を通す（10日）
- [ ] 質問文の検証用に、実回答10〜20人分をFormsで集め、Excelを手元に保存する。gitには入れない（10日）
- [ ] 実回答＋ダミーでliveの生成を通し、`prompts.ts` と目安の式を調整する（12日まで）
- [ ] ラベル用紙（A4・3列の24面か21面）を買い、試し刷りで位置とすき間を合わせる（13日まで）
- [ ] Vercelにデプロイし、スマホで公開トップを確かめる（14日まで）
- [ ] 発表で使うデータで生成し、状態を書き出して発表用PCに保存する。発表用PCでビルドし、ネットを切って読み込み・再生・確認・印刷プレビューまで通す（15日）
- [ ] 公開用データを書き出して `src/data/published.json` を置き換え、pushする。実回答を含むなら「名前を伏せる」をオンのまま（15日）
- [ ] チームの分のシールを刷り、登壇時の名札に貼る（15日）
- [ ] 会場のトラブルに備えて、デモの録画を用意する（15日）
- [ ] 発表後、実データを扱ったブラウザで「すべて消去」を押す

## 決定事項と未決事項

**構成、運用、おいとまの使い方は決まった。残るのはラベル用紙の型番、学内でのおいとまの応答時間、発表の持ち時間の3つ。** どれも実装を止めずに後から決められる。

### 決定事項

| # | 項目 | 決めたこと | 理由 |
| --- | --- | --- | --- |
| 1 | データの保存 | 主催者のブラウザ（localStorage）だけ。サーバーやDBには保存しない | チームの判断。構成が最小で済む |
| 2 | 動かす場所 | 生成と印刷は学内ネットワークかOU-VPNのPC。Vercelには公開トップだけ | おいとまは学外から届かない前提（チームの判断） |
| 3 | 管理機能の守り方 | Vercel上では404。学内のPCでは127.0.0.1だけで待ち受ける。ログインは作らない | 作る量を減らし、回答を学外に出さない |
| 4 | 共有タグの作り方 | おいとまが候補と当てはまり順を出し、プログラムが割り当てて下限を保証する | 出力が短く崩れにくい。「言葉はおいとま、保証はプログラム」を発表で説明できる |
| 5 | 人数の目安 | 目安＝人数÷5（3〜12人）、下限＝目安の半分、上限＝目安の2倍 | 試算で40人の遭遇率が約44%、下限は全試行で守られた |
| 6 | タグの表記 | 画面とシールでは「#」付き、保存は「#」なし。全角12文字以内 | 3列ラベルの1枚に、長さに応じた文字の大きさで収まる |
| 7 | 当日の運用 | 話題シール。1人分＝タグ1つずつのシール3枚を、A4・3列ラベルの横1行に刷る（既定は24面）。行ごとに切って配り、名札ケースの左右の端からはみ出すように貼る | チームの判断。運営は行ごとに切るだけで済み、名前と所属を隠さない |
| 8 | おいとまに送る項目 | 名前は送らない | 処理に不要で、個人情報を減らせる |
| 9 | 公開データ | 名前を伏せるのが既定 | QRで誰でも見られるため |
| 10 | おいとまの接続 | OpenAI互換の `…/ai/v1/chat/completions`。モデルは `qwen3.8-27b-it`（高品質、サーバー4台）、遅ければ `qwen3.6-35b-a3b-it`（高速、サーバー1台） | おいとまマニュアルと導入資料 |
| 11 | JSONモードと思考オフ | 既定で付けて送り、受け付けなければ自動で外して送り直す | マニュアルに記載がなく、人が設定を理解していなくても動くようにする |
| 12 | APIキー | `OITOMA_API_KEY`、なければ `OKAYAMA_API_KEY` | 導入手順で入れた値をそのまま使える |
| 13 | 発表 | 生成済みの状態を読み込み、生成の様子を再生して見せる | チームの判断。会場のネットやおいとまの混雑に左右されない |
| 14 | 実装担当 | OpenCode上のMuse Spark 1.3 | チームの判断。キーと実データは渡さない |
| 15 | アプリ名 | #おいとま活用中 | チームの判断。名前自体がハッシュタグで、おいとまを使っていることも伝わる |

### 未決事項

- [ ] ラベル用紙の型番：24面（66.0×33.9mm）か21面（70.0×42.3mm）。試し刷りで、名札ケースに貼ったときの収まりと読みやすさを見て決める。
- [ ] 学内でのおいとまの応答時間：`llm:check` で2つのモデルを測り、`OITOMA_MODEL` を決める。
- [ ] 発表の持ち時間：再生と確認に何分使うかを決める。

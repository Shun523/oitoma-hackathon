# 発表構成・分析・根拠

対象：審査員（教授・企業）／開発成果報告／日本語／16:9／本編4分。
分析対象：2026-10-15時点の作業ツリー（HEAD `480d010`）。実回答、APIキー、`.env.local` は読み込まず、説明例は既存文書の架空例を使う。

## ソースから確認したシステム

交流会の名札に、初対面の会話のきっかけとなる「話題シール」を足すアプリ。Formsの回答Excelを取り込み、個性タグ1つと共有タグ2つを作り、主催者の確認後にA4ラベル用紙へ印刷する。会話促進は開発の目的であり、実会場で効果を測定した結果は資料から確認できない。

| コンポーネント | 責務・依存関係 | 実装根拠 |
| --- | --- | --- |
| ブラウザの管理画面 | Excel解析、生成の指揮、進捗と再開、タグ割り当て、編集、印刷 | `src/app/admin/`、`src/lib/import/forms.ts`、`src/lib/pipeline/run.ts`、`src/lib/assign.ts` |
| ブラウザ内の状態 | Zustand persistによるlocalStorage保存、JSONバックアップ、復元検証 | `src/lib/store.ts`、`src/lib/state-schema.ts`、`src/app/admin/data/page.tsx` |
| Next.js API | プロンプト生成、サーバーのキーによる中継、JSON検証・再試行 | `src/app/api/llm/*/route.ts`、`src/lib/llm/{tasks,client,schemas}.ts` |
| 学内AIおいとま | 話題抽出・個性候補、共有候補、当てはまり順位、会場の要約、個性タグ別案 | `src/lib/llm/prompts.ts`、`src/lib/llm/tasks.ts` |
| シールと印刷 | 個性1枚＋共有2枚を1人1行、A4の24面用紙、位置補正 | `src/components/{Sticker,StickerSet,StickerSheet}.tsx`、`src/app/admin/print/page.tsx` |
| ngrok（運用手順） | 外部ブラウザから主催者PCへ中継。Google認証・許可メール照合を構成する計画 | `docs/NGROK.md` §1・§5〜7。実稼働・認証成功を確認した証跡はない |

画面はNext.js 16.4.0／React 19.3.0、処理はTypeScript、ExcelはSheetJS CE、状態管理はZustand、入力・出力検証はZod、テストはVitest。依存バージョンは `package.json` に基づく。おいとまへの接続はサーバーのfetchによる `POST {OITOMA_BASE_URL}/chat/completions`。モデルは環境変数で選ぶため、実行モデルを未確認のまま断定しない。

## 構成案（生成前に確定）

| 枚 | 秒 | 結論タイトル | 中心となる主張 | 根拠 | 図解方式 |
| --- | ---: | --- | --- | --- | --- |
| 1 | 20 | 名札に「話しかけるきっかけ」を足す | 学内交流会の会話の入口を作る | `docs/spec.md`「概要とスコープ」、`docs/PRESENTATION-TAG-GENERATION.md`「発表で伝える一文」 | 大きな結論＋課題の短文 |
| 2 | 30 | 回答を「個性1つ＋共有2つ」に変える | 個性と共通点の2つの入口を作る | `docs/PRESENTATION-TAG-GENERATION.md`「回答がタグに変わる具体例」、`src/lib/pipeline/sticker.ts`、`src/components/StickerSet.tsx` | 架空の回答2人→シール3枚ずつ |
| 3 | 25 | 取り込みから印刷まで、主催者が進められる | 入力から物理出力まで実装した | `src/lib/import/forms.ts`、`src/app/admin/{generate,review,print}/page.tsx` | 左→右の5ノードの操作フロー。生成を強調 |
| 4 | 45 | 生成開始時に、おいとまへ段階的に問い合わせる | 言葉の処理を必要なタイミングでAPI連携する | `src/lib/pipeline/run.ts`、`src/lib/pipeline/llm-api.ts`、`src/lib/llm/client.ts` | 3ノードの通信構成＋5段階の処理フロー |
| 5 | 40 | 言葉はAI、人数調整はコードに分ける | 意味判断と数の制約を分離する設計 | `docs/spec.md`「タグ生成パイプライン」、`src/lib/assign.ts`、`src/lib/pipeline/run.ts` | 一括生成という比較案と採用案の2カラム比較図 |
| 6 | 35 | 学内AIと送信の最小化で、個人情報を扱う | 学内AIの利用にデータ最小化を組み合わせる | `docs/spec.md`「個人情報の扱い」、`src/lib/pipeline/run.ts` `toExtractInput`、`src/lib/import/{forms,manual}.ts`、`src/lib/store.ts`、`docs/NGROK.md` §7 | 大きな文章＋3項目。学外中継の条件も表示 |
| 7 | 30 | 取り込み・追加・印刷まで動作を確認した | モックで一連の操作と印刷PDFを検証した | 今回の `npm test`（98件成功）、`docs/ACCEPTANCE-2026-10-12.md` | 98・18の大きな数値＋PDF検証結果 |
| 8 | 15 | 学内AIを、会話の最初の一言につなげる | 意味理解を、会場で手に取れる出力へつなぐ | 本編の実装根拠、`docs/spec.md`「概要とスコープ」 | 3枚のタグの簡潔な図＋次の検証 |
| 9 | 付録 | 追加した1人だけ生成し、既存タグを保つ | 当日の追加で全員を作り直さない | `docs/SPEC-ADD-1.md`「1人分の生成」、`src/lib/pipeline/add-one.ts`、`src/lib/pipeline/add-one.test.ts` | extract→rank→assignの処理図 |
| 10 | 付録 | 外部利用はngrok認証を前提にする | 学外中継を含む運用の境界を明示する | `README.md` 2026-10-14方針、`docs/NGROK.md` §1・§5〜8、`src/lib/admin.ts` | ブラウザ・ngrok・主催者PC・おいとまの構成図 |

本編合計240秒。付録2枚は4分の読み上げに含めない。自動送りは設定せず、発表者が操作する。

## 必須要素の対応表

| 必須要素 | 対応スライド | 表現と確認内容 |
| --- | --- | --- |
| 1. おいとまをどのように使用したか | 4（補足9） | 文章＋通信図＋5段階図。生成開始時のextract・catalog・rank・summary、必要時の再rank、確認画面の別案呼び出しをノートに記載 |
| 2. 入力から出力までの主要フロー | 3・4 | Forms回答Excel→取り込み→生成→確認・修正→A4印刷。生成の内部は話題抽出→候補化→順位→人数調整→要約 |
| 3. 技術的な工夫と選択理由 | 5 | AI一括割り当ての比較案とAI＋コードの採用案を図示。数の検証、偏りの調整、上限が目安であるトレードオフを説明 |
| 4. 学内AIで個人情報をセキュアに扱う意義 | 6（条件は10） | 学内AIの意義を文章で強調。名前欄の除外・同意の扱い・ブラウザ保存を実装と照合。ngrok経由では学外中継を通る点も表示 |

## 主張の扱いと制約

| 区分 | 使用する内容 | 表現の制限 |
| --- | --- | --- |
| 実装で確認 | AIとプログラムの役割分担、送信データの組み立て、JSON検証と再試行、途中再開、1人追加、ブラウザ保存、印刷 | 実装済みと表現できる。外部サービスの稼働を証明するものではない |
| 今回実行で確認 | `npm test`：17ファイル98テスト成功 | テスト成功を示す。live接続や実紙印刷の成功を意味しない |
| 過去の検証記録 | 2026-10-12の基本9＋追加9のモック受け入れ確認、40人120枚・A4 5ページのPDF検査 | 日付・mock・PDFを明示。当日の新規実演結果と混同しない |
| 仕様・運用文書 | おいとまが学内AIであること、学内／OU-VPN接続、2026-10-14のngrok運用、学習利用しない旨の仕様記述 | 実稼働・契約条件の検証とは分ける。原本のおいとまマニュアルは提供されていない |
| 説明用の架空例 | カレー・ラーメンの回答とタグ | スライド2に「説明用の架空例」と表示。実出力・実回答と呼ばない |
| 設計上の比較 | AIに最終割り当てまで一括依頼する案 | 未実装の比較案と表示。比較実験・精度差・速度差は主張しない |
| 今後の検証 | 実会場の会話促進効果、liveの応答時間と品質、実紙位置合わせ、ngrok認証の稼働 | 成果数値を作らず、未評価・資料から確認できないと説明する |

特に、旧仕様の「回答は学内から出ない」「Vercelに公開トップだけを置く」は、2026-10-14のngrok方針を説明する図には採用しない。外部利用の回答はngrokを通過する。アプリに認証が組み込まれているとは説明しない。

仕様は共有タグの下限保証を強く記載するが、実装の不足補充では採用タグを再追加し、再rank後にも不足すれば人数で補う経路がある。本編では「少人数の候補を外す」「人数を調整する」と説明し、全経路に対する厳密な下限保証は主張しない。上限は目安であり、厳密制約ではない。

名前欄を除外しても、所属や自由記述から個人が推定される場合があり、自動匿名化ではない。同意列のないExcelを全員同意として扱うデモ仕様があるため、実回答運用では同意列の割り当て確認が必要。localStorageやバックアップの暗号化機能は資料から確認できない。おいとまの保存期間・アクセス制御・学習利用の実条件は、提供されていない原本規程の確認が必要。スライド6の「セキュアに扱う」は設計の目的と実装対策を示し、無条件の安全保証にはしない。

## 参照資料一覧

- `README.md`：アプリ概要、操作手順、接続モード、2026-10-14の運用方針。
- `docs/spec.md`：概要とスコープ／技術スタックと全体構成／状態の保存／回答の取り込み／タグ生成パイプライン／おいとま連携／話題シールのデザインと印刷／個人情報の扱い。
- `docs/SPEC-ADD-1.md`：何を作るか／データと処理／1人分の生成／個人情報／確認。
- `docs/DECISIONS.md`：実装判断、モード設定、統合検証、2026-10-14の公開方針、2026-10-15のタグ品質調整。
- `docs/PRESENTATION-TAG-GENERATION.md`：役割分担、架空例、質疑補足。
- `docs/ACCEPTANCE-2026-10-12.md`：検証環境、基本9＋追加9の受け入れ結果、未検証範囲。
- `docs/NGROK.md`：構成と準備／認証ポリシー／本物のおいとまへの切替／別端末での保存と運用。
- `package.json`：実際のライブラリ・バージョン・テストコマンド。
- `src/config/event.ts`：アプリ名、8人・15人のバッチ、同時3件、人数範囲、24面印刷設定。
- `src/lib/import/{forms,manual,normalize}.ts`：Excel解析、列選択、同意なしの自由記述除外、入力整形。
- `src/lib/pipeline/{run,llm-api,sticker,add-one,operation}.ts`：生成、HTTP連携、出力、追加、実行管理。
- `src/lib/{assign,sizing,metrics,store,state-schema,publish,admin}.ts`：人数調整、指標、保存・復元、公開データ、管理機能。
- `src/lib/llm/{client,tasks,prompts,schemas,limiter}.ts`：API通信、JSON検証、文面指示、再試行、実行制限。
- `src/app/api/llm/{extract,catalog,rank,summary,regenerate}/route.ts`：API入力検証、中継、本文を含めないログ。
- `src/app/admin/{generate,review,print,import,data}/page.tsx`：生成開始、編集・別案、印刷、追加、バックアップ。
- `src/components/{Sticker,StickerSet,StickerSheet}.tsx`：3枚のシールと印刷配置。
- `src/lib/pipeline/add-one.test.ts`、`src/lib/assign.test.ts`、ほか計17テストファイル：今回成功した98テスト。
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`：このリポジトリに同梱されたNext.jsのAPIルートガイド。

外部サイトの閲覧、実回答の送信、本物のおいとまのAPI呼び出しは行っていない。

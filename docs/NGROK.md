# ngrokで管理画面を利用者限定で公開する手順

作成日：2026-10-11。対象：このリポジトリのNext.jsアプリ。ユーザーの希望に合わせ、**公開トップ、管理画面、生成APIをまとめてGoogle認証で保護し、指定したメールアドレスだけに許可する**。以下は実行用の手順であり、今回のレビューではトンネルを開設していない。

## 1. 構成と準備

```text
許可された人のブラウザ
  → HTTPSのngrok URL（認証・許可メールの照合）
  → 主催者PCのngrokエージェント
  → http://127.0.0.1:3000 のNext.js
  → 学内のおいとま（live時）
```

サーバーPCにはNode.js 22.9以上、npm、ngrok CLIを入れる。live時はサーバーPCを学内ネットワークかOU-VPNにつなぐ。利用者側の端末は、ngrok URLに接続できればよい。

アプリは現在ログイン機能を持たないため、ngrokで認証する。全員に公開するQRページが別に必要なら、管理用のこのURLとは別の公開先を用意する。この手順では `/` やサンプルファイルも認証対象になる。

公開前に [実装レビュー](IMPLEMENTATION-REVIEW.md) の修正結果と未検証事項を確認し、対象PCで `npm run verify` を通す。追加仕様A2・A3は実装済みで、手入力の1人追加・追加分の印刷を利用できる。

## 2. ngrokをインストールしアカウントを登録する

使うOSに合わせて [ngrok公式ダウンロード](https://ngrok.com/download) からインストールし、ngrokアカウントを作成する。ターミナルで確認する。

```bash
ngrok version
```

[ダッシュボードのAuthtoken](https://dashboard.ngrok.com/get-started/your-authtoken) を取得し、自分の端末で登録する。下の仮の文字列は実際の値に置き換える。

```bash
ngrok config add-authtoken "YOUR_NGROK_AUTHTOKEN"
```

AuthtokenはおいとまのAPIキーとは別物。どちらもリポジトリ、チャット、画面写真に載せない。ngrokの登録は一度行えばよい。[公式Quickstart](https://ngrok.com/docs/share-localhost/quickstart)

利用を許可する人のGoogleアカウントのメールアドレスを用意する。組織全体のドメインを許可するより、今回使う人を個別指定する。

無料プランのOAuth/OIDC利用者は、公式文書上は月3人まで。通信量は月1GB、HTTPリクエストは月20,000回。アプリの資産取得もリクエスト数を使うため、参加人数と利用量を [Usage](https://dashboard.ngrok.com/usage) で確認し、必要なら対応するプランを選ぶ。無料プランではアカウントに割り当てられた開発ドメインを使う。[公式の無料プラン制限](https://ngrok.com/docs/pricing-limits/free-plan-limits)

## 3. アプリをローカルで準備する

画面・印刷の完成版は `ui`、生成・保存の基盤と文書は `main` で管理する。公開するアプリには基盤を取り込んだ `ui` を使う。プロジェクトのフォルダで切り替えてから実行する。

```bash
git switch ui
npm ci
```

`.env.local` がまだない場合だけ、`.env.example` をコピーする。既存の設定は上書きしない。

macOS/Linux：

```bash
cp .env.example .env.local
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

最初は `.env.local` に `LLM_MODE=mock` を指定し（ひな形の該当行のコメントを外す）、ダミーだけを使って接続と操作を確認する。

管理画面の公開では **`VERCEL=1` を設定しない**。このアプリはその値が1なら管理画面とAPIを404にする。以前Vercel相当の確認をしたシェルなら、その変数を解除する。

macOS/Linux：

```bash
unset VERCEL
npm run verify
npm start
```

Windows PowerShell：

```powershell
Remove-Item Env:VERCEL -ErrorAction SilentlyContinue
npm run verify
npm start
```

`verify` が失敗した場合は、起動せず原因を直してから続ける。`npm start` はターミナルを開いたままにする。別のターミナルで次を確認する。PowerShellでは `curl` の代わりに `curl.exe` と書く。

```bash
curl -i http://127.0.0.1:3000/api/health
```

成功時は200で `mode: "mock"` が返る。ブラウザで `http://127.0.0.1:3000/admin/import` を開き、ダミー40人を読み込めることも確認する。

`dev` と `start` は既に127.0.0.1だけで待ち受ける。ngrokもこのPCで動かすので、0.0.0.0への変更、LANへの公開、ルーターのポート転送は不要。サーバーPCのスリープを止め、電源とネットワークを維持する。

## 4. 認証と許可ユーザーの設定ファイルを作る

プロジェクト内の `private/` フォルダに `ngrok-policy.yml` を作り、次を保存する。`private/` は既にgitの除外対象。

```yaml
on_http_request:
  - actions:
      - type: oauth
        config:
          provider: google
  - expressions:
      - "!(actions.ngrok.oauth.identity.email in ['organizer@example.com', 'reviewer@example.com'])"
    actions:
      - type: deny
        config:
          status_code: 403
```

例のメールアドレスを、実際に許可するGoogleアカウントのアドレスに置き換える。使わない例のアドレスは残さない。認証に成功しても、一覧にないメールは403で拒否される。ルールにパス条件を付けず、APIと静的ファイルを含む全リクエストに適用する。[公式OAuth設定とメール制限](https://ngrok.com/docs/gateway/traffic-policy/actions/oauth)

この例はデモ用にngrokのGoogle認証を使う。継続的な本番運用では、自分の認証アプリや組織の認証方式を選定する。大学のアカウントがGoogleで使えない場合は、この設定のままでは利用できないため、公式OAuth/OIDCの対応先に合わせて別途設定する。

## 5. 認証付きトンネルを起動する

アプリのターミナルを動かしたまま、別のターミナルを同じプロジェクトのフォルダで開く。

```bash
ngrok http http://127.0.0.1:3000 --traffic-policy-file private/ngrok-policy.yml --inspect=false
```

CLIの表示で `Forwarding` のHTTPS URLを確認する。割り当てURLを明示する場合は、アカウントで利用できるドメインに限り `--url https://YOUR_ASSIGNED_DOMAIN` を付ける。昔の `--oauth` や `--domain` フラグは非推奨なので使わない。[公式CLI](https://ngrok.com/docs/gateway/agent/cli)

認証設定がエラーになった場合は設定を直す。認証設定を外して起動して続行しない。ngrokはPCで待ち受けるアプリに転送するため、`127.0.0.1` 待ち受けでもngrok経由の外部アクセスは届く。

## 6. URLを共有する前にアクセス制限を確認する

スマホのモバイル回線、または別のネットワークのPCで試す。

| 操作 | 期待する結果 |
| --- | --- |
| 未ログインのシークレットウィンドウで `/admin/import` を開く | Google認証に進み、直接管理画面が表示されない |
| 許可リストにないGoogleアカウントでログイン | 403になり、画面を使えない |
| 許可したアカウントでログイン | 管理画面を使える |
| 未認証で `/api/health` を開く | 認証を要求され、アプリのJSONが直接返らない |
| 未認証で `/api/llm/extract` にPOSTする | 認証で遮断され、生成されない |
| 許可ユーザーがサンプル40人を読み込み、生成する | mockで完了し、確認・保存画面へ進める |
| 許可ユーザーが印刷プレビューを開く | 操作した端末で印刷画面が開く |

未認証の確認には次も使える。実際のURLに置き換え、PowerShellでは `curl.exe` を使う。

```bash
curl -i -H "ngrok-skip-browser-warning: 1" https://YOUR_ASSIGNED_DOMAIN/api/health
curl -i -H "ngrok-skip-browser-warning: 1" -H "Content-Type: application/json" --data '{}' https://YOUR_ASSIGNED_DOMAIN/api/llm/extract
```

このヘッダーは無料プランの案内画面を省くだけで、OAuthの認証を省くものではない。未認証ならログインへのリダイレクト等で遮断されることを確認する。後者がアプリの400 `{ error: 'bad_request', ... }` を返す場合も、認証が効いていないので公開を止めて設定を調べる。

無料プランでは初回アクセス時にngrokの案内画面が表示される場合がある。ブラウザでは「Visit Site」等を押して認証へ進む。これはアプリのエラーではない。[公式の案内画面の説明](https://ngrok.com/docs/pricing-limits/free-plan-limits)

## 7. 本物のおいとまに切り替える

mockの操作確認が終わったらアプリをCtrl+Cで止め、サーバーPCを学内ネットワークかOU-VPNにつなぐ。`.env.local` の `LLM_MODE=mock` を削除またはコメントに戻し、次の接続設定を手元で入力する。接続先があれば自動でliveになる。

```dotenv
OITOMA_BASE_URL=手元のおいとまマニュアルにある接続先
OITOMA_API_KEY=手元で発行したキー
OITOMA_MODEL=qwen3.8-27b-it
```

接続先は末尾に `/chat/completions` を付けない。ほかの環境変数は `.env.example` の既定を使い、接続確認の結果に合わせて調整する。

```bash
npm run llm:check
npm start
```

シェルに `LLM_MODE=mock` が残っていると `.env.local` より優先されるため、先に解除する。PowerShellなら `Remove-Item Env:LLM_MODE -ErrorAction SilentlyContinue`、macOS/Linuxなら `unset LLM_MODE`。接続確認が失敗したら原因を直してからliveで起動する。アプリ側の環境変数は再起動で反映され、変更していないコードの再ビルドは不要。

まず取り込み画面の「サンプル（15人）で試す」または「サンプル（40人）で試す」で、本物のおいとまへの生成、応答時間、タグの内容を確認する。

外部ブラウザのAPI通信はngrokを経由するため、基本仕様の「回答は学内から出ない」という前提は変わる。実回答を使う前に、運用文書と参加者への説明を外部通信の構成に合わせる。おいとまのキーはNext.jsサーバーに置き、利用者のブラウザには配らない。

リクエスト本文を残さないため、上のコマンドではローカルのHTTP検査を `--inspect=false` にしている。さらにngrokダッシュボードのTraffic Inspectorで **Full Captureを有効にしない**。ローカルの検査設定とクラウドの保存設定は別に確認する。ngrok公式は通常の通信内容は保存せず、Full Captureを有効にすると本文・ヘッダーを保存すると説明している。[ngrokのデータ取り扱い](https://ngrok.com/security)

## 8. 別の端末で作業するときの注意

参加者と生成結果は、サーバーではなく **操作したブラウザのlocalStorage** に保存される。`http://127.0.0.1:3000` と `https://…ngrok…` は別の保存場所。端末・ブラウザ・通常/シークレットの違いでも共有されない。

主催者PCの作業を別の端末に移すときは、元のブラウザの「保存・バックアップ」で「作業データを保存」し、許可した相手に安全に渡して、相手のブラウザで「保存した作業データを開く」。作業データは名前と回答を含むので、公開用 `published.json` と取り違えない。シークレットウィンドウは終了前に必要な成果を保存する。

複数ユーザーが同時に生成しても、各リクエストの入力・出力は独立する。サーバー全体の同時実行は既定3件、待機は最大60件・120秒で、満杯・待機期限切れは混雑として表示される。`.env.local` の `OITOMA_MAX_CONCURRENT`、`OITOMA_QUEUE_LIMIT`、`OITOMA_QUEUE_TIMEOUT_MS` で調整し、変更後は再起動する。`npm start` は1つだけ起動する。この制限は1つのNode.jsプロセス内で共有するため、複数プロセス・複数サーバーに増やす場合は共通のキューが必要になる。

複数人が同じバックアップを開いても、編集は同期・統合されない。同じ名簿の最終版を作る担当は1人に決め、必要な修正をその担当へ集める。印刷も、操作した端末で利用できるプリンタに対して行う。遠隔操作から主催者PCのプリンタへ自動印刷する機能はない。

公開トップは `src/data/published.json` を読む。内容を更新するときは、公開用ファイルでこれを置き換え、アプリを止めて `npm run build` が成功した後に `npm start` する。ngrok運用ではGitへのpushだけでは更新されない。

## 9. 停止・変更・復旧

公開を終了するときは、先にngrokのターミナルでCtrl+Cを押す。その後にアプリをCtrl+Cで止める。端末のブラウザに残した実回答は、必要なバックアップを確保してから「このPCからデータを消す」で消す。

許可ユーザーを変更するときは、ngrokを止めて `private/ngrok-policy.yml` を編集し、同じ認証付きコマンドで再起動する。再び許可外アカウントの403を確認する。ログアウトはngrok URLの `/ngrok/logout` を開くが、ブラウザに残るアプリの作業データは別途消す。Googleや管理されたChromeのログイン状態が残る場合は、共有端末ではシークレットウィンドウを閉じる。[公式ログアウトの説明](https://ngrok.com/docs/gateway/traffic-policy/actions/oauth)

| 症状 | 確認すること |
| --- | --- |
| ngrokの接続先エラー | 同じPCで `npm start` が動き、127.0.0.1:3000を開けるか。別ポートで起動した場合は転送先も合わせる |
| 管理画面やAPIが404 | `VERCEL=1` が残っていないか。解除後、アプリを再起動する |
| 認証後に403 | ログインしたGoogleのメールが許可リストと一致するか |
| プラン制限のエラー | OAuth利用者数、リクエスト数、通信量をUsageで確認する |
| おいとまに接続できない | 利用者側ではなく、サーバーPCの学内/VPN接続、キー、モデルを確認する |
| 別端末でデータが空 | 保存場所が別。必要なら作業データを保存して読み込む |
| 混雑と表示される | 少し待って「続きから作る」または「もう一度試す」。サーバーの設定と利用人数を確認する |
| 生成が入力エラーで止まる | 候補数4〜40、下限2以上、対象人数6〜300と詳細設定を確認する |
| 印刷がずれる | 全24枠の試し刷りで、余白なし・倍率100%、位置とすき間の補正、対象プリンタを確認する |
| 公開中にPCがスリープした | PCとアプリ、ngrokを復帰・再起動し、認証とURLを確認する |

問題が出たら、まず公開を止め、保存した作業データとダミーで原因を確認する。

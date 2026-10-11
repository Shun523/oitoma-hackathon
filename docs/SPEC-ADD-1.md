# #おいとま使ってます 追加仕様書（段階9：その場で1人追加）

Oct 11, 2026 · @しーたけ

## 使い方

**この追加仕様書は、段階8（`docs/SPEC.md`）とU0〜U7（`docs/UI.md`）まで終わったアプリに「その場で1人追加」を足すためのもの。** 実装はこれまでと同じくOpenCode上のMuse Spark 1.3が行い、A1〜A3の3段階で進める。

### 前提

- `docs/SPEC.md` の段階0〜8と、`docs/UI.md` のU0〜U7がコミット済みで、`npm run verify` が通る。
- 画面は `docs/UI.md` の部品とクラスで作る。新しい色・ライブラリは足さない。足してよい部品は、アイコン `IconUserPlus` の1つだけ（「画面」の節）。
- 元の仕様書と食い違うところは、この追加仕様書を優先する。食い違うのは次の4か所。

| 元の仕様書の記述 | この追加での扱い |
| --- | --- |
| SPEC.md「作らないもの」の「アプリ内の回答フォーム」 | 参加者が自分のスマホで答える公開フォームのこと。今回の手入力は管理画面の中で運営（と体験する審査員）が使う。公開トップとVercelには何も足さない |
| SPEC.md・UI.md 確認・修正の「最初に開いたときに選ぶ人」 | URLに `?id=` があれば、その人を最初に選ぶ |
| SPEC.md 印刷の「並びは取り込み順で全員」 | 印刷する人を「手入力で追加した人だけ」にも切り替えられる |
| UI.md「変えないもの」（`src/lib/`、データの形、`StickerSheet`） | `src/lib/` に関数を足し、`Participant` に省略できる項目を2つ足す。SHOULDの「刷り始める段」を作るときだけ `StickerSheet` を変える。シール1枚の見た目は変えない |

### エージェントへの渡し方

1. 人がこの仕様書をMarkdownで書き出し、`docs/SPEC-ADD-1.md` として置いてコミットする。
2. 指示文は「実装の段階と完了条件」の最後にある。A1から1つずつ進め、段階ごとに `npm run verify` を通してコミットし、止まってもらう。
3. A1で、エージェントが `AGENTS.md` の先頭に「追加の機能は docs/SPEC-ADD-1.md に従う」と1行足す。

### 必ず守ること（元の仕様書と同じ）

- 参加者の**名前はおいとまに送らない**。手入力で追加した人も同じ。
- おいとまのAPIキーと実際の回答を、コード・コミット・エージェントへの指示文に書かない。
- サーバーに参加者データを保存しない。手入力の内容も、このPCのブラウザの中だけに置く。

## 何を作るか

**取り込み画面に「1人分を手入力で追加」タブを足す。タグを作った後に追加したときは、その人の分だけおいとまでタグを作り、ほかの人のタグは変えない。** 審査員はその場で自分の回答を入れ、おいとまの呼び出し2回分の待ちで自分のシール3枚を見られる（実際の秒数は学内で測る）。

### 審査員の体験（発表の後や質疑のとき）

1. 発表用PCのシークレットウィンドウで、体験用の作業データ（ダミー15人、タグ作成済み）を開く。
2. 「回答を読み込む」の「1人分を手入力で追加」で、審査員が名前・自己紹介・最近ハマっていることを入れる。
3. 「追加してタグを作る」を押すと、話題の読み取りと共有タグ選び（どちらもおいとま）、割り当て（プログラム）が順に進み、その人のシール3枚が出る。
4. 共有タグごとに「同じタグの人」が並ぶので、会場で誰と話せばいいかが分かる。
5. 「確認・修正で見る」で、ビフォー・アフターと「おいとまに別案を出してもらう」も試せる。

### 本番での使い道：当日の飛び入り参加

申し込みのない人や、締め切り後に来た人も、受付でその場で追加してシールを刷れる。すでに刷った人のタグは変わらないので、配り直しは要らない。発表では、審査基準の「実現性・発展性」を説明する材料になる。

## 範囲

**MUSTは8つで、どれも今ある部品とおいとまの呼び出し（extract、rank）の組み合わせで作れる。新しいAPIルートとプロンプトは足さない。** 優先度の表記は元の仕様書と同じ（MUST＝必ず、SHOULD＝MUSTが動いてから）。

| 機能 | 優先度 | 置き場所 |
| --- | --- | --- |
| 取り込み画面の「1人分を手入力で追加」タブと入力フォーム | MUST | `/admin/import` |
| タグを作る前の追加（参加者に足すだけ。あとで他の人と一緒にタグを作る） | MUST | `/admin/import` |
| タグを作った後の追加（その人だけおいとまで作る。ほかの人は変えない） | MUST | `/admin/import`、`src/lib/pipeline/add-one.ts` |
| 結果の表示（シール3枚、同じタグの人） | MUST | `/admin/import` |
| 手入力で追加した人の一覧 | MUST | `/admin/import` |
| 体験用サンプル15人（xlsxとボタン） | MUST | `public/samples/sample-15.xlsx`、`/admin/import` |
| 確認・修正画面：`?id=` でその人を選ぶ、「手入力」のバッジ | MUST | `/admin/review` |
| 印刷画面：印刷する人を「手入力で追加した人だけ」に切り替える | MUST | `/admin/print` |
| 印刷画面：刷り始める段（使いかけのラベル用紙に刷る） | SHOULD | `/admin/print`、`StickerSheet` |
| 手入力で追加した人を取り消す | SHOULD | `/admin/import` |

### 作らないもの

- 参加者が自分のスマホで答える公開フォーム。公開トップとVercelは変えない。
- 追加した人に合わせた共有タグの作り直しや、新しい共有タグ。追加した人は、今ある採用タグから選ぶ。
- 一覧からの名前・回答の編集。間違えたら取り消して入れ直す（SHOULDがなければ、確認・修正でタグだけ直す）。
- おいとまに届かないときの代わりのタグ。失敗したら何も変えずにエラーを出す。
- 会場の傾向まとめの作り直し。

## 画面

**取り込み画面に `Segmented` で「Excelから読み込む」「1人分を手入力で追加」を並べ、手入力のタブに「入力」「この人のシール」「追加した人の一覧」の3枚のカードを縦に置く。** 確認・修正と印刷は、追加した人を見つけやすくする小さな変更だけ。部品、入力欄のクラス、エラー文の置き換えは `docs/UI.md` のとおりに使う。

### 取り込み画面（`/admin/import`）の並び

```text
PageHeader  step=1 「回答を読み込む」（今のまま）
Notice info「40人分を読み込み済みです」（今のまま。読み込んだ回答があるとき）
[ Excelから読み込む | 1人分を手入力で追加 ]   ← Segmented

（手入力のタブ）
+-- カード：1人分を手入力で追加 -------------------------------+
| 当日の飛び入り参加や、その場で試してもらうときに使います。            |
| お名前 [必須] [            ]   所属 [                    ]       |
| 区分 [その他 v]                                                   |
| 自己紹介（任意）[                                     ] 0/400  |
| 最近ハマっていること（任意）[                         ] 0/100  |
| [x] 名札への掲載に同意しています                                 |
| (i) タグはもう作ってあります（タグを作った後だけ）                |
|                                       [追加してタグを作る]      |
+------------------------------------------------------------------+
+-- カード：〇〇さんのシール（タグを作った後に追加したとき）----------+
| (1) 話題の読み取り   [おいとま]   完了   4秒                      |
| (2) 共有タグを選ぶ   [おいとま]   実行中                           |
| (3) 割り当て         [プログラム] 待機中                           |
| （できたら）シール3枚 / 同じタグの人 / ボタン                        |
+------------------------------------------------------------------+
+-- カード：手入力で追加した人（2人）-----------------------------+
| 名前 | 追加した時刻 | 個性タグ | 共有タグ | 操作                      |
+------------------------------------------------------------------+
PageFooter（今のまま）
```

### タブの切り替え（`Segmented`）

- 置き場所は `PageHeader` の下。読み込み済みの `Notice` があれば、その下。
- 項目は「Excelから読み込む」「1人分を手入力で追加」。件数は付けない。
- 最初に選ぶタブ：URLに `?tab=manual` があれば手入力、なければExcel。切り替えたら `router.replace` で `?tab=` を書き換える（再読み込みしても同じタブになる）。
- Excelのタブの中身は今のまま。ただしサンプルのボタンを「サンプル（15人）で試す」「サンプル（40人）で試す」「サンプル（200人）で試す」の3つにする。
- Excelのファイルを選んで列の割り当てをしている途中でも、タブは切り替えられる。そのとき、選んだファイルの中身は画面の中に残しておく（戻ると続きから選べる）。

### カード1：入力（「1人分を手入力で追加」）

- 外枠は `Card` に `flex flex-col gap-4 p-5`。先頭に `CardTitle`「1人分を手入力で追加」、その下に `text-adm-sm text-adm-ink2` で「当日の飛び入り参加や、その場で試してもらうときに使います。名前はおいとまに送りません。」
- 入力欄は `<form>` に入れ、`grid gap-4 sm:grid-cols-2` で並べる。自己紹介、最近ハマっていること、同意は2列分の幅（`sm:col-span-2`）。
- 入力欄とラベルのクラスは UI.md「入力欄」のとおり。文字数はラベルの行の右端に `text-adm-xs text-adm-sub` で「{n}/400」のように出す。

| 項目 | 部品 | 決まり | placeholder |
| --- | --- | --- | --- |
| お名前 | `input type="text"`、`maxLength={30}` | 必須。ラベルの横に `Badge tone="danger"`「必須」 | 例：岡山 花子 |
| 所属 | `input type="text"`、`maxLength={40}` | 任意 | 例：工学部 情報系 |
| 区分 | `select` | 学生／教員／職員／企業／自治体／その他。既定は「その他」 |  |
| 自己紹介 | `textarea rows={3}`、`maxLength={400}` | 任意。右に「{n}/400」 | 例：発酵食品の成分を分析しています。休日はパンを焼きます。 |
| 最近ハマっていること | `input type="text"`、`maxLength={100}` | 任意。右に「{n}/100」 | 例：岡山のパン屋めぐり |
| 掲載への同意 | `input type="checkbox"` | 既定オン。文言「名札への掲載に同意しています」 |  |

- 同意をオフにしたとき：チェックボックスの下に `text-adm-xs text-adm-warn-ink` で「同意がないと、自己紹介と一言は使わず、所属と区分からタグを作ります。」
- 同じ名前の人がすでにいるとき（前後の空白を除いて一致）：ボタンの上に `Notice tone="warn"`、title「同じ名前の人がいます」、本文「このまま追加できます。シールで見分けられるよう、所属も入れてください。」追加は止めない。
- タグを作った後のとき（「データと処理」の分け方）：ボタンの上に `Notice tone="info"`、title「タグはもう作ってあります」、本文「この人の分だけおいとまでタグを作ります。ほかの人のタグは変わりません。」
- ボタンはカードの右下（`flex justify-end`）に1つだけ。

| 状態 | ボタン | 押したとき |
| --- | --- | --- |
| タグを作る前 | primary md「追加する」（`IconUserPlus`） | 参加者に足す → `showToast('{名前}さんを追加しました')` → フォームを空に戻す |
| タグを作った後 | primary md「追加してタグを作る」（`IconSparkle`） | カード2を出して、1人分の生成を始める |

- 押せない（`disabled`）とき：名前が空白だけ、1人分の生成の実行中か結果の表示中（カード2が出ている）、タグを作る処理の実行中（「データと処理」の分け方）、参加者が300人。ボタンの左に `text-adm-sm text-adm-sub` で理由を出す：300人なら「300人までです。」、タグを作る処理の実行中なら「タグを作っている途中です。終わってから追加してください。」
- 空に戻すときは、区分を「その他」、同意をオンにし、お名前の欄にフォーカスを戻す。
- タグを途中まで作った状態（中止やエラー）は「タグを作る前」と同じ扱い。タグを作る画面の「続きから作る」で、追加した人の分も作られる（今の「続きから」の決まりのまま）。

`IconUserPlus` は `src/components/ui/icons.tsx` に、ほかのアイコンと同じ形で足す：`<circle cx="9" cy="8" r="4" />`、`M2 21v-1a7 7 0 0 1 14 0v1`、`M19 8v6M16 11h6`。`/admin/ui` の見本ページにも並べる。

### カード2：この人のシール（タグを作った後に追加したときだけ）

- 「追加してタグを作る」を押したら、カード1の下に出す。外枠は `Card` に `flex flex-col gap-4 p-5`。`CardTitle` は実行中「{名前}さんのタグを作っています」、できたら「{名前}さんのシール」。
- **進み具合**：3行の `<ol className="flex flex-col">`。行の作りはタグを作る画面の「進み具合」と同じクラス（丸い番号、名前と担当バッジ、右に状態と経過秒）。件数と進み具合のバーは出さない（1人分なので）。

| 番号 | 名前 | 担当 |
| --- | --- | --- |
| 1 | 話題の読み取り | `Badge tone="oitoma"`「おいとま」 |
| 2 | 共有タグを選ぶ | `Badge tone="oitoma"`「おいとま」 |
| 3 | 割り当て | `Badge tone="neutral"`「プログラム」 |

- **できたとき**（進み具合の下に、上から順に）
  1. `Notice tone="success"`、title「シールができました（{秒}秒）」、本文「ほかの人のタグは変わっていません。」秒は押してからできるまでを小数なしで。
  2. シール3枚：`FitToWidth` の中に `StickerSet`（印刷と同じ見た目。用紙は `printOptions.preset`）。
  3. 「同じタグの人」（小見出し `text-adm-sm font-bold text-adm-ink2`）：共有タグごとに1行。行は `flex flex-wrap items-center gap-2` で、`TagChip kind="shared"`、`text-adm-sm text-adm-sub` の「会場に{n}人」（本人を含む）、本人以外のメンバーの名前チップを最大6人（確認・修正の共有タグタブと同じ `rounded-full bg-adm-field px-2 py-0.5 text-adm-sm`）、残りは「ほか{n}人」。
  4. ボタンの列（`flex flex-wrap gap-2`）：secondary md「確認・修正で見る」（`/admin/review?id={ID}` への `<Link>`）、secondary md「手入力で追加した人のシールを印刷」（`IconPrinter`、`/admin/print?only=manual` への `<Link>`）、primary md「続けてもう1人追加」。
- できたら、カード1のフォームを空に戻し、`disabled` のままにする（同じ人を2回追加しないため）。「続けてもう1人追加」でカード2を閉じ、フォームを使えるようにして、お名前の欄にフォーカスを当てる。
- **失敗したとき**：その行を「エラー」にし、進み具合の下に `Notice tone="danger"`。titleと本文は UI.md「エラー文の置き換え」のとおり。ただし429・5xxの本文は「数分待ってから「もう一度試す」を押してください。」にする。action に primary sm「もう一度試す」（今のフォームの内容で、「追加してタグを作る」と同じ処理を最初からやり直す）。**参加者は追加しない**。フォームの入力は消さず、使えるようにする。
- **実行中**は、フォームの入力欄とボタン、`Segmented` を `disabled` にする。中止ボタンは作らない。画面を離れたときは `AbortController` の `abort()` を呼び、何も保存しない（「データと処理」の「画面での流れ」）。

### カード3：手入力で追加した人

- 手入力で追加した人（`source === 'manual'`）が1人以上いるときだけ出す。外枠は `Card` に `overflow-hidden`、`CardToolbar` に `CardTitle`「手入力で追加した人（{n}人）」。
- 表の作りは確認・修正の表と同じクラス（`min-w` は `min-w-[600px]`）。並びは追加した順。

| 列 | 中身 |
| --- | --- |
| 名前 | 1行目に名前（`font-bold`）、2行目に「{ID}・{区分}」（`text-adm-xs text-adm-sub`） |
| 追加した時刻 | `addedAt` を「HH:mm」（`tabular-nums`） |
| 個性タグ | `TagChip kind="personal"`。まだなければ「—」（`text-adm-sub`） |
| 共有タグ | `TagChip kind="shared"` を並べる。まだなければ `text-adm-sm text-adm-sub`「タグを作るときに一緒に作ります」 |
| 操作（SHOULD） | secondary sm「取り消す」（`IconTrash`）。作らないときは列ごと出さない |

- 「取り消す」→ `ConfirmDialog`（title「{名前}さんを取り消しますか？」、body「この人の回答とタグを消します。ほかの人のタグは変わりません。」、confirmLabel「取り消す」、tone danger）→ 取り消したら `showToast('{名前}さんを取り消しました')`。

### 確認・修正画面（`/admin/review`）の変更

- URLに `?id=P041` のようにIDがあり、その人がいれば、その人を最初に選ぶ（今の「最初に開いたとき」の決まりより優先）。タブは「参加者」にし、その行を `scrollIntoView({ block: 'center' })` で見える位置に出す。絞り込み（確認が必要な人だけ、検索）は外した状態で開く。
- 手入力で追加した人は、「参加者」タブの名前セルの2行目（区分の後ろ）と、右の詳細の名前の下に `Badge tone="neutral"`「手入力」を付ける。

### 印刷画面（`/admin/print`）の変更

- 設定カードの一番上（「用紙」の上）に「印刷する人」。手入力で追加した人が1人以上いるときだけ出す。`Segmented` で「全員（{n}人）」「手入力で追加した人（{m}人）」。
- 最初の値は、URLが `?only=manual` で、かつ手入力で追加した人が1人以上いるときだけ手入力。それ以外は全員。この値は保存しない（`printOptions` に入れない）。
- プレビューと印刷は、選んだ人だけを取り込み順（IDの順）で並べる。
- 共有タグの下の「会場に{n}人」（人数を出す設定のとき）は、印刷する人の切り替えに関係なく全員で数える。
- プレビューの `CardTitle`「A4 {枚数}枚（{人数}人）」は、選んだ人で数える。枚数は実際に並べた用紙の数（刷り始める段を作ったときは `layoutRows(人数, 段数, 刷り始める段).length`）。
- SHOULD「刷り始める段」：「用紙」の下に、位置の調整と同じ形（secondary smの「−」、数字の入力欄、「＋」）で1〜段数、既定1。下に `text-adm-xs text-adm-sub`「使いかけのラベル用紙に刷るときは、空いている最初の段を選びます。」保存しない。用紙を変えて段数を超えたら、その用紙の段数に丸める。ボタンの `aria-label` は「刷り始める段を1つ上に」「1つ下に」。並べ方は「確認」の `sheet-layout.test.ts` の `layoutRows` を使う。
- 位置合わせ用の試し刷りは、印刷する人と刷り始める段に関係なく、今までどおり1枚分の外枠を全部描く。

## データと処理

**`Participant` に省略できる項目を2つ足し、タグを作った後の追加では「話題の読み取り → 当てはまり順 → 1人分の割り当て」をその人にだけ行う。保存するのは全部成功したときだけで、ほかの人の値と採用タグは変えない。** おいとまは今の `/api/llm/extract` と `/api/llm/rank` をそのまま使う（どちらも1人から受け付ける）。

### 「タグを作る前」と「作った後」の分け方

`generatedAt !== null && activeTagIds.length > 0` なら作った後。それ以外（まだ作っていない、途中で止まった）は作る前。この判定は `src/lib/state-ops.ts` の `isGenerated(state)` にまとめ、画面とストアの両方から使う。

タグを作る処理（`runGeneration`）の実行中は、どちらの追加もできないようにする（実行中の写しに追加した人が入らず、割り当てのない人ができるため）。ストアに保存しない実行中フラグがあればそれを使う。なければストアに `running: boolean` を足し（`partialize` で保存から外す）、タグを作る画面で処理の始めに true、終わり（完了・中止・エラー）に false にする。

### 型の変更（`src/lib/types.ts`）

```ts
export interface Participant {
  // …今までの項目はそのまま
  source?: 'forms' | 'manual'; // 手入力で追加した人だけ 'manual'。ないときは 'forms' とみなす
  addedAt?: string;            // 手入力で追加した時刻（ISO）
}
```

- どちらも省略できるので、これまでに保存した作業データもそのまま開ける。`appStateSchema` の Participant にも `.optional()` で足す。`version` は1のまま。
- Excelから読み込んだ人には付けない（`forms.ts` の出力は変えない）。

### 1人分の参加者を作る（`src/lib/import/manual.ts`）

```ts
export interface ManualInput {
  name: string; affiliation: string; category: Category;
  intro: string; hobby: string; consent: boolean;
}
export function nextParticipantId(existing: Participant[]): string;
export function makeManualParticipant(input: ManualInput, existing: Participant[], now?: Date): Participant;
```

- `nextParticipantId`：今あるIDの数字の部分の最大値に1を足し、3桁で `P` を付ける（`P040` まであれば `P041`、`P001` と `P003` なら `P004`、空なら `P001`）。人数ではなく最大値を使うのは、途中の人を取り消してもIDが重ならないため（最後に足した人を取り消すと同じIDがもう一度使われるが、消した人の値は残らないので問題ない）。
- `makeManualParticipant`：値は `forms.ts` の今の整え方のまま整える。名前と所属は、改行を空白にし、空白の連続を1つにし、前後の空白を除いて、30文字・40文字で切る。自己紹介は改行を空白にして400文字で切る。一言は100文字で切る。整える処理が `forms.ts` の中に埋まっていれば、`forms.ts` の出力が変わらない限り `src/lib/import/normalize.ts` に関数として切り出し、両方から使ってよい（`forms.test.ts` は通ったままにする）。
- 区分は選んだ値をそのまま使う（文字からの判定はしない）。
- 同意が false なら `intro` と `hobby` を `''` にする（Excelと同じ）。
- 整えた後の名前が空なら `new Error('名前を入れてください')` を投げる。
- `id` は `nextParticipantId(existing)`、`source: 'manual'`、`addedAt: (now ?? new Date()).toISOString()`。

### 1人分の共有タグを決める（`src/lib/assign.ts` に追記）

```ts
export function assignOne(input: {
  ranking: string[];              // おいとまの当てはまり順（候補ID）
  activeIds: string[];            // 採用タグ（候補の並び順）
  counts: Record<string, number>; // 今の各採用タグの人数（この人を含まない）
}): { sharedTagIds: string[]; usedFallback: boolean };
```

1. `ranking` のうち `activeIds` にあるものを、先頭から重複なしで2つまで取る。
2. 2つに足りなければ、まだ持っていない採用タグを「人数の少ない順、同数なら `activeIds` の並び順」で足し、`usedFallback: true` にする。`counts` にないタグは0人として扱う（`counts[id] ?? 0`）。
3. 上限（`maxSize`）は見ない。超えたら、確認・修正の「多すぎ」バッジで分かる。
4. 採用タグが1個しかなければ1個だけ返す（`usedFallback: true`）。

個性タグとフラグは、SPEC.md「シールの中身を決める」のとおりに今のパイプラインと同じ処理で作る（個性タグ候補の1つ目、なければ `EVENT.fallbackPersonalTag` と `fallback_personal`、`no_answer`、`no_consent`、個性タグか共有タグのラベルにNG語があれば `ng_word`、`usedFallback` なら `fallback_shared`、`edited: false`）。その処理が `run.ts` の中に埋まっていれば、`src/lib/pipeline/sticker.ts` に `buildAssignment(participant, extraction, sharedTagIds, usedFallback, candidates: SharedTag[]): Assignment` として切り出し、`run.ts` からも使う（`candidates` は `ng_word` の判定で共有タグのラベルを引くため。`run.test.ts` は通ったままにする）。

### 1人分の生成（`src/lib/pipeline/add-one.ts`）

```ts
export type AddStepKey = 'extract' | 'rank' | 'assign';

export async function generateForOne(args: {
  person: Participant;                     // まだストアに入れていない人
  candidates: SharedTag[];
  activeTagIds: string[];
  assignments: Record<string, Assignment>; // 今いる人の割り当て（人数を数えるためだけに使う）
  api: LlmApi;
  onStep: (key: AddStepKey, status: 'running' | 'done', ms?: number) => void;
  onLog: (log: LlmCallLog) => void;
  signal?: AbortSignal;
}): Promise<{ extraction: Extraction; ranking: string[]; assignment: Assignment }>;
```

1. **話題の読み取り**：`api.extract([toExtractInput(person)])`。`toExtractInput` は `run.ts` で段階1の入力を作っている処理を使う（関数になっていなければ切り出す）。**入力に名前を入れない。** 返らなかったとき（`missing`）は、段階1と同じ代わりの値にする（話題は一言の先頭15文字か区分名の1個、個性タグ候補は空、`source: 'fallback'`）。
2. **共有タグを選ぶ**：`candidates` のうち `activeTagIds` にあるもの（並びは `activeTagIds` の順）を渡して `api.rank(activeTags, [{ id, category, topics, hobby }], PIPELINE.rankLength)`。返らなかったときは `ranking` を `[]` にして次へ進む（`assignOne` が補う）。採用タグが2個未満のときは rank を呼ばず（APIがタグ2個以上しか受け付けないため）、`ranking` を `[]` にして `onStep('rank', 'running')` と `onStep('rank', 'done', 0)` を続けて出す。
3. **割り当て**：採用タグごとの人数を、`activeTagIds` の全部を0で始めてから `assignments` で数える。`assignOne` → `buildAssignment`（`candidates` も渡す）。

- 各段階の始めに `onStep(key, 'running')`、終わりに `onStep(key, 'done', ms)`。おいとまの呼び出しのたびに `onLog`（`task` は `'extract'` と `'rank'`）。
- `signal` は `runGeneration` と同じ使い方にし、`LlmApi` の形は変えない。各段階の前に `signal.aborted` なら `AbortError`（`new DOMException('aborted', 'AbortError')`）を投げる。
- `api` が例外を投げたら（502、通信エラー）、そのまま投げる。この関数はストアに触らない。
- ブラウザでは `httpLlmApi`、テストでは `directLlmApi`（モック）を渡す。

### ストアに足す操作（`src/lib/store.ts`）

操作の中身は、状態を受け取って新しい状態を返す純粋な関数として `src/lib/state-ops.ts` に書き、ストアからは `set((s) => applyXxx(s, ...))` の形で呼ぶ（テストできるようにするため）。

| 操作 | 純粋関数 | 中身 |
| --- | --- | --- |
| `addParticipant(p)` | `applyAddParticipant` | 作る前用。`participants` の末尾に足すだけ。生成結果は消さない（`setParticipants` とは違う） |
| `addLatecomer({ participant, extraction, ranking, assignment })` | `applyAddLatecomer` | 作った後用。`participants` の末尾、`extractions[id]`、`rankings[id]`、`assignments[id]` を1回で入れる。ほかの人の値、`candidates`、`activeTagIds`、`params`、`summary`、`progress`、`generatedAt` は変えない |
| `removeManualParticipant(id)`（SHOULD） | `applyRemoveManual` | `source === 'manual'` の人だけ。`participants` から除き、`extractions`・`rankings`・`assignments` からそのIDを消す。ほかは変えない |

- 守り：`applyAddParticipant` は `isGenerated` が true のとき、`applyAddLatecomer` は false のとき、何もしない（状態をそのまま返す）。どちらも、同じIDの人がいるときと、参加者が300人に達しているときは何もしない。画面では、こうなる前にボタンを押せなくしている。
- 指標は今までどおり毎回計算するので、追加すると確認・修正の数字カードが変わる。

### 画面での流れ（タグを作った後に追加するとき）

1. 「追加してタグを作る」で `makeManualParticipant` を呼ぶ。ここではまだストアに入れない。
2. `AbortController` を作り、`generateForOne` を呼ぶ。`onStep` でカード2の3行を動かし、`onLog` で `appendLlmLog` を呼ぶ。画面を離れたら（`useEffect` の後片付け）`abort()` を呼ぶ。
3. 返ってきたら、まず `signal.aborted` を確かめる。true なら何もしない。false なら `addLatecomer` でまとめて入れ、カード2に結果を出す。
4. 失敗したら何も入れず、カード2にエラーを出す（`AbortError` のときは何も出さない。呼び出しの記録 `llmLog` だけは残ってよい）。これで「タグを作った後は、全員に割り当てがある」という今の前提が崩れない。

### 個人情報

- おいとまに送るのは、今と同じくID・所属・区分・自己紹介・一言・話題の要素だけ。名前は送らない。
- 手入力の内容も、このPCのブラウザ（localStorage）の中だけに残る。サーバーのログには、今と同じく件数と時間だけを出す。
- 公開ページ用のファイルを書き出すと、追加した人も入る。「名前を伏せる」の既定オンはそのまま。

## 体験用ダミー回答

**ダミー15人の `public/samples/sample-15.xlsx` を足し、取り込み画面に「サンプル（15人）で試す」を置く。** 審査員の体験では、これを人が学内のおいとまで生成しておいた作業データを使う。15人なら生成も短く、「同じタグの人」も一目で読める。

- `scripts/make-samples.ts` で、`src/data/sample-participants.ts` の40人から15人を選んで書き出す。新しい人は書かない。列の形は40人・200人と同じ。
- 選び方（話題が重なるように）：飲食店めぐり3、運動3、コーヒー・カフェ2、ゲーム2、AIを使った作業2、旅行・キャンプ1、堅い自己紹介の人2（SPEC.mdの例の「腸内細菌叢…」「発酵食品…」の人がいればその2人）。
- 15人とも自己紹介と一言の両方があり、同意あり。区分は学生・教員・職員・企業をそれぞれ1人以上入れる。
- この条件を全部満たせないときは、話題が近い人で置き換える。選んだ元のID（または名前）の一覧と、置き換えた理由を `docs/DECISIONS.md` に1行で残す。
- 15人の目安は、SPEC.mdの式どおりタグあたり3人（2〜6人）、候補15個。
- 取り込み画面のサンプルのボタンは「サンプル（15人）で試す」「サンプル（40人）で試す」「サンプル（200人）で試す」の順に並べる。

生成済みの作業データは、人が学内で本物のおいとまを使って作る（エージェントは作らない）。

```bash
npm run pipeline -- --file public/samples/sample-15.xlsx --out private/demo-15.json
```

`.env.local` を `LLM_MODE=live` にしてから実行する。中身はダミーだけだが、他の作業データと同じく `private/` に置き、gitには入れない（今の `.gitignore` のまま）。

## 実装の段階と完了条件

**A1（画面なしの部品）→ A2（取り込み画面）→ A3（確認・印刷の変更）の順に、1つずつコミットして止まる。** どの段階も、完了条件の最後は `npm run verify` が通ること。コミットのメッセージは「ADD-A1: 1人追加の部品」の形にする。受け入れ確認の番号は次の節「確認」のもの。

| 段階 | 作るもの | 完了条件 | 人が目で確かめること |
| --- | --- | --- | --- |
| A1 部品 | `AGENTS.md` へ1行、型と `appStateSchema` の変更、`import/manual.ts`（必要なら `import/normalize.ts`）、`assignOne`、（必要なら）`pipeline/sticker.ts`、`pipeline/add-one.ts`、`state-ops.ts` とストアの操作（実行中フラグ、SHOULDの取り消しもここで作る）、`sample-15.xlsx` | 「確認」の自動テストの表のうち、`sheet-layout` 以外がすべて通る。`npm run samples` で `public/samples/sample-15.xlsx` ができる（コミットする）。今までのテストもすべて通る | （なし） |
| A2 取り込み画面 | `IconUserPlus`、タブの切り替え、カード1〜3、サンプル15人のボタン、タグを作る画面での実行中フラグの切り替え | `npm run verify` が通る。受け入れ確認1、2、5、6、9が通る（ブラウザを操作できなければ、手順を報告に書いて止まり、人が確かめる） | 職員や審査員が初めて見ても、入れる欄と押すボタンが分かるか。発表のスクリーン（1280×720）でシールと名前が読めるか |
| A3 確認・印刷 | 確認・修正の `?id=` と「手入力」バッジ、印刷する人の切り替え、SHOULDの刷り始める段と `sheet-layout` のテスト、SHOULDの取り消すボタン | `npm run verify` が通る。受け入れ確認3、4、7、8が通る。元の仕様書（SPEC.md）の受け入れ確認2〜9も通ったまま（ブラウザを操作できなければA2と同じ） | 印刷プレビューで、追加した人だけの1行が正しい段に出るか |

### 人が最初にやること

1. この仕様書をMarkdownで書き出し、リポジトリの `docs/SPEC-ADD-1.md` に置いてコミットする。
2. 受け入れ確認8のために、A1を始める前（今の版のまま）で `npm run pipeline -- --mock --file public/samples/sample-40.xlsx --out private/before-add-1.json` を実行しておく。`private/` はgitに入らず、`git clean -fd` でも消えない。
3. `git status` がきれいなこと（コミットしていない変更がないこと）を確かめてから、下の指示を送る。崩れたら `git restore . && git clean -fd` でその段階をやり直せる。

### エージェントへの指示文

最初の1回：

```text
docs/SPEC-ADD-1.md（追加仕様書）を最後まで読んでください。追加仕様書が名前を挙げている docs/SPEC.md と docs/UI.md の節も読んでください。
「実装の段階と完了条件」のA1だけを実装し、完了条件を確かめたら「ADD-A1: 1人追加の部品」のようなメッセージでコミットし、何を確かめたかを報告して止まってください。pushはしないでください。
おいとまのキーや実データは使いません。LLM_MODE=mock で進めてください。
追加仕様書に書いていないところの動きと見た目は、今のまま変えないでください。
仕様にない判断は docs/DECISIONS.md に1行で残してください。
```

2回目から：

```text
ADD-A2に進んでください。完了条件を確かめたらコミットして止まってください。
```

直してほしいときは、画面の写真かエラー文を添えて「この部分が docs/SPEC-ADD-1.md の「○○」と違う」と節の名前を示して頼む。直し終わったら、その分もコミットしてもらう。

## 確認

**計算と状態の変更はVitestで自動テストし、画面は練習モードで決まった手順を通して確かめる。** 画面の手順は、ブラウザを操作できないエージェントなら人が行う。本物のおいとまでの確認（10、11）は、キーを持つ人が学内で行う。

### 自動テスト（Vitest）

| ファイル | 確かめること |
| --- | --- |
| `manual.test.ts` | `nextParticipantId`：P001〜P040 → `P041`、P001とP003 → `P004`、空 → `P001`。`makeManualParticipant`：名前の前後の空白と改行を整え、31文字の名前を30文字に切る。同意 false で `intro` と `hobby` が `''`。`source` が `'manual'`、`addedAt` が渡した時刻。空白だけの名前で例外 |
| `assign.test.ts`（追記） | `assignOne`：ranking `[T3,T1,T5]`、active `[T1,T2,T3]` → `[T3,T1]`、`usedFallback` false。ranking `[T9]`、counts `{T1:4,T2:2,T3:3}` → `[T2,T3]`、true。ranking `[T2]`、同じcounts → `[T2,T3]`、true。active `[T1]` → `[T1]`、true。ranking `[]`、counts `{T1:4,T3:3}`（T2がない）→ `[T2,T3]`、true |
| `add-one.test.ts` | モックの `directLlmApi` で `sample-40.xlsx` を `runGeneration` した結果に、名前「審査 太郎」、一言「岡山のラーメン屋めぐり」の人を `generateForOne` で足す。返った共有タグが2つで互いに違い、どちらも `activeTagIds` にある。個性タグが1〜12文字。`api` を包んで入力を記録し、extractとrankの入力に `name` の項目がなく、JSONにしても「審査 太郎」を含まない。渡した `assignments` が呼ぶ前と同じ（深い比較）。`activeTagIds` を1個にして呼ぶと rank が呼ばれず、共有タグ1つで `fallback_shared` が付く。extractが例外を投げる `api` を渡すと、`generateForOne` も例外になる。`abort()` 済みの `signal` を渡すと `AbortError` になる |
| `state-ops.test.ts` | `isGenerated`：`generatedAt` が null なら false。`applyAddLatecomer` の後、ほかの人の `assignments`・`extractions`・`rankings` と `activeTagIds`・`candidates`・`generatedAt` が変わらず、参加者が1人増える。同じIDの人がいるときや、作る前の状態では `applyAddLatecomer` が何も変えない。`applyAddParticipant` は作る前の状態で生成結果（途中までの `extractions` など）を消さず、作った後の状態では何も変えない。（SHOULD）`applyRemoveManual` は `source` が `'manual'` でない人には何もしない。`source` と `addedAt` のない古い形の作業データが `appStateSchema` に通る |
| `forms.test.ts`（追記） | `sample-15.xlsx` が15人、同意なし0人、全員に自己紹介と一言の両方がある |
| `sheet-layout.test.ts`（SHOULD、刷り始める段を作ったとき） | `src/lib/sheet-layout.ts` の `layoutRows(count, rows, startRow): (number \| null)[][]`。用紙ごとに段の並びを返す。数字は印刷する人の0始まりの番号、nullは空ける段。各用紙の配列は常に段数の長さ。0人なら `[]`。`StickerSheet` はこれで並べる。24面（8段）で3人を5段目から → 1枚で `[null,null,null,null,0,1,2,null]`。10人を5段目から → 2枚、1枚目に0〜3、2枚目に4〜9とnull2つ。1段目からなら今までと同じ並び |

### 受け入れ確認（練習モード）

`LLM_MODE=mock` で `npm run build && npm start` し、Chromeで `http://127.0.0.1:3000/admin` を開いて順に確かめる。

1. 「サンプル（15人）で試す」で15人を読み込む。「1人分を手入力で追加」タブで1人足すと、通知が出て「手入力で追加した人（1人）」に出る。「タグを作る」の「タグをまとめて作る」で16人分のタグができ、確認・修正にその人がいる。
2. 「サンプル（40人）で試す」→「タグをまとめて作る」。確認・修正で、先頭の3人のタグをメモしておく。取り込み画面の手入力タブで、名前「審査 太郎」、一言「岡山のラーメン屋めぐり」を入れて「追加してタグを作る」。3行の進み具合が順に完了になり、シール3枚と「同じタグの人」が出る。フォームは空になり、「続けてもう1人追加」を押すまで入力できない。
3. （2の続き。再読み込みしない）「確認・修正で見る」で、「審査 太郎」を選んだ状態で開き、表と詳細に「手入力」のバッジが出る。参加者が41人になり、メモした3人のタグが変わっていない。
4. （3の続き）`http://127.0.0.1:3000/admin/print?only=manual` を開くと、印刷する人が「手入力で追加した人（1人）」になり、プレビューが「A4 1枚（1人）」で1行だけになる。「全員」に戻すと「A4 6枚（41人）」（24面のとき）。
5. 取り込み画面の手入力タブで：名前が空のときボタンを押せない。「審査 太郎」と入れると「同じ名前の人がいます」が出る。同意をオフにすると注意の1行が出る。
6. ページを再読み込みしても、追加した人が「手入力で追加した人」の一覧と確認・修正に残っている。`/admin/import?tab=manual` で開くと手入力のタブになっている。
7. （SHOULD）印刷画面で印刷する人を手入力にし、刷り始める段を5にすると、その人の行が5段目に出る。取り込み画面の一覧の「取り消す」で、一覧と確認・修正からその人が消え、ほかの人のタグは変わらない。
8. 「保存・バックアップ」の「保存した作業データを開く」で、A1の前に作った `private/before-add-1.json`（「人が最初にやること」の2）を開ける。開いた後に1人追加してタグを作れる。
9. Chromeのデベロッパーツールの「ネットワーク」を開いたまま2を行い、`/api/llm/extract` と `/api/llm/rank` に送った中身に「審査 太郎」がない。

### 本物のおいとまでの確認（人が学内で行う）

10. 体験用の作業データ（`private/demo-15.json`）を開いて1人追加し、シールが出るまでの秒数を記録する。目安は30秒以内。遅ければ `.env.local` の `OITOMA_MODEL` を `qwen3.6-35b-a3b-it` にして測り直し、タグの質と速さでどちらを使うか決める。
11. VPNを切るなどしておいとまに届かない状態で「追加してタグを作る」を押すと、「おいとまに接続できません」が出て、参加者の数が増えていない。入力は残っている。

## 当日の体験の手順と事前の確認

**審査員の体験は、発表用PCのシークレットウィンドウで、体験用の作業データ（ダミー15人・生成済み）に本人を1人足す形で行う。** シークレットウィンドウは保存場所が別なので、発表用のデータには触らず、閉じれば体験の分は消える。

### 事前にやること

- [ ] A1〜A3を実装し、練習モードで受け入れ確認1〜9を通す（13日まで）
- [ ] 学内で `sample-15.xlsx` を本物のおいとまで生成し、`private/demo-15.json` に保存する。確認10で1人追加の秒数を測る（14日まで）
- [ ] 会場（KIBINOVE）でおいとまに届くか確かめる。会場で試せなければ、運営に「会場のWi-Fiは学内ネットワーク扱いか」を聞き、OU-VPNをつないだ状態でも `npm run llm:check` を通しておく（15日まで）
- [ ] 発表用PCに、発表用の作業データと `private/demo-15.json` の両方を置き、`.env.local` を `LLM_MODE=live` にしてビルドしておく（15日）
- [ ] 下の「体験の手順」を1回通し、シークレットウィンドウを閉じた後も発表用のデータがそのままか確かめる（15日）

### 体験の手順（当日）

1. 発表用のウィンドウはそのままにして、Chromeのシークレットウィンドウ（Ctrl+Shift+N）で `http://127.0.0.1:3000/admin/data` を開く。
2. 「保存した作業データを開く」で `demo-15.json` を開く。
3. `http://127.0.0.1:3000/admin/import?tab=manual` を開く（「回答を読み込む」の「1人分を手入力で追加」タブ）。
4. 審査員に入力してもらう。「名前はおいとまに送りません。ニックネームでも大丈夫です」と一言添える。
5. 「追加してタグを作る」を押し、おいとまとプログラムの担当が進む様子と、できたシール、「同じタグの人」を見せる。
6. 「確認・修正で見る」でビフォー・アフターを見せ、「おいとまに別案を出してもらう」も試してもらう。
7. 終わったらシークレットウィンドウをすべて閉じる。体験で入れた内容はこのPCから消える。

- **最初から全部試したい人には**：同じシークレットウィンドウで「サンプル（15人）で試す」→「タグをまとめて作る」。本物のおいとまで何分かかるかは、14日までの試しで測っておく。
- **おいとまに届かないとき**：サーバーを止め、PowerShellで `$env:LLM_MODE='mock'; npm start` と起動し直すと練習モードで動く（このやり方で入れた値は `.env.local` より優先される）。操作だけ体験してもらい、本物の結果はデモ動画で見せる。発表のデモ（作業データを開いて再生）は練習モードでもそのまま動く。

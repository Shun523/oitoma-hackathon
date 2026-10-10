# #おいとま使ってます 管理画面 デザイン仕様書

Oct 10, 2026 · @しーたけ

## この仕様書の使い方

**管理画面（`/admin` 以下）の見た目を、案A（学内システム風）に統一し、「共有タグ」タブにだけ案Cの人数バーを1色で入れる。** 実装はOpenCode上のMuse Spark 1.3が行う。色・文字・部品のクラス名・画面ごとの配置・文言まで決めてあるので、迷ったらこの仕様書の値をそのまま使う。

### 範囲

| 変えるもの | 変えないもの |
| --- | --- |
| `src/app/admin/` 以下の画面、`src/components/` の管理画面用の部品、`src/app/globals.css` へのトークン追加 | `src/lib/` 以下（計算・生成・おいとま連携・保存）、データの形（`AppState`、保存するJSON）、公開トップ `/`、シール（`Sticker`、`StickerSet`、`StickerSheet`）と印刷用CSS |

### エージェントの進め方

1. この仕様書を `docs/UI.md` として読む。見本の画像は `docs/design/` にある（人が置く）。
   - `docs/design/review-participants.png`：確認・修正の「参加者」タブ（案A）
   - `docs/design/review-shared-tags.png`：確認・修正の「共有タグ」タブ（案A＋案C）
2. 「実装の順番と完了条件」のU0から順に、1つずつ進める。1つ終わるごとに `npm run verify` を通してコミットし、止まって報告する。
3. 既存のファイル名や部品名が仕様書と違うときは、既存のほうに合わせ、`docs/DECISIONS.md` に1行残す。
4. 仕様書にない見た目の判断が要るときは、新しい色や部品を足さず、ここにある部品と色の組み合わせで済ませる。

### 必ず守ること

- 色は「デザイントークン」の表にあるものだけを使う。Tailwindの標準色（`bg-blue-600` など）や、`#` で始まる色の直書きは使わない。
- 影（`shadow-*`）とグラデーションは使わない。区切りは枠線と背景色で表す。
- 新しいライブラリは入れない。アイコンは `src/components/ui/icons.tsx` の自作SVGだけを使う。
- 押せるものは、塗りか枠線のあるボタンだけにする。文字だけのリンクは「すべて表示」のような補助の操作に限る。
- すべてのボタン・入力欄に、キーボードで選んだときの枠（`focus-visible` のスタイル）を付ける。

## デザイントークン

**色は「紺（操作）・黄（確認が必要）・オレンジの枠（共有タグ）」の3つを軻にし、あとはグレーだけ。** 下の `@theme` を `src/app/globals.css` の `@import "tailwindcss";` のすぐ下に貼る。これで `bg-adm-bg`、`text-adm-ink`、`text-adm-body` のようなクラスが使える（Tailwind v4）。

```css
@theme {
  /* 面と線 */
  --color-adm-bg: #F2F4F7;          /* 画面の背景 */
  --color-adm-surface: #FFFFFF;     /* カード */
  --color-adm-line: #D9DEE5;        /* カードの枠 */
  --color-adm-line-strong: #C5CDD8; /* ボタン・入力欄の枠 */
  --color-adm-divider: #E6EAF0;     /* 表の行の区切り */
  --color-adm-head: #F7F8FA;        /* 表の見出し行、回答の引用欄 */
  --color-adm-field: #EEF1F5;       /* 切り替えタブの土台、バーの地 */
  /* 文字 */
  --color-adm-ink: #1C2430;         /* 本文 */
  --color-adm-ink2: #3F4855;        /* 表の見出し、小見出し */
  --color-adm-sub: #5A6472;         /* 補助の文字 */
  /* 左メニュー */
  --color-adm-nav: #16314F;
  --color-adm-nav-ink: #DCE5F1;
  --color-adm-nav-dim: #B7C6DA;     /* まだの手順 */
  --color-adm-nav-line: #2C4A6E;
  --color-adm-nav-soft: #22436A;    /* モード表示の箱 */
  /* 操作 */
  --color-adm-primary: #1E5AA8;     /* 主ボタン、選んだもの、人数バー */
  --color-adm-primary-hover: #174A8C;
  --color-adm-primary-soft: #EDF2F8; /* 選んだ行の背景 */
  --color-adm-done: #3E8E6A;        /* 済んだ手順、保存しました */
  /* 確認が必要 */
  --color-adm-warn-bg: #FFF8E6;
  --color-adm-warn-line: #F0C36D;
  --color-adm-warn-ink: #7A4F00;
  --color-adm-warn-badge: #FDEBC8;
  /* 消す・エラー */
  --color-adm-danger: #B42318;
  --color-adm-danger-bg: #FEF3F2;
  --color-adm-danger-line: #F5B5AE;
  /* タグ（シールと同じ見た目） */
  --color-tag-personal: #1C2430;
  --color-tag-shared: #E4572E;

  /* 文字の大きさ */
  --text-adm-xs: 12px;     /* 注記、バッジ */
  --text-adm-sm: 13px;     /* ラベル、チップ */
  --text-adm-table: 14px;  /* 表、ボタン */
  --text-adm-body: 15px;   /* 本文 */
  --text-adm-lead: 17px;   /* カードの見出し */
  --text-adm-name: 20px;   /* 詳細パネルの名前 */
  --text-adm-h1: 26px;     /* ページ見出し */
  --text-adm-num: 28px;    /* 数字カード */
}
```

もし `tailwind.config.ts` がある（Tailwind v3）なら、同じ名前と値を `theme.extend.colors` と `theme.extend.fontSize` に入れる（例：`colors: { 'adm-bg': '#F2F4F7', ... }`）。

### そのほかの決まり

| 項目 | 値 | Tailwindのクラス |
| --- | --- | --- |
| カードの角丸 | 12px | `rounded-xl` |
| ボタン・入力欄の角丸 | 8px | `rounded-lg` |
| タグチップ・バッジの角丸 | 丸 | `rounded-full` |
| ページの内側の余白 | 上28px・左右32px・下40px | `pt-7 px-8 pb-10` |
| 本体の最大幅 | 1120px、中央寄せ | `max-w-[1120px] mx-auto` |
| カードの内側の余白 | 20px（数字カードは上下14px・左右18px） | `p-5`（`py-3.5 px-[18px]`） |
| 大きな塊の間隔 | 20px | `gap-5` |
| 小さな塊の間隔 | 12px | `gap-3` |
| ボタンの高さ | 44px（表の上の操作は40px） | `min-h-11`（`min-h-10`） |
| 行間 | 1.6 | `leading-[1.6]` |

## フォントとアイコン

**管理画面だけBIZ UD Pゴシックを使う。アイコンは線で描く自作SVGを一つのファイルにまとめる。** BIZ UDは業務文書向けに読みやすさを重視した日本語フォントで、職員向けの画面に合う。公開トップとシールは今のNoto Sans JPのままにする。

### フォント（`src/app/admin/fonts.ts`）

```ts
import { BIZ_UDPGothic } from 'next/font/google';

export const adminFont = BIZ_UDPGothic({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});
```

- `AdminShell` の一番外側の要素に `adminFont.className` を付ける。日本語の文字も自動で読み込まれる。
- フォントは `npm run build` のときに取り込まれる。発表用PCでは、ネットにつながっているうちに一度ビルドしておく。

### アイコン（`src/components/ui/icons.tsx`）

すべて同じ形の部品にする。色は親の文字色（`currentColor`）に従う。飾りなので、読み上げからは隠す。

```tsx
type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Svg({ size = 16, className, strokeWidth = 2, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const IconCheck = (p: IconProps) => <Svg strokeWidth={3} {...p}><path d="M20 6L9 17l-5-5" /></Svg>;
```

| 部品名 | 使う場所 | 中身（`<path d>` など） |
| --- | --- | --- |
| `IconCheck` | 済んだ手順、選んだ候補、保存しました | `M20 6L9 17l-5-5`（太さ3） |
| `IconSave` | 作業データを保存、保存・バックアップ | `M5 4h11l3 3v13H5z`、`M8 4v5h7`、`M8 20v-6h8v6` |
| `IconWarning` | 確認が必要、エラー | `M12 3l9.5 17h-19z`、`M12 10v4`、`M12 17h.01` |
| `IconSearch` | 名前で検索 | `<circle cx="11" cy="11" r="7" />`、`M20 20l-3.5-3.5` |
| `IconSparkle` | おいとまに別案を出してもらう | `M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6` |
| `IconArrowRight` | 次へ | `M5 12h14`、`M13 6l6 6-6 6` |
| `IconArrowDown` | ビフォーからアフターへ | `M12 5v14`、`M6 13l6 6 6-6` |
| `IconUpload` | Excelファイルを選ぶ | `M12 16V4`、`M7 9l5-5 5 5`、`M4 16v4h16v-4` |
| `IconPrinter` | 印刷する | `M7 9V3h10v6`、`M7 17H4v-7h16v7h-3`、`M7 14h10v7H7z` |
| `IconTrash` | このPCからデータを消す | `M4 7h16`、`M9 7V4h6v3`、`M6 7l1 13h10l1-13` |
| `IconHelp` | 「？」の説明 | `<circle cx="12" cy="12" r="9" />`、`M12 16v-4`、`M12 8h.01` |
| `IconClose` | ダイアログを閉じる | `M6 6l12 12M18 6L6 18` |
| `IconPlay` | 生成の流れを見る | `M7 5l12 7-12 7z` |

## 共通部品

**画面はここにある11個の部品だけで組み立てる。** 置き場所は `src/components/ui/`。部品の中では、ここに書いたクラスをそのまま使う。画面の側では、部品の見た目をクラスで上書きしない（配置のための `flex-1` や余白だけ足してよい）。

### 1. ボタン（`Button.tsx`）

```ts
type Variant = 'primary' | 'secondary' | 'warn' | 'danger' | 'dashed';
type Size = 'sm' | 'md' | 'lg';
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md'): string;
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode });
```

`<Link>` をボタンの見た目にするときは `className={buttonClass('primary', 'lg')}` を付ける。

| 部分 | クラス |
| --- | --- |
| 共通 | `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold text-adm-table transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary` |
| size sm | `min-h-10 px-3.5` |
| size md | `min-h-11 px-4` |
| size lg（「次へ」だけ） | `min-h-12 px-6 text-adm-body` |
| primary | `bg-adm-primary text-white hover:bg-adm-primary-hover` |
| secondary | `border border-adm-line-strong bg-adm-surface text-adm-ink hover:bg-adm-head` |
| warn | `border border-adm-warn-line bg-adm-warn-bg text-adm-warn-ink hover:bg-adm-warn-badge` |
| danger | `bg-adm-danger text-white hover:opacity-90` |
| dashed（おいとまに頼む操作） | `border border-dashed border-adm-primary bg-adm-surface text-adm-primary hover:bg-adm-primary-soft` |

切り替えのボタン（絞り込みなど）は `aria-pressed` を付ける。押されているときは `ring-2 ring-adm-primary` を足す。

### 2. カード（`Card.tsx`）

- `Card`：`<section>` に `rounded-xl border border-adm-line bg-adm-surface`。中の余白は使う側で `p-5` を付ける（表を入れるときは `overflow-hidden` にして余白なし）。
- `CardToolbar`：表の上の操作の列。`flex flex-wrap items-center gap-3 border-b border-adm-divider px-4 py-3`
- `CardTitle`：`text-adm-lead font-bold`

### 3. 数字カード（`StatCard.tsx`）

```ts
props: { label: string; value: string | number; unit?: string; prefix?: string; note?: string; tone?: 'normal' | 'warn'; help?: string }
```

| 部分 | クラス |
| --- | --- |
| 外枠（normal） | `min-w-0 flex-1 basis-[170px] rounded-xl border border-adm-line bg-adm-surface px-[18px] py-3.5` |
| 外枠（warn） | 同上で、`border-adm-warn-line bg-adm-warn-bg` にし、中の文字をすべて `text-adm-warn-ink` |
| ラベル | `flex items-center gap-1 text-adm-sm text-adm-sub`（`help` があれば横に `HelpTip`） |
| 数字 | `text-adm-num font-bold leading-tight`。`prefix`（例：最少）と `unit` は `text-adm-body` |
| 注記 | `text-adm-xs text-adm-sub` |

並べるときは `<div className="flex flex-wrap gap-3">` に入れる。

### 4. タグチップ（`TagChip.tsx`）

```ts
props: { kind: 'personal' | 'shared'; label: string; size?: 'sm' | 'md' }  // label は '#' なし。表示で '#' を付ける
```

| 種類 | クラス |
| --- | --- |
| personal | `inline-block whitespace-nowrap rounded-full bg-tag-personal px-2.5 py-0.5 text-adm-sm font-bold text-white` |
| shared | `inline-block whitespace-nowrap rounded-full border-[1.5px] border-tag-shared bg-adm-surface px-2.5 py-px text-adm-sm font-bold text-adm-ink` |
| size md（詳細パネルのシール欄） | `px-3 text-adm-body` に置き換える |

### 5. バッジ（`Badge.tsx`）

```ts
props: { tone: 'warn' | 'danger' | 'neutral' | 'oitoma' | 'done'; children: ReactNode }
```

共通：`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-adm-xs font-bold`

| tone | 追加のクラス | 使う場所 |
| --- | --- | --- |
| warn | `bg-adm-warn-badge text-adm-warn-ink` | 確認が必要な理由 |
| danger | `bg-adm-danger-bg text-adm-danger` | 下限未満、エラー |
| neutral | `bg-adm-field text-adm-ink2` | 担当「プログラム」、待機中 |
| oitoma | `bg-adm-primary-soft text-adm-primary` | 担当「おいとま」 |
| done | `bg-adm-done text-white` | 完了 |

### 6. 人数バー（`CountBar.tsx`、案Cから取り入れる部品）

```tsx
// props: { count: number; min: number; max: number }
const scale = Math.max(max, count);
const pct = (count / scale) * 100;
const minPct = (min / scale) * 100;
<div className="flex items-center gap-3">
  <div className="relative h-2.5 flex-1 rounded-full bg-adm-field" role="img" aria-label={`${count}人（目安 ${min}〜${max}人）`}>
    <div className={`h-2.5 rounded-full ${count < min ? 'bg-adm-danger' : 'bg-adm-primary'}`} style={{ width: `${pct}%` }} />
    <div className="absolute -top-1 h-[18px] w-0.5 bg-adm-ink opacity-40" style={{ left: `${minPct}%` }} />
  </div>
  <span className="w-12 text-right text-adm-table font-bold">{count}人</span>
</div>
```

バーの色は紺1色。下限未満のときだけ赤にする（そのときは横に danger のバッジ「少なすぎ」）。上限を超えたときはバーは紺のままで、warn のバッジ「多すぎ」。

### 7. 切り替えタブ（`Segmented.tsx`）

- 土台：`flex gap-1 rounded-[10px] bg-adm-field p-1`
- 選んでいる項目：`min-h-10 rounded-lg bg-adm-surface px-3.5 text-adm-table font-bold text-adm-ink ring-1 ring-adm-line`
- ほかの項目：`min-h-10 rounded-lg px-3.5 text-adm-table text-adm-ink2 hover:text-adm-ink`
- 各項目は `<button type="button" aria-pressed>`。ラベルに件数を付ける（例：「参加者 40」）

### 8. 検索欄（`SearchBox.tsx`）

`<label className="flex min-h-10 items-center gap-2 rounded-lg border border-adm-line px-3 text-adm-table text-adm-sub">` の中に `IconSearch` と `<input type="search" aria-label="名前で検索" placeholder="名前で検索" className="w-[130px] bg-transparent text-adm-ink outline-none">`。

### 9. 「？」の説明（`HelpTip.tsx`）

JavaScriptを使わず `<details>` で作る。

```tsx
<details className="relative inline-block align-middle">
  <summary className="cursor-pointer list-none text-adm-sub [&::-webkit-details-marker]:hidden" aria-label="説明を見る">
    <IconHelp size={15} />
  </summary>
  <div className="absolute left-0 z-10 mt-1 w-64 rounded-lg border border-adm-line bg-adm-surface p-3 text-adm-sm text-adm-ink2">{text}</div>
</details>
```

| 言葉 | 説明文（このまま使う） |
| --- | --- |
| 個性タグ | その人だけの話題です。見た人が「それ何ですか？」と聞きたくなる一言にしています。 |
| 共有タグ | 会場の何人かと同じになる話題です。全員の回答を見比べて作ります。 |
| 共通の話題がある人 | 自分と共有タグが1つ以上同じ人の数です。一番少ない人の値を出しています。 |
| 遭遇率 | 会場からランダムに2人選んだとき、共有タグが同じである確率です。 |

### 10. 確認ダイアログ（`ConfirmDialog.tsx`）

ブラウザ標準の `<dialog>` を使う（`window.confirm` は使わない）。

```ts
props: { open: boolean; title: string; body: string; confirmLabel: string; tone?: 'primary' | 'danger'; onConfirm: () => void; onCancel: () => void }
```

- `open` が true になったら `ref.current.showModal()`、false なら `close()`。`onClose` で `onCancel` を呼ぶ（Escで閉じられる）
- `<dialog>`：`w-[min(440px,calc(100%-32px))] rounded-xl border border-adm-line bg-adm-surface p-0 text-adm-ink backdrop:bg-adm-ink/40`
- 見出し `px-5 pt-5 text-adm-lead font-bold`、本文 `px-5 pt-2 text-adm-body text-adm-ink2`、ボタンの列 `flex justify-end gap-2 px-5 pb-5 pt-4`
- ボタン：左に「やめる」（secondary）、右に `confirmLabel`（primary か danger）。最初に「やめる」へフォーカスを当てる

### 11. 通知とお知らせ欄（`Toast.tsx`、`Notice.tsx`）

- `showToast(message: string)`：`window.dispatchEvent(new CustomEvent('adm-toast', { detail: message }))` を呼ぶだけの関数。`ToastHost` を `AdminShell` に1つ置き、このイベントを受けたら3秒だけ表示する
- `ToastHost` の見た目：`fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-lg bg-adm-done px-4 py-3 text-adm-table font-bold text-white`、`role="status" aria-live="polite"`、頭に `IconCheck`
- `Notice`（画面の中のお知らせ欄）：`props: { tone: 'info' | 'warn' | 'danger' | 'success'; title: string; children?: ReactNode; action?: ReactNode }`。共通 `flex items-start gap-3 rounded-xl border p-4`

| tone | クラス | 頭のアイコン |
| --- | --- | --- |
| info | `border-adm-line bg-adm-head text-adm-ink2` | `IconHelp` |
| warn | `border-adm-warn-line bg-adm-warn-bg text-adm-warn-ink` | `IconWarning` |
| danger | `border-adm-danger-line bg-adm-danger-bg text-adm-danger` | `IconWarning` |
| success | `border-adm-done/40 bg-adm-done/10 text-adm-ink`（アイコンだけ `text-adm-done`） | `IconCheck` |

### 入力欄（部品にしない。このクラスを使う）

- テキスト・数字・選択：`min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary`
- チェックボックス：`size-4 accent-adm-primary`。必ず `<label>` で文字といっしょに囲む
- ラベル：`text-adm-xs text-adm-sub`。入力欄の上に置き、`flex flex-col gap-1` でまとめる

## 画面の骨組み

**全画面を「左の紺のメニュー＋右の本体」にし、本体は「見出し → カード → 右下の次へ」の順に並べる。** 骨組みは3つの部品（`AdminShell`、`PageHeader`、`PageFooter`）で作り、各画面は中身だけを書く。

```text
+----------------+----------------------------------------------------------+
| #おいとま使ってます | ステップ 3 / 4                                             |
| イベント名        | 確認・修正（見出し）                [作業データを保存]  |
|                | この画面でやること：〜                               |
| (✓) 回答を読み込む |                                                          |
| (✓) タグを作る   | [この画面の中身：白いカードを縦に並べる]               |
| [3] 確認・修正  ←白 |                                                          |
| (4) シールを印刷 |                                                          |
| ---------------|                                                          |
| 保存・バックアップ  |                                                          |
|                | 入力内容はこのPCのブラウザに…      [次へ：シールを印刷 →] |
| [練習モード]       |                                                          |
+----------------+----------------------------------------------------------+
```

### AdminShell（`src/components/AdminShell.tsx`、クライアント）

`src/app/admin/layout.tsx`（サーバー）は、今までどおり `isAdminEnabled()` を確かめてから `<AdminShell>{children}</AdminShell>` を返す。今の `AdminNav` は `AdminShell` に置き換える。

| 部分 | クラスと中身 |
| --- | --- |
| 一番外側 | `${adminFont.className} flex min-h-screen flex-wrap bg-adm-bg text-adm-body leading-[1.6] text-adm-ink` |
| 左メニュー | `<nav aria-label="作業の手順" className="flex flex-[1_1_240px] flex-col gap-7 bg-adm-nav px-4 py-6 text-white print:hidden">` |
| アプリ名 | `px-2` の箱に「#おいとま使ってます」（`text-[19px] font-bold`）、その下に `EVENT.eventName`（`mt-1.5 text-adm-xs text-adm-nav-dim`） |
| 手順の並び | `<ol className="flex flex-col gap-1">`。4つの `<Link>`：回答を読み込む（`/admin/import`）、タグを作る（`/admin/generate`）、確認・修正（`/admin/review`）、シールを印刷（`/admin/print`） |
| 手順（共通） | `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-white` |
| 手順（済んだ） | `text-adm-nav-ink hover:bg-adm-nav-soft`。丸は `flex size-[26px] flex-none items-center justify-center rounded-full bg-adm-done text-white` に `IconCheck size={14}` |
| 手順（今いる） | `bg-adm-surface font-bold text-adm-nav`、`aria-current="step"`。丸は `bg-adm-nav text-adm-sm text-white` に番号 |
| 手順（まだ） | `text-adm-nav-dim hover:bg-adm-nav-soft`。丸は `border-[1.5px] border-adm-nav-dim text-adm-sm` に番号 |
| 保存・バックアップ | 上に区切り線（`border-t border-adm-nav-line pt-4`）。`/admin/data` への `<Link>` に `IconSave size={18}`。この画面にいるときは「今いる」と同じ見た目 |
| モードの箱 | `mt-auto rounded-lg bg-adm-nav-soft px-3.5 py-3 text-adm-xs text-adm-nav-ink`。一行目 `text-adm-sm font-bold text-white` |
| 本体 | `<main className="min-w-0 flex-[999_1_560px] px-8 pb-10 pt-7 print:p-0">` の中に `<div className="mx-auto flex max-w-[1120px] flex-col gap-5">` |
| 通知 | 本体の後ろに `<ToastHost />` |

**手順の「済んだ」の決め方**（ストアから読む）：1 は `participants.length > 0`、2 は `generatedAt !== null`。3と4には✓を付けない。今いる手順は `usePathname()` がそのパスで始まるかで決める。今いる手順は、済んでいても「今いる」の見た目を優先する。

**モードの箱の文言**（`/api/health` の `mode` を最初に1回だけ読む）

| mode | 1行目 | 2行目 |
| --- | --- | --- |
| 読み込み中 | モードを確認中 | （なし） |
| mock | 練習モード | おいとまを使わずに試しています |
| live | おいとまに接続中 | 学内のおいとまでタグを作ります |

**復元を待つ**：`useHydrated()` が false のあいだ、本体には `Card` に「読み込み中…」だけを出す（左メニューは済んだ✓なしで出してよい）。

### PageHeader（`src/components/PageHeader.tsx`）

```tsx
// props: { step?: 1 | 2 | 3 | 4; title: string; description: string; actions?: ReactNode }
<div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
  <div>
    {step && <div className="text-adm-sm text-adm-sub">ステップ {step} / 4</div>}
    <h1 className="mb-1 mt-0.5 text-adm-h1 font-bold leading-snug">{title}</h1>
    <p className="text-adm-ink2">この画面でやること：{description}</p>
  </div>
  {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
</div>
```

### PageFooter（`src/components/PageFooter.tsx`）

```tsx
// props: { next?: { href: string; label: string; disabled?: boolean } }
<div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden">
  <p className="text-adm-xs text-adm-sub">入力内容はこのPCのブラウザに自動で保存されます。</p>
  {next && (next.disabled
    ? <span className={buttonClass('primary', 'lg') + ' pointer-events-none opacity-50'}>次へ：{next.label}</span>
    : <Link href={next.href} className={buttonClass('primary', 'lg')}>次へ：{next.label}<IconArrowRight size={18} /></Link>)}
</div>
```

「次へ」は1画面に1つだけ。その画面でやることが終わるまでは `disabled` にする。

## 画面別：確認・修正（`/admin/review`）

**上に数字カード5枚、その下に「左：一覧、右：選んだ人の詳細」。一覧は「参加者」と「共有タグ」の2つのタブで切り替える。** 見本は `docs/design/review-participants.png` と `docs/design/review-shared-tags.png`。発表で一番長く映る画面なので、最初に仕上げる。

```text
PageHeader  step=3  「確認・修正」                         [作業データを保存]
[参加者 40人][共有タグ 13個][共通の話題がある人 最少6人][遭遇率 41%][確認が必要 3人]
+------------------------------------------------+  +-------------------------+
| [参加者 40|共有タグ 13]  [確認が必要な人だけ] [検索] |  | 岡山 太郎                |
|------------------------------------------------|  | 所属・区分              |
| 名前 | 所属 | 個性タグ | 共有タグ | 確認          |  | 回答（ビフォー）        |
| … 選んだ行は薄い紺、確認が必要な行は薄い黄 …     |  | ↓ おいとまが作ったシール   |
|                                                |  | シール3枚               |
|                                                |  | 個性タグを選ぶ / 共有タグ |
+------------------------------------------------+  +-------------------------+
PageFooter  next=「シールを印刷」
```

### 見出しと数字カード

- `PageHeader`：step 3、title「確認・修正」、description「おいとまが作ったタグを見て、気になるものだけ直します。」、actionsに secondary ボタン「作業データを保存」（`IconSave`。保存したら `showToast('作業データを保存しました')`）
- 数字カード（`computeMetrics` の値を使う。編集するとすぐ変わる）

| label | value | note | そのほか |
| --- | --- | --- | --- |
| 参加者 | 人数、unit「人」 | 「回答あり {n}人・同意なし {n}人」 |  |
| 共有タグ | `sharedTagCount`、unit「個」 | 「1つのタグを{minSize}〜{maxSize}人で共有」 | help：共有タグ |
| 共通の話題がある人 | `matesMin`、prefix「最少」、unit「人」 | 「中央値 {matesMedian}人」 | help：共通の話題がある人 |
| 遭遇率 | `Math.round(encounterRate*100)`、unit「%」 | 「ランダムな2人に共通タグがある確率」 | help：遭遇率 |
| 確認が必要 | `needsReview`、unit「人」 | 1人以上：「表の黄色い行を見てください」、0人：「ありません」 | 1人以上なら tone warn |

### 一覧のカード（左）

- 外枠：`Card` に `min-w-0 flex-[999_1_560px] overflow-hidden`。左右を包む列は `flex flex-wrap items-start gap-5`
- `CardToolbar` の中：`Segmented`（「参加者 {n}」「共有タグ {n}」）、warn の sm ボタン「確認が必要な人だけ表示（{n}）」（`IconWarning`、`aria-pressed`、参加者タブのときだけ）、右端に `SearchBox`（`ml-auto`、参加者タブのときだけ）
- 表は `<div className="overflow-x-auto">` の中に `<table className="w-full min-w-[700px] border-collapse text-adm-table">`
- 見出し行：`<tr className="bg-adm-head text-left text-adm-ink2">`、各 `<th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">`
- セル：`border-b border-adm-divider px-4 py-3 align-top`

### 「参加者」タブの表

| 列 | 中身 |
| --- | --- |
| 名前 | 1行目に名前（`font-bold`）、2行目に区分（`text-adm-xs text-adm-sub`） |
| 所属 | 所属（`text-adm-ink2`） |
| 個性タグ | `TagChip kind="personal"` |
| 共有タグ | `TagChip kind="shared"` を2つ、`flex flex-wrap gap-1.5` |
| 確認 | 理由ごとに `Badge tone="warn"`（複数なら並べる）。なければ「—」（`text-adm-sub`） |

- 行全体を押せるようにする：名前のセルを `<button type="button" className="text-left">` にし、`<tr>` にも `onClick`と `cursor-pointer hover:bg-adm-head` を付ける。押したらその人を右の詳細に出す
- 選んだ行：`bg-adm-primary-soft`、名前のボタンに `aria-current="true"`
- 確認が必要な行（選んでいないとき）：`bg-adm-warn-bg`
- 並びは取り込み順。全員を表示する（ページ分けしない）。表の下に `px-4 py-3 text-adm-sm text-adm-sub` で「{表示中}人を表示（全{n}人）」
- 最初に開いたときは、確認が必要な人がいればその最初の人、いなければ先頭の人を選んだ状態にする

### 「共有タグ」タブの表（案Cの人数バーをここに入れる）

表の上（`CardToolbar` の右端）に `text-adm-xs text-adm-sub` で「バー＝人数。縦線＝下限（{minSize}人）。目安は{minSize}〜{maxSize}人」。

| 列 | 幅 | 中身 |
| --- | --- | --- |
| 共有タグ | 自動 | 上に `TagChip kind="shared"`、下に「名前を変える」（`text-adm-xs` の文字ボタン）。押すとその場で `TagInput` に変わる（12文字まで、Enterで確定、Escでやめる） |
| まとめた話題 | 自動 | `covers`（`text-adm-ink2`） |
| 人数 | `w-[260px]` | `CountBar`。下限未満なら横に `Badge tone="danger"`「少なすぎ」、上限超えなら `Badge tone="warn"`「多すぎ」 |
| メンバー | 自動 | 名前を `text-adm-sm` の薄いチップ（`rounded-full bg-adm-field px-2 py-0.5`）で最大6人、残りは「ほか{n}人」。名前を押すと「参加者」タブに戻り、その人を選ぶ |

- 並びは人数の多い順。人数が0のタグは出さない
- このタブでも右の詳細はそのまま出しておく

### 選んだ人の詳細（右）

外枠：`<aside aria-label="選んだ人の詳細">` に `Card` と同じ枠で `flex min-w-0 flex-[1_1_340px] flex-col gap-4 p-5`。上から次の順。

1. **名前**：`text-adm-name font-bold`、下に「{所属}・{区分}」（`text-adm-sm text-adm-sub`）。確認が必要なら、その下に `Notice tone="warn"` で理由と「タグを見て、問題なければそのままで構いません。」
2. **回答（ビフォー）**：小見出し `mb-1.5 text-adm-sm font-bold text-adm-ink2`。箱 `rounded-lg bg-adm-head px-3.5 py-3 text-adm-table leading-[1.7]` に自己紹介、その下 `mt-2 text-adm-sm text-adm-ink2` で「最近ハマっていること：{一言}」。回答がなければ「回答はありません。所属と区分からタグを作りました。」
3. **矢印**：`flex items-center gap-2 text-adm-sm font-bold text-adm-ink2` に `IconArrowDown` と「おいとまが作ったシール（アフター）」
4. **シール3枚**：縦に3行（`flex flex-col gap-2`）。各行 `flex items-center justify-between gap-2 rounded-md border border-adm-line-strong px-3 py-2.5`。左に `TagChip size="md"`、右に `text-adm-xs text-adm-sub` で個性タグは「個性タグ」、共有タグは「会場に{n}人」
5. **編集**（上に `border-t border-adm-divider pt-3.5`、中は `flex flex-col gap-2.5`）
   - 小見出し「個性タグを選ぶ」の横に `HelpTip`（個性タグ）
   - 候補をボタンで並べる（`flex flex-wrap gap-2`）。選んでいる候補：`min-h-10 rounded-lg border-2 border-adm-primary bg-adm-primary-soft px-3 text-adm-table font-bold`、`aria-pressed="true"`。ほか：`min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-3 text-adm-table`
   - その下に「自分で入力」の `TagInput`（12文字まで、文字数を右に `text-adm-xs` で表示）
   - `Button variant="dashed" size="sm"` 「おいとまに別案を出してもらう」（`IconSparkle`、待ちのあいだは「考えています…」で disabled）。この機能を作っていなければボタンは出さない
   - 小見出し「共有タグ」の横に `HelpTip`（共有タグ）。`flex flex-wrap gap-2` に2つの選択欄（ラベル「1つ目」「2つ目」、各 `flex-[1_1_140px]`）。選択肢は「{ラベル}（{人数}人）」、人数の多い順。もう片方で選んでいるタグは選べない（`disabled`）
6. **保存の表示**：`flex items-center gap-1.5 text-adm-xs text-adm-done` に `IconCheck size={14}` と「変更は自動で保存されます」

誰も選んでいないときは、詳細のカードに `text-adm-sub` で「表の行を押すと、ここにその人の回答とシールが出ます。」。

### そのほか

- `PageFooter`：next は `{ href: '/admin/print', label: 'シールを印刷' }`
- 編集したときは `showToast` を出さない（自動保存の表示で十分）

## 画面別：タグを作る（`/admin/generate`）

**主役は5段階の進捗リスト。「おいとま」と「プログラム」の担当をバッジで分け、発表で役割分担が一目で分かるようにする。** 生成の再生（デモ用）も同じリストを使う。

```text
PageHeader  step=2  「タグを作る」
+-- カード：作り方 ------------------------------------------------------+
| 40人分の回答から作ります。1つの共有タグを約8人（4〜16人）で共有します。     |
| [練習モード] [接続を確かめる]                                              |
| [タグをまとめて作る]  [最初から作り直す]                                   |
+---------------------------------------------------------------------------+
+-- カード：進み具合 ------------------------------------------------------+
| (1) 話題の読み取り      [おいとま]   完了     40 / 40  [=========]  18秒 |
| (2) 共有タグの候補づくり [おいとま]   実行中    0 / 1   [==       ]   6秒 |
| (3) タグの当てはまり順  [おいとま]   待機中                                |
| (4) 割り当てと検証    [プログラム] 待機中                                |
| (5) 会場の傾向まとめ    [おいとま]   待機中                                |
|   候補のタグ：#ごはん屋開拓勢 #体を動かしたい …                                |
|   ▸ 詳細（呼び出しの記録、作り方の設定）                                    |
+---------------------------------------------------------------------------+
PageFooter  next=「確認・修正」（完了するまで disabled）
```

### 見出し

`PageHeader`：step 2、title「タグを作る」、description「おいとまが全員の回答を読み、共有タグと個性タグを作ります。人数によっては数分かかります。」

### カード：作り方（`Card` に `flex flex-col gap-4 p-5`）

- 1行目：「{n}人分の回答から作ります。1つの共有タグを約{targetSize}人（{minSize}〜{maxSize}人）で共有します。」
- 2行目：モードのバッジ（mock：`Badge tone="neutral"`「練習モード」、live：`Badge tone="oitoma"`「おいとまに接続中」）と secondary sm ボタン「接続を確かめる」。結果はその右に `text-adm-sm`：成功なら「つながりました（{model}、{ms}ミリ秒）」（`text-adm-done`）、失敗なら「おいとまに接続できません。学内ネットワークかOU-VPNにつないでください。」（`text-adm-danger`）
- 3行目：操作ボタン（`flex flex-wrap gap-2`）。状態ごとに出し分ける

| 状態 | 出すボタン |
| --- | --- |
| まだ作っていない | primary「タグをまとめて作る」 |
| 途中で止まった（中止・エラー） | primary「続きから作る」、secondary「最初から作り直す」 |
| 実行中 | secondary「中止する」だけ |
| 完了 | secondary「最初から作り直す」、secondary「共有タグだけ作り直す」（作っていれば） |

「最初から作り直す」「共有タグだけ作り直す」は、手で直した人がいるとき `ConfirmDialog`（title「作り直しますか？」、body「手で直した{n}人分のタグも作り直しになります。」、confirmLabel「作り直す」、tone danger）を出す。

### カード：進み具合（`Card` に `p-5`、見出し `CardTitle`「進み具合」）

5行の `<ol className="flex flex-col">`。各行は `grid grid-cols-[32px_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-adm-divider py-3 last:border-b-0`。

| 場所 | 中身 |
| --- | --- |
| 1列目 | 丸い番号（`flex size-8 items-center justify-center rounded-full text-adm-sm font-bold`）。待機中：`border-[1.5px] border-adm-line-strong text-adm-sub`、実行中：`bg-adm-primary text-white`、完了：`bg-adm-done text-white` に `IconCheck`、エラー：`bg-adm-danger text-white` に「!」、スキップ：`bg-adm-field text-adm-sub` |
| 2列目の上段 | 段階の名前（`font-bold`）と担当バッジ（`Badge tone="oitoma"`「おいとま」か `Badge tone="neutral"`「プログラム」） |
| 2列目の下段 | 進み具合のバー（`h-2 rounded-full bg-adm-field` の中に `bg-adm-primary`、幅は done/total）。待機中は出さない |
| 3列目 | 状態の言葉（待機中／実行中／完了／エラー／スキップ）、件数「24 / 40」、経過秒「18秒」。`text-right text-adm-sm text-adm-sub tabular-nums` |

| 番号 | 段階の名前 | 担当 |
| --- | --- | --- |
| 1 | 話題の読み取り | おいとま |
| 2 | 共有タグの候補づくり | おいとま |
| 3 | タグの当てはまり順 | おいとま |
| 4 | 割り当てと検証 | プログラム |
| 5 | 会場の傾向まとめ | おいとま |

リストの下に、途中経過を出す（どちらも `flex flex-wrap gap-1.5`、小見出し `text-adm-sm font-bold text-adm-ink2`）。

- 段階2が終わったら「候補のタグ（{n}個）」：`TagChip kind="shared"` を並べる
- 段階4が終わったら「採用した共有タグ（{n}個）」：人数の多い順に `TagChip kind="shared"` と `text-adm-xs text-adm-sub` の「{n}人」。採用されなかった候補は出さない

その下に `<details>`（見出し `<summary>` は `cursor-pointer text-adm-sm text-adm-ink2`「詳細（呼び出しの記録、作り方の設定）」）。中に「おいとまの呼び出し {n}回・平均 {s}秒・やり直し {n}回」と、作っていれば目安の上書きの入力欄。

### 完了したとき・失敗したとき

- 完了：進み具合カードの上に `Notice tone="success"`。title「タグができました」、本文「{n}人に、{k}個の共有タグを割り当てました。」、actionに secondary sm「生成の流れを見る（デモ用）」（`IconPlay`）。`PageFooter` の「次へ：確認・修正」を押せるようにする
- 失敗：`Notice tone="danger"`。title「{段階の名前}で止まりました」、本文にサーバーからの理由、actionに primary sm「続きから作る」

### 生成の流れを見る（デモ用の再生、`GenerationReplay`）

- 押すと、進み具合カードの上に `Notice tone="info"`：title「デモ用の再生中です」、本文「実際の生成：合計{m}分{s}秒、おいとまの呼び出し{n}回」、actionに secondary sm「スキップ」
- 進み具合リストと途中経過は、本番と同じ部品で動かす（動き方は仕様書「生成の様子の再生」のとおり）。各行の経過秒の代わりに「実際 {n}秒」を出す
- 動きは幅と数字の変化だけ。弾む・回るなどの飾りの動きは付けない

## 画面別：回答を読み込む（`/admin/import`）

**最初は「ファイルを選ぶ」大きな点線の枠だけを見せ、ファイルを選んだら「列の割り当て → 集計 → プレビュー → 読み込む」の順に縦に並べる。**

```text
PageHeader  step=1  「回答を読み込む」
+- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+
|                       ↑（IconUpload）                        |
|                 [ Excelファイルを選ぶ ]                     |
|        ここにファイルをドラッグしても読み込めます（.xlsx）       |
+- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -+
まず試してみるとき：[サンプル（40人）で試す] [サンプル（200人）で試す]

（ファイルを選んだあと）
[読み込む人数 40人][回答あり 35人][同意なし 2人][名前が空で除外 0行]
+-- カード：列の割り当て --+   +-- カード：先頭10行のプレビュー --+
+--------------------------+   +-------------------------------+
PageFooter  左の代わりに [この内容で読み込む]、読み込んだら next=「タグを作る」
```

### 見出し

`PageHeader`：step 1、title「回答を読み込む」、description「参加登録フォーム（Microsoft Forms）の回答をExcelで書き出し、ここで読み込みます。」

### ファイルを選ぶ枠

- 外枠：`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-adm-line-strong bg-adm-surface px-6 py-12 text-center`。ファイルを重ねているあいだは `border-adm-primary bg-adm-primary-soft`
- 中身：`IconUpload size={32}`（`text-adm-sub`）、primary md の「Excelファイルを選ぶ」（隠した `<input type="file" accept=".xlsx">` を開く）、`text-adm-sm text-adm-sub` で「ここにファイルをドラッグしても読み込めます（.xlsx）」
- ドラッグ＆ドロップは `onDragOver`（`preventDefault`）と `onDrop` で受け、ボタンから選んだときと同じ処理に渡す
- 枠の下に `flex flex-wrap items-center gap-2 text-adm-sm text-adm-sub`：「まず試してみるとき：」と secondary sm の「サンプル（40人）で試す」「サンプル（200人）で試す」
- すでに読み込んだ回答があるときは、枠の上に `Notice tone="info"`：title「{n}人分を読み込み済みです」、本文「別のファイルを読み込むと、今の回答とタグは置き換わります。」

### ファイルを選んだあと

1. **集計**：`StatCard` を4枚。「読み込む人数」「回答あり」「同意なし」「名前が空で除外」（unitは人、最後だけ行）。同意なしが1人以上なら note「この人たちの回答は使いません」
2. **注意**：`toParticipants` の `warnings` があれば `Notice tone="warn"` で箇条書き
3. **2つのカードを横に**（`flex flex-wrap items-start gap-5`）
   - 「列の割り当て」（`flex-[1_1_360px]`、`CardTitle` の下に `text-adm-sm text-adm-sub`「自動で選んだ列が違うときだけ直してください。」）：表の列は「項目」「Excelの列」（選択欄）「1行目の値」。名前の行には `Badge tone="danger"`「必須」。選択肢の先頭は「（使わない）」
   - 「先頭10行のプレビュー」（`flex-[999_1_480px] overflow-hidden`）：名前・所属・区分・自己紹介（先頭30文字＋「…」）・一言・同意（「あり」／ `Badge tone="warn"`「なし」）。表の作りは確認・修正画面と同じ
4. **読み込む**：カードの下、右寄せに primary lg「この内容で読み込む（{n}人）」。生成結果があるときは `ConfirmDialog`（title「読み込み直しますか？」、body「今のタグと手で直した内容は消えます。先に作業データを保存しておくと戻せます。」、confirmLabel「読み込む」、tone danger）
5. 読み込んだら `Notice tone="success"`「{n}人分を読み込みました」を出し、`PageFooter` の「次へ：タグを作る」を押せるようにする

### エラー（`Notice tone="danger"`、枠の上に出す）

| 場合 | title | 本文 |
| --- | --- | --- |
| .xlsxでない | Excelファイル（.xlsx）を選んでください | Formsの「回答」タブにある「Excelで開く」で保存したファイルを使います。 |
| 見出し行がない | 表の見出しが見つかりません | 1行目に質問の見出しがあるか確かめてください。 |
| 6人未満 | 人数が少なすぎます（{n}人） | 共有タグを作るには6人以上必要です。 |
| 300人超え | 人数が多すぎます（{n}人） | 300人までにしてください。 |

## 画面別：シールを印刷、保存・バックアップ

**印刷は「左：設定、右：用紙のプレビュー」、保存・バックアップは「用途ごとのカード3枚」。** 印刷するときは用紙以外をすべて隠す（シールと印刷用CSSの中身は変えない）。

### シールを印刷（`/admin/print`）

```text
PageHeader  step=4  「シールを印刷」
+-- 設定（300px） --------+   +-- プレビュー --------------------------+
| 用紙                    |   | A4 5枚（40人）                        |
|  (●) 24面 66.0×33.9mm   |   |  +---------+  +---------+            |
|  ( ) 21面 70.0×42.3mm   |   |  | 用紙 1  |  | 用紙 2  |  …         |
| 位置の調整 X [-][0.0][+] |   |  +---------+  +---------+            |
| すき間 X [-][0.0][+]      |   |                                      |
| [ ] 共有タグに人数を出す  |   |                                      |
| [位置合わせ用の試し刷り] |   |                                      |
| [ 印刷する ]              |   |                                      |
| 印刷のしかた 1…4          |   |                                      |
+------------------------+   +--------------------------------------+
```

- `PageHeader`：step 4、title「シールを印刷」、description「1人分のシール3枚が横1行に並びます。印刷したら行ごとに切って、受付で渡します。」
- 左右を包む列：`flex flex-wrap items-start gap-5`
- **設定のカード**（`flex-[1_1_300px] p-5 flex flex-col gap-4`、`print:hidden`）
  - 「用紙」：選べるカード2枚（`<label>` の中に `<input type="radio" className="size-4 accent-adm-primary">`、外枠 `flex items-start gap-3 rounded-lg border border-adm-line-strong p-3`、選ばれていれば `border-2 border-adm-primary bg-adm-primary-soft`）。中は「A4 24面ラベル」（`font-bold`）と「66.0×33.9mm・1枚で8人分」（`text-adm-xs text-adm-sub`）、21面は「70.0×42.3mm・1枚で7人分」
  - 「位置の調整（mm）」「すき間（mm）」：それぞれXとYの2つ。各欄は `flex items-center gap-1` に secondary sm の「−」、数字の入力欄（`w-20 text-center`、0.5刻み）、secondary sm の「＋」。ボタンには `aria-label`（例：「横の位置を 0.5mm 小さく」）
  - チェックボックス「共有タグに会場の人数を出す」（作っていれば）
  - secondary md「位置合わせ用の試し刷り」（`IconPrinter`）と、その下に primary lg「印刷する」（`IconPrinter`、`w-full`）
  - 「印刷のしかた」（`text-adm-sm font-bold`）と番号付きリスト（`list-decimal pl-5 text-adm-sm text-adm-ink2`）：① Chromeの印刷画面で用紙を「A4」② 余白を「なし」③ 倍率を「100%」④「背景のグラフィック」をオン。その下に `Notice tone="info"` で「刷ったら行ごとに切り、左のシールの名前を見て本人に渡します。」
- **プレビューのカード**（`flex-[999_1_480px] p-5`）：上に `CardTitle`「A4 {枚数}枚（{人数}人）」。中は今の `StickerSheet` を `FitToWidth` で縮めて縦に並べる。各用紙の外側に `rounded border border-adm-line bg-white` の枠と、上に `text-adm-xs text-adm-sub` で「用紙 {n}」
- 印刷時：設定カード、見出し、`PageFooter`、左メニューは `print:hidden`。プレビューカードは `print:border-0 print:p-0` で枠を消し、用紙だけが出るようにする
- `PageFooter`：next なし

### 保存・バックアップ（`/admin/data`）

- `PageHeader`：step なし、title「保存・バックアップ」、description「作業データをファイルに保存したり、公開ページ用のファイルを書き出したりします。」
- カード3枚を縦に並べる（どれも `Card` に `flex flex-col gap-3 p-5`、先頭に `CardTitle` と説明 `text-adm-sm text-adm-ink2`）

| カード | 説明 | 中身 |
| --- | --- | --- |
| 作業データ | 発表や別のPCで続きをするときに使います。回答とタグをすべて含むので、他の人には渡さないでください。 | primary「作業データを保存」（`IconSave`）、secondary「保存した作業データを開く」。下に `text-adm-xs text-adm-sub`「このPCに保存中のデータ：約{n}KB」。開くときは `ConfirmDialog`（title「保存した作業データを開きますか？」、body「今のデータは置き換わります。」、confirmLabel「開く」）。成功したら `showToast('作業データを開きました')` |
| 公開ページ用のファイル | QRで開く公開ページに載せるデータです。自己紹介と一言は入りません。 | チェックボックス「名前を伏せる（おすすめ）」（既定オン）、secondary「公開ページ用のファイルを書き出す」。下に `Notice tone="info"`「書き出した published.json で src/data/published.json を置き換えてpushすると、公開ページに反映されます。」 |
| このPCからデータを消す | イベントが終わったら消してください。消すと元に戻せません。 | このカードだけ外枠を `border-adm-danger-line bg-adm-danger-bg`。danger「このPCからデータを消す」（`IconTrash`）→ `ConfirmDialog`（title「すべてのデータを消しますか？」、body「回答、タグ、手で直した内容がこのPCから消えます。元には戻せません。」、confirmLabel「消す」、tone danger） |

- `PageFooter`：next なし

## 状態の表示

**どの画面でも、「今どうなっていて、次に何を押せばいいか」を1枚のカードかお知らせ欄で示す。** 空白の画面や、英語のエラー文をそのまま出さない。

| 状態 | 表示 |
| --- | --- |
| 保存データの復元中 | 本体に `Card` を置き、中央に `text-adm-sub` で「読み込み中…」。`PageHeader` は出してよい |
| 前の手順がまだ | `PageHeader` の下に「前の手順の案内」カードだけを出す（下の表）。その画面のほかのカードは出さない |
| サーバーやおいとまのエラー | `Notice tone="danger"`。titleに何が起きたか、本文にどうすればよいか、actionにやり直しのボタン |
| ブラウザに保存できない（`saveError`） | 本体の一番上に `Notice tone="warn"`：title「このPCのブラウザに保存できませんでした」、本文「念のため、作業データをファイルに保存してください。」、action「作業データを保存」 |
| 保存・書き出しに成功 | `showToast`（3秒で消える） |
| 消す・置き換える前 | `ConfirmDialog`（各画面の節に書いた文言） |

### 「前の手順の案内」カード

`Card` に `flex flex-col items-center gap-3 px-6 py-12 text-center`。中に `CardTitle`、`text-adm-ink2` の説明、primary md のリンクボタン。

| 画面 | 条件 | 見出し | 説明 | ボタン |
| --- | --- | --- | --- | --- |
| タグを作る | 参加者が0人 | まだ回答を読み込んでいません | 参加登録フォームの回答を先に読み込みます。 | 1 回答を読み込むへ |
| 確認・修正 | 参加者が0人 | まだ回答を読み込んでいません | 参加登録フォームの回答を先に読み込みます。 | 1 回答を読み込むへ |
| 確認・修正 | 生成がまだ | まだタグを作っていません | おいとまでタグを作ってから、ここで確認します。 | 2 タグを作るへ |
| シールを印刷 | 生成がまだ | まだタグを作っていません | タグを作ってから印刷します。 | 2 タグを作るへ |

### エラー文の置き換え（画面に出すとき）

| もと | 画面に出す title | 本文 |
| --- | --- | --- |
| 通信エラー、タイムアウト | おいとまに接続できません | 学内ネットワークかOU-VPNにつないでいるか確かめてください。 |
| 401・403 | おいとまのキーが使えません | おいとまの「APIキー発行」でキーを作り直し、.env.local に入れてください。 |
| 429・5xx | おいとまが混み合っています | 数分待ってから「続きから作る」を押してください。 |
| その他 | うまくいきませんでした | もう一度試してください。続くときは、画面の写真を機能の担当者に送ってください。 |

## 言葉の置き換え表

**画面には右の列の言葉だけを出す。** コードの変数名や関数名はそのままでよい。表にない専門用語（JSON、localStorage、API、モック、LLMなど）も画面には出さない。

| 今の言葉・仕様書の言葉 | 画面に出す言葉 |
| --- | --- |
| 取り込み | 回答を読み込む |
| 生成、タグの一括生成 | タグを作る、タグをまとめて作る |
| 続きから生成 | 続きから作る |
| 確認 | 確認・修正 |
| 印刷 | シールを印刷 |
| データ | 保存・バックアップ |
| 状態を書き出す | 作業データを保存 |
| 状態を読み込む、生成済みの結果を読み込む | 保存した作業データを開く |
| 公開用データ、published.json（ボタン） | 公開ページ用のファイル |
| すべて消去 | このPCからデータを消す |
| MOCK、モック | 練習モード |
| LIVE | おいとまに接続中 |
| 接続確認 | 接続を確かめる |
| 生成の再生 | 生成の流れを見る（デモ用） |
| 要確認 | 確認が必要 |
| no\_answer | 回答なし |
| no\_consent | 掲載の同意なし |
| ng\_word | 気になる言葉あり |
| fallback\_personal、fallback\_shared | 自動で補ったタグ |
| 共通タグ仲間 | 共通の話題がある人 |
| 下限未満、上限超え | 少なすぎ、多すぎ |
| 生成パラメータ | 作り方の設定 |
| 待機中／実行中／完了／エラー／スキップ | そのまま使う |

個性タグ・共有タグ・遭遇率はこのアプリの言葉なのでそのまま使い、初めて出る場所に `HelpTip` を付ける。

## 実装の順番と完了条件

**U0からU7まで、1つずつ進めてコミットし、止まる。発表で一番映る「確認・修正」をU2・U3で先に仕上げる。** どの段階でも、完了条件の最後は `npm run verify` が通ること。コミットのメッセージは「UI-U2: 確認・修正（参加者タブ）」の形にする。

| 段階 | 作るもの | 完了条件（エージェントが確かめる） | 人が目で確かめること |
| --- | --- | --- | --- |
| U0 部品 | `globals.css` の `@theme`、`admin/fonts.ts`、`ui/icons.tsx`、共通部品11個。確かめるための `/admin/ui`（部品を全部並べたページ。メニューには出さない） | `/admin/ui` に全部品と全バリエーションが出る。コードに `#` で始まる色の直書きと `shadow-` がない（`globals.css` を除く） | ボタン・チップ・バッジの色と形が見本の画像と同じか |
| U1 骨組み | `AdminShell`、`PageHeader`、`PageFooter`。`admin/layout.tsx` を差し替え、全画面に見出しと次へを付ける（中身はまだ今のままでよい） | 5つの画面すべてで左メニューの「今いる」と✓が正しい。Chromeの印刷プレビューで左メニューと見出しが出ない | 幅1280pxで左メニューが240pxほどで固定されているか |
| U2 確認・修正（参加者） | 数字カード、参加者の表、詳細パネル | サンプル40人で：行を押すと詳細が変わる。「確認が必要な人だけ」で絞れる。名前検索が効く。個性タグや共有タグを変えると数字カードがすぐ変わる | `docs/design/review-participants.png` と並べて違和感がないか |
| U3 確認・修正（共有タグ） | 「共有タグ」タブと `CountBar` | 人数の多い順に並ぶ。下限の縦線が正しい位置にある。「名前を変える」でラベルが変わり、参加者タブにも反映される。メンバーの名前を押すとその人を選んだ参加者タブに移る | `docs/design/review-shared-tags.png` と並べて違和感がないか |
| U4 タグを作る | 作り方カード、進み具合リスト、完了・失敗のお知らせ、生成の再生の見た目 | 練習モードで：生成が最後まで進み、担当バッジが正しい。中止→続きから作るが動く。再生で約10秒で進み、「スキップ」で最後まで飛ぶ | 発表のスクリーン（1280×720）で文字が読めるか |
| U5 回答を読み込む | ファイルを選ぶ枠、集計、列の割り当て、プレビュー、エラー | サンプル40人で「40人・同意なし2人」と出る。.xlsxでないファイルでエラーの文言が出る。ドラッグ＆ドロップでも読める | 職員が初めて開いても、何を押せばいいか分かるか |
| U6 シールを印刷 | 設定カードとプレビューカード | Chromeの印刷プレビューで、24面なら40人がA4 5枚に並ぶ（仕様書の受け入れ確認の手順7と同じ結果）。用紙以外は印刷されない | 試し刷りで位置が変わっていないか |
| U7 保存と状態 | 保存・バックアップ画面、前の手順の案内、エラー文の置き換え、通知 | 「このPCからデータを消す」の後、各画面に案内カードが出る。保存→消す→開くで元に戻る。仕様書（SPEC.md）の受け入れ確認2〜8がすべて通る | 最初から最後まで通して使ってみて、迷うところがないか |

### 人が最初にやること

1. この仕様書をMarkdownで書き出し、リポジトリの `docs/UI.md` に置く。
2. デザイン案のキャンバスから「案A 学内システム風」を `docs/design/review-participants.png`、「案A＋C 共有タグタブ」を `docs/design/review-shared-tags.png` として画像で書き出して置く。
3. この2つをコミットしてから、下の指示を送る。

### エージェントへの指示文

最初の1回：

```text
docs/UI.md（管理画面のデザイン仕様書）を最後まで読み、docs/design/ の画像も見てください。
「実装の順番と完了条件」のU0だけを実装し、完了条件を確かめたら「UI-U0: 部品」のようなメッセージでコミットし、何を確かめたかを報告して止まってください。pushはしないでください。
src/lib、データの形、公開トップ、シールの見た目は変えないでください。
仕様にない判断は docs/DECISIONS.md に1行で残してください。
```

2回目から：

```text
UI-U1に進んでください。完了条件を確かめたらコミットして止まってください。
```

見た目を直してほしいときは、画面の写真を添えて「この部分が docs/UI.md の「○○」と違う」と節の名前を示して頼む。仕様書を直したときは、`docs/UI.md` も書き出し直して差し替える。

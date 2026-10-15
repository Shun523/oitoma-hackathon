# 4分発表：学内AI おいとまで、名札に話題を足す（v2）

- [PowerPoint本体](oitoma-4min-v2.pptx)：16:9、全14枚（本編11枚＋質疑用付録3枚）。文字・図はすべて編集できる図形で、全枚に発表者ノートを入れてある。
- [PDF版](oitoma-4min-v2.pdf)：フォント埋め込み済み。BIZ UDPゴシックのないPCではこちらを使う。
- [発表者ノート](speaker-notes.md)：各スライドの読み上げ原稿、時間、説明ポイント、次へのつなぎ、根拠、確認の区分、想定質問。
- [構成・必須要素の対応・参照資料](outline-and-sources.md)
- [検査結果](quality-check.md)
- [全ページの一覧](previews/contact-sheet.png)

本編は1〜11枚目で約4分（読み上げ原稿1,178字）。12〜14枚目（付録A1〜A3）は質疑で使う。自動送りは設定していない。

デザインはアプリのシールに合わせた。黒地は個性タグ、白地にオレンジ枠は共有タグとアプリ（コード）、紺はおいとまを表す。フォントは Windows 10 以降に標準で入っている BIZ UDPゴシック（コードは BIZ UDゴシック）。

同じフォルダにはないが、`docs/presentation/` に別の版（10枚、python-pptx製）がある。こちらはそれとは独立に作った。

## PowerPointで編集する

Windowsのコピーを `C:\Users\Siita\Downloads\oitoma-4min-v2.pptx` に置いた（リポジトリの版とは同期しない）。

- 文字・箱・矢印はすべてPowerPointの図形で、画像ではない。そのまま書き換え・移動・色変更ができる。
- タイトルはレイアウトのプレースホルダー。スライドを足すときは「ホーム → 新しいスライド」でレイアウト「本文」（白地）、「表紙」「まとめ」（濃色）を選ぶ。
- 図の矢印はコネクタで、両端の箱に付いている。箱を動かすと矢印が付いてくる（7枚目の「③をやり直す」の折れ線だけは3本の線）。
- 文字は日本語（ja-JP）として扱われるので、赤い波線は出ない。新しく足した文字もテーマのBIZ UDPゴシックになる。
- 発表者ノートは「表示 → ノート」で編集できる。

PowerPointで編集を始めたら、そのファイルが正本になる。`build_deck.js` を実行し直すと手で直した内容は上書きされるので、作り直すときは編集した内容を先に生成元へ反映する。

## 作り直す

生成元は `build_deck.js`（pptxgenjs 3.12.0）。アプリの `package.json` には依存を足していないので、pptxgenjs は別のフォルダに入れて `NODE_PATH` で指す。

```bash
mkdir -p /tmp/deck-tools && (cd /tmp/deck-tools && npm init -y >/dev/null && npm install pptxgenjs@3.12.0)
NODE_PATH=/tmp/deck-tools/node_modules APPLY_THEME_JS=<pptxスキル>/scripts/apply_theme.js node build_deck.js
```

`oitoma-4min-v2.pptx`、`speaker-notes.md`、`slide-data.json` が更新される。`APPLY_THEME_JS` を省くと、テーマの配色は Office 既定のままになる（スライド上の色は変わらない）。

PDFとプレビュー画像は、LibreOffice Impress 24.2 で変換し、PyMuPDF で画像にした。BIZ UDフォント（Google Fontsで配布されているOFL版）を fontconfig に登録して変換している。

説明例（カレー／ラーメンの回答とタグ、名札の人物）は架空。実回答・APIキーは資料に使っていない。

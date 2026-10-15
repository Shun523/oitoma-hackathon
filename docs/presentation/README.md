# 4分発表：学内AIおいとまで、名札に話題を足す

- [PowerPoint本体](oitoma-4min.pptx)：編集可能な文字・図形で作成。全10枚に発表者ノートを埋め込み済み。
- [PDF版](oitoma-4min.pdf)：実際のPPTXをLibreOffice Impressで変換した投影・閲覧用。
- [発表者ノート](speaker-notes.md)：時間配分、読み上げ原稿、図の説明、つなぎ、出典、想定質問。
- [構成・必須要素対応・参照資料](outline-and-sources.md)：分析、全スライドの主張と根拠、確認区分と制約。
- [検査結果](quality-check.md)：文字量・フォント・レンダリング・技術整合・必須要素の確認。
- [全ページの一覧画像](previews/contact-sheet.png)：PPTXから出力したPDFを画像化したもの。

本編は1〜8枚目、合計4分。8枚目で発表を終え、9・10枚目は質疑に応じて使用する。自動送りは設定していない。読み上げ原稿は計1,346文字で、図を指す間とスライド切り替えを含めた時間配分をノートに記載している。

PowerPointでは「表示」→「ノート」または発表者ツールで各ページの原稿と根拠を参照できる。フォントはIPAexGothic。PPTXにフォントそのものは埋め込んでいないため、表示環境で代替フォントになる場合はPDF版でレイアウトを確認する。

説明例は架空の回答とタグ。実回答・APIキーは資料に使用していない。成果の数値は今回の自動テストと日付を示した過去のmock検証に限定している。

## 再生成

生成元は `build_presentation.py`。Python 3.12、python-pptx 1.0.2、Pillow 12.3.0で作成した。スライドは画像の貼り付けではなく、ネイティブのテキスト・図形・矢印で構成する。

```bash
python3 build_presentation.py
```

同じフォルダのPPTX・ノート・スライドデータ・事前検査JSONを更新する。事前検査は本文文字数、文字幅、文字サイズ、スライド境界、合計時間を確認する。文字幅の検査にはシステムのIPAexGothicフォントを使う。

PPTXの生成後、LibreOffice Impress 24.2.7.2でPDFへ変換した。

```bash
libreoffice --headless --convert-to pdf:impress_pdf_Export --outdir . oitoma-4min.pptx
python3 inspect_presentation.py
```

`inspect_presentation.py` はPyMuPDF 1.28.2を使い、PPTXとPDFのページ数・表示テキスト・全ノート・PDF文字の境界を確認し、全10ページをPNG化する。今回の生成・変換用ツールは `/tmp` に用意し、アプリの `package.json`・ロックファイルは変更していない。

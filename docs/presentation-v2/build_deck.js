// 発表資料（4分・開発成果報告）を生成する。
// 実行：NODE_PATH=<pptxgenjsを入れたnode_modules> node build_deck.js
// 出力：oitoma-4min-v2.pptx / speaker-notes.md / slide-data.json
// アプリの package.json には依存を足さない（pptxgenjs は作業用フォルダに置く）。
"use strict";
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT_DIR = __dirname;
const DECK = path.join(OUT_DIR, "oitoma-4min-v2.pptx");
const APPLY_THEME = process.env.APPLY_THEME_JS; // pptxスキルの scripts/apply_theme.js

// ---- テーマ（アプリのシールの配色：個性=#222、共有=白地に#E4572E の枠） ----
const FONT = "BIZ UDPGothic"; // Windows 10以降に標準搭載。投影時の判読性を優先
const MONO = "BIZ UDGothic"; // 等幅。コード中の日本語も全角2文字幅でそろう
const THEME = {
  name: "Oitoma Katsuyouchu",
  headFontFace: FONT,
  bodyFontFace: FONT,
  colors: {
    dk1: "222222", // 本文・個性タグ
    lt1: "FFFFFF",
    dk2: "1F3A5F", // おいとま（学内AI）
    lt2: "F3F4F6", // カード地
    accent1: "E4572E", // アプリの強調色・共有タグ・コード
    accent2: "5B6270", // 補足文字・線
    accent3: "B4401A", // 小さい強調文字（白地で読める濃さ）
    accent4: "E9EEF5", // おいとまの淡色
    accent5: "FDEDE7", // 強調の淡色
    accent6: "1C1C1E", // 表紙・まとめの地
    hlink: "1F3A5F",
    folHlink: "5B6270",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.title = "#おいとま活用中 — 学内AI おいとまで名札に話題を足す";
pres.subject = "開発成果報告（4分）";
pres.author = "#おいとま活用中 開発チーム";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
const C = pres.SchemeColor;
const INK = C.text1, WHITE = C.background1, NAVY = C.text2, CARD = C.background2;
const ORANGE = C.accent1, MUTED = C.accent2, ORANGE_INK = C.accent3, NAVY_TINT = C.accent4;
const ORANGE_TINT = C.accent5, DARK = C.accent6;

const W = 13.333, MX = 0.7, CW = W - MX * 2; // 本文幅 11.933

// ---- レイアウト ----
pres.defineSlideMaster({
  title: "表紙",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 1.45, w: CW, h: 2.0, fontFace: FONT, fontSize: 44, bold: true, color: WHITE, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "本文",
  background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.98, w: CW, h: 0.86, fontFace: FONT, fontSize: 34, bold: true, color: INK, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.05, y: 6.98, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 12, color: MUTED, align: "right" },
});
pres.defineSlideMaster({
  title: "まとめ",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.95, w: CW, h: 1.0, fontFace: FONT, fontSize: 40, bold: true, color: WHITE, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.05, y: 6.98, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 12, color: C.accent2, align: "right" },
});

// ---- 部品 ----
// 全角1、半角0.55として幅を見積もる（BIZ UDPゴシックの欧文はプロポーショナル）
function units(s) {
  let u = 0;
  for (const ch of s) u += /[\x20-\x7E]/.test(ch) ? 0.62 : 1;
  return u;
}

function text(slide, t, o) {
  slide.addText(t, { fontFace: FONT, color: INK, margin: 0, isTextBox: true, valign: "top", ...o });
}

// 区分の札：共有タグのシールと同じ「白地＋オレンジの枠」
function chip(slide, label) {
  const fs = 16;
  const w = (units(label) * fs) / 72 + 0.6;
  slide.addText(label, {
    objectName: "section-tag", shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.2,
    x: MX, y: 0.42, w, h: 0.42, fill: { color: WHITE }, line: { color: ORANGE, width: 1.75 },
    fontFace: FONT, fontSize: fs, bold: true, color: ORANGE_INK, align: "center", valign: "middle", margin: 0, isTextBox: true,
  });
}

function title(slide, t) {
  slide.addText(t, { placeholder: "title" });
}

// 話題シール1枚。personal=黒地白文字、shared=白地＋オレンジ枠（src/components/Sticker.tsx と同じ配色）
function sticker(slide, kind, label, x, y, w, h, fontSize, name) {
  const personal = kind === "personal";
  slide.addText(`#${label}`, {
    objectName: name || `sticker-${kind}`, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1,
    x, y, w, h, fill: { color: personal ? INK : WHITE },
    line: personal ? { color: INK, width: 0 } : { color: ORANGE, width: 2.25 },
    fontFace: FONT, fontSize, bold: true, color: personal ? WHITE : INK, align: "center", valign: "middle", margin: 0.04, isTextBox: true,
  });
}

// 図の箱。kind: oitoma（紺地）/ app（オレンジ枠）/ plain（灰枠）/ human（灰地）
function box(slide, x, y, w, h, kind, runs, o = {}) {
  const style = {
    oitoma: { fill: NAVY, line: { color: NAVY, width: 0 }, color: WHITE },
    app: { fill: WHITE, line: { color: ORANGE, width: 2.25 }, color: INK },
    appStrong: { fill: ORANGE_TINT, line: { color: ORANGE, width: 3 }, color: INK },
    plain: { fill: WHITE, line: { color: MUTED, width: 1.25 }, color: INK },
    human: { fill: CARD, line: { color: CARD, width: 0 }, color: INK },
  }[kind];
  slide.addText(runs, {
    shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.12, x, y, w, h,
    fill: { color: style.fill }, line: style.line, fontFace: FONT, color: style.color,
    align: "center", valign: "middle", margin: 0.06, isTextBox: true, ...o,
  });
}

// connect: [始点の図形名, 接続点, 終点の図形名, 接続点]。接続点は 0上・1左・2下・3右。
// 生成後にPowerPointのコネクタへ変換し、箱を動かしても矢印が付いてくるようにする。
let currentConnectors = [];
function line(slide, x, y, w, h, o = {}) {
  const { color = MUTED, width = 2, arrow = true, beginArrow = false, dash, flipH, flipV, name, connect } = o;
  if (connect) currentConnectors.push({ name, from: connect[0], fromIdx: connect[1], to: connect[2], toIdx: connect[3] });
  slide.addShape(pres.shapes.LINE, {
    objectName: name, x, y, w, h, flipH, flipV,
    line: { color, width, dashType: dash, endArrowType: arrow ? "triangle" : undefined, beginArrowType: beginArrow ? "triangle" : undefined },
  });
}

// 1行＝1項目の箇条（記号なし。番号は別に置く）
function numbered(slide, items, x, y, w, rowH, o = {}) {
  const fs = o.fontSize || 24;
  items.forEach((t, i) => {
    const yy = y + i * rowH;
    if (o.highlight === i) {
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: `item-highlight-${i + 1}`, x: x - 0.2, y: yy - 0.14, w: w + 0.4, h: rowH - 0.12, rectRadius: 0.12, fill: { color: ORANGE_TINT }, line: { color: ORANGE_TINT, width: 0 } });
    }
    text(slide, String(i + 1).padStart(2, "0"), { objectName: `item-no-${i + 1}`, x, y: yy, w: 0.7, h: 0.5, fontSize: fs, bold: true, color: ORANGE_INK });
    text(slide, t, { objectName: `item-${i + 1}`, x: x + 0.8, y: yy, w: w - 0.8, h: rowH - 0.3, fontSize: fs, bold: o.highlight === i, color: INK, lineSpacingMultiple: 1.1 });
  });
}

// コード枠。lines は実コードの抜粋（省略は「…」で明示）。hl は強調する行番号（0始まり）
function codeBlock(slide, lines, x, y, w, o = {}) {
  const fs = o.fontSize || 15;
  const pitch = (o.pitchPt || 22) / 72; // 1行の高さ（in）
  const pad = 0.22;
  const h = pad * 2 + pitch * lines.length;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "code-panel", x, y, w, h, rectRadius: 0.1, fill: { color: CARD }, line: { color: CARD, width: 0 } });
  for (const i of o.hl || []) {
    slide.addShape(pres.shapes.RECTANGLE, { objectName: `code-highlight-${i + 1}`, x: x + 0.08, y: y + pad + pitch * i - 0.02, w: w - 0.16, h: pitch + 0.02, fill: { color: ORANGE_TINT }, line: { color: ORANGE_TINT, width: 0 } });
  }
  // 先頭の空白は保存時に詰められないよう、幅の同じ非改行空白にする
  const runs = lines.map((l, i) => ({
    text: l.replace(/^ +/, (m) => " ".repeat(m.length)) || " ",
    options: { breakLine: i < lines.length - 1 },
  }));
  slide.addText(runs, {
    objectName: "code", x: x + 0.2, y: y + pad, w: w - 0.3, h: pitch * lines.length,
    fontFace: MONO, fontSize: fs, color: INK, margin: 0, valign: "top", lineSpacing: o.pitchPt || 22, isTextBox: true,
  });
  if (o.source) {
    text(slide, o.source, { objectName: "code-source", x, y: y + h + 0.08, w, h: 0.32, fontSize: 14, color: MUTED });
  }
  return h;
}

// ---- スライドと発表者ノート ----
// script：読み上げ原稿（時間の見積もりに使う）。ほかは発表者ノートの各節。
const slides = [];
function add(def) { slides.push(def); }

// 1. 表紙
add({
  section: "導入", layout: "表紙", main: true,
  title: "名札に「話題」を足して、\n肩書き以外の話から始める",
  claim: "学内AI おいとまで、交流会の自己紹介を話題シールに変えるアプリを作った",
  visual: "大きな結論＋実物と同じ配色のシール3枚",
  script: "「#おいとま活用中」です。学内AIのおいとまで、交流会の名札に“話題”を足し、肩書き以外の話から会話を始められるアプリを作りました。",
  points: "下のシール3枚は、アプリが印刷する実物と同じ配色（個性タグ＝黒地、共有タグ＝白地にオレンジ枠）。左が個性タグ1枚、右2枚が共有タグ。中身は説明用の架空例。",
  next: "まず、なぜこれを作ったのかという出発点から説明します。",
  sources: "docs/spec.md「概要とスコープ」／src/config/event.ts（appName、accentColor）／src/components/Sticker.tsx（シールの配色）／src/app/page.tsx（公開トップの見出し「名札に“話題”を足して、肩書き以外の話から始めよう」）",
  status: "実装確認：アプリ名・シールの配色。説明用の架空例：シールの文言（docs/PRESENTATION-TAG-GENERATION.md の例）。",
  qa: "",
  build(s) {
    text(s, "#おいとま活用中", { objectName: "app-name", x: MX, y: 0.85, w: 8, h: 0.5, fontSize: 24, bold: true, color: ORANGE });
    title(s, this.title);
    text(s, "学内AI おいとまで、交流会の自己紹介を話題シールに", { objectName: "subtitle", x: MX, y: 3.5, w: CW, h: 0.55, fontSize: 24, color: C.accent4 });
    // A4ラベル用紙の1行（1人分）。白い台紙に3枚
    const sw = 2.7, sh = 1.38, gap = 0.18, pad = 0.22;
    const pw = pad * 2 + sw * 3 + gap * 2, ph = pad * 2 + sh;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "label-sheet", x: MX, y: 4.55, w: pw, h: ph, rectRadius: 0.12, fill: { color: WHITE }, line: { color: WHITE, width: 0 } });
    sticker(s, "personal", "カレー屋を開拓中", MX + pad, 4.55 + pad, sw, sh, 19);
    sticker(s, "shared", "ごはん屋開拓勢", MX + pad + sw + gap, 4.55 + pad, sw, sh, 19);
    sticker(s, "shared", "体を動かしたい", MX + pad + (sw + gap) * 2, 4.55 + pad, sw, sh, 19);
    const cx = MX + pw + 0.35, cwid = W - MX - cx;
    text(s, [{ text: "個性タグ 1", options: { breakLine: true } }, { text: "＋ 共有タグ 2" }], { objectName: "sticker-caption", x: cx, y: 4.55 + ph / 2 - 0.62, w: cwid, h: 0.8, fontSize: 20, bold: true, color: WHITE, lineSpacingMultiple: 1.1 });
    text(s, "（説明用の架空例）", { objectName: "example-note", x: cx, y: 4.55 + ph / 2 + 0.28, w: cwid, h: 0.4, fontSize: 16, color: C.accent4 });
  },
});

// 2. 課題
add({
  section: "導入", layout: "本文", main: true, chip: "#課題",
  title: "話題づくりにAIを使いたい、でも回答は個人情報",
  claim: "会話のきっかけを作るにはAIで回答を読み解きたいが、回答は個人情報なので扱う場所が問題になる",
  visual: "名前と所属だけの名札（左）＋課題3点（右）。3点目を強調",
  script: "交流会の名札には、名前と所属しかありません。自己紹介から共通点を探せば話題になりますが、数十人、数百人分を手で読むのは大変です。そこでAIに任せたい。ただ、自己紹介は個人情報で、学外のAIには渡しにくい。",
  points: "左の名札は「名前と所属だけでは話題が見えない」ことの図示（人物・所属は架空）。3点目の『個人情報』が、後半の『おいとまを使う意義』（スライド9）につながる伏線。",
  next: "そこで、何を作ったのかを具体例で見せます。",
  sources: "docs/spec.md「概要とスコープ」（名札に話題シールを足す目的）／src/config/event.ts（参加者層：企業、研究者、学生、自治体関係者、PIPELINE.maxParticipants=300）／docs/spec.md「個人情報の扱い」",
  status: "仕様書記載：目的と参加者層、人数の上限300人。発表者の問題意識：手作業の大変さ・学外AIに渡しにくい点（効果の測定値ではない）。",
  qa: "Q：実際に会話は増えたのか？ → A：会場での会話促進効果はまだ測っていない。今後、実際の交流会で検証する。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    // 名札（名前と所属だけ）
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "name-card", x: MX, y: 2.35, w: 4.6, h: 2.9, rectRadius: 0.15, fill: { color: WHITE }, line: { color: MUTED, width: 1.5 } });
    text(s, "○○株式会社 開発部", { objectName: "name-card-affiliation", x: MX + 0.4, y: 2.85, w: 3.8, h: 0.45, fontSize: 20, color: MUTED });
    text(s, "岡山 花子", { objectName: "name-card-name", x: MX + 0.4, y: 3.45, w: 3.8, h: 0.8, fontSize: 44, bold: true });
    s.addText("？", { objectName: "question-mark", shape: pres.shapes.OVAL, x: MX + 3.85, y: 2.0, w: 0.95, h: 0.95, fill: { color: ORANGE }, line: { color: ORANGE, width: 0 }, fontFace: FONT, fontSize: 36, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
    text(s, "名札にあるのは名前と所属だけ", { objectName: "name-card-caption", x: MX, y: 5.45, w: 4.6, h: 0.4, fontSize: 18, color: MUTED, align: "center" });
    numbered(s, [
      "話のきっかけが、名札からは見えない",
      "数十〜数百人の自己紹介から共通点を探すのは、手作業では難しい",
      "自己紹介は個人情報。学外のAIには渡しにくい",
    ], 6.1, 2.45, 6.4, 1.45, { highlight: 2 });
  },
});

// 3. つくるもの
add({
  section: "導入", layout: "本文", main: true, chip: "#つくるもの",
  title: "回答から、会話の入口になる3枚のシールを作る",
  claim: "1人に個性タグ1つ＋共有タグ2つ。個性は「それ何？」、共有は「私も同じ」の入口",
  visual: "回答（左）→ シール3枚（右）を2人分。共有タグが2人で一致することを枠で示す",
  script: "そこで、Formsの回答から1人3枚の話題シールを作ります。黒い個性タグは、その人だけの話題で「それ、何ですか？」の入口。オレンジの共有タグは何人かと共通で、「私も同じです」の入口です。カレーとラーメンのように表現が違っても、意味でまとめます。",
  points: "AさんとBさんの共有タグは同じ2つ（ごはん屋開拓勢、体を動かしたい）。回答の言葉は違う（カレー屋／ラーメン、ランニング／サイクリング）が、意味の近さでまとまる。この『意味でまとめる』部分が、AIが必要な理由。例は説明用の架空例で、実際の出力ではない。",
  next: "このシールが、どういう流れで作られるかを見ます。",
  sources: "docs/PRESENTATION-TAG-GENERATION.md「回答がタグに変わる具体例」「発表で伝える一文」／src/lib/pipeline/sticker.ts（個性タグは候補の1つ目、なければ「話しかけてね」）／src/components/StickerSet.tsx（1人1行に3枚）／docs/spec.md「話題シールのデザインと印刷」（タグは全角12文字以内）",
  status: "実装確認：個性1＋共有2の構成、配色。説明用の架空例：回答とタグの文言。",
  qa: "Q：不適切なタグが出たら？ → A：生成後に主催者が確認・修正する。NG語（病、年収、宗教など14語）を含むタグには確認用の印が付く（自動では消さない）。プロンプトでも家族・健康・恋愛・収入・宗教・政治・容姿・年齢の話題を禁止している（src/config/ng-words.ts、src/lib/llm/prompts.ts）。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const ax = MX, aw = 3.85, sx = 5.05, sw = 2.38, sh = 1.2, gap = 0.2;
    const rowY = [2.95, 4.5];
    // 列の見出し
    text(s, [{ text: "個性タグ", options: { bold: true, breakLine: true } }, { text: "「それ、何ですか？」", options: { color: MUTED } }], { objectName: "head-personal", x: sx, y: 2.0, w: sw, h: 0.8, fontSize: 18, align: "center" });
    text(s, [{ text: "共有タグ", options: { bold: true, breakLine: true } }, { text: "「私も同じです」", options: { color: MUTED } }], { objectName: "head-shared", x: sx + sw + gap, y: 2.0, w: sw * 2 + gap, h: 0.8, fontSize: 18, align: "center" });
    text(s, "回答（説明用の架空例）", { objectName: "head-answer", x: ax, y: 2.38, w: aw, h: 0.4, fontSize: 18, bold: true });
    const rows = [
      { who: "A", answer: ["カレー屋を開拓中。", "最近ランニングを始めた"], personal: "カレー屋を開拓中" },
      { who: "B", answer: ["ラーメンの食べ歩きと", "サイクリングが好き"], personal: "サイクリング好き" },
    ];
    rows.forEach((r, i) => {
      const y = rowY[i];
      s.addText([{ text: `${r.who}さん　`, options: { bold: true } }, { text: r.answer[0], options: { breakLine: true } }, { text: r.answer[1] }], { objectName: `answer-${r.who}`, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x: ax, y, w: aw, h: sh, fill: { color: CARD }, line: { color: CARD, width: 0 }, fontFace: FONT, fontSize: 18, color: INK, valign: "middle", margin: 0.15, isTextBox: true });
      line(s, ax + aw + 0.12, y + sh / 2, sx - ax - aw - 0.24, 0, { name: `arrow-${r.who}`, connect: [`answer-${r.who}`, 3, `sticker-${r.who}-personal`, 1] });
      sticker(s, "personal", r.personal, sx, y, sw, sh, 18, `sticker-${r.who}-personal`);
      sticker(s, "shared", "ごはん屋開拓勢", sx + sw + gap, y, sw, sh, 18, `sticker-${r.who}-shared1`);
      sticker(s, "shared", "体を動かしたい", sx + (sw + gap) * 2, y, sw, sh, 18, `sticker-${r.who}-shared2`);
    });
    // 共有タグが2人で一致することを示す枠
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "shared-match", x: sx + sw + gap - 0.12, y: rowY[0] - 0.12, w: sw * 2 + gap + 0.24, h: rowY[1] + sh - rowY[0] + 0.24, rectRadius: 0.15, fill: { type: "none" }, line: { color: ORANGE, width: 1.75, dashType: "dash" } });
    text(s, [{ text: "表現が違っても、", options: {} }, { text: "意味の近い話題をまとめる", options: { bold: true, color: ORANGE_INK } }], { objectName: "message", x: MX, y: 6.15, w: CW, h: 0.5, fontSize: 24 });
  },
});

// 4. 全体の流れ（必須2）
add({
  section: "仕組み", layout: "本文", main: true, chip: "#処理の流れ",
  title: "Excelを読み込めば、印刷まで主催者の画面で完結",
  claim: "入力（Forms回答Excel）から出力（A4ラベル）まで、1つのWebアプリで進む。AIを使う中心は生成",
  visual: "左→右の5ノード。生成（おいとま）を紺で強調",
  script: "流れは、回答Excelの取り込み、おいとまでのタグ生成、主催者の確認・修正、A4ラベルへの印刷です。すべて主催者のブラウザで進み、中心は3番目の生成です。",
  points: "①Formsの「Excelで開く」で落としたxlsx。②名前・所属・区分・自己紹介・一言・同意の列を自動判定し、外れたら選び直せる。③後のスライドで詳しく説明。④回答とシールを見比べ、個性タグの書き換え、共有タグの差し替えができる。⑤A4・24面（66.0×33.9mm）のラベル用紙に1人1行で印刷し、行ごとに切って配る。生成の途中で止めても「続きから作る」で再開できる。",
  next: "中心の生成で、おいとまがどんな役割を持つかを説明します。",
  sources: "src/lib/import/forms.ts（列の自動判定、同意なしの回答を空にする）／src/app/admin/{import,generate,review,print}/page.tsx／src/config/event.ts SHEET_PRESETS.label24／README.md「生成から印刷まで」",
  status: "実装確認：5つの画面・操作と24面印刷。受け入れ確認（2026-10-12、mock）で一連の操作を確認済み。",
  qa: "Q：Formsと自動で連携する？ → A：しない。主催者がExcelを書き出して取り込む（仕様書「作らないもの」）。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const n = 5, aw = 0.36, y = 2.75, h = 2.0;
    const bw = (CW - aw * (n - 1)) / n;
    const nodes = [
      { k: "plain", a: "回答Excel", b: "Formsの書き出し" },
      { k: "plain", a: "取り込み", b: "列を自動判定" },
      { k: "oitoma", a: "タグ生成", b: "おいとま＋コード" },
      { k: "plain", a: "確認・修正", b: "主催者が編集" },
      { k: "plain", a: "印刷", b: "A4・24面ラベル" },
    ];
    nodes.forEach((nd, i) => {
      const x = MX + i * (bw + aw);
      text(s, String(i + 1), { objectName: `step-no-${i + 1}`, x, y: y - 0.5, w: bw, h: 0.4, fontSize: 20, bold: true, color: nd.k === "oitoma" ? NAVY : MUTED, align: "center" });
      box(s, x, y, bw, h, nd.k, [
        { text: nd.a, options: { fontSize: 24, bold: true, breakLine: true } },
        { text: nd.b, options: { fontSize: 16, color: nd.k === "oitoma" ? C.accent4 : MUTED } },
      ], { objectName: `step-${i + 1}` });
      if (i < n - 1) line(s, x + bw + 0.06, y + h / 2, aw - 0.12, 0, { name: `step-arrow-${i + 1}`, color: INK, connect: [`step-${i + 1}`, 3, `step-${i + 2}`, 1] });
    });
    text(s, "入力", { objectName: "label-in", x: MX, y: y + h + 0.15, w: bw, h: 0.4, fontSize: 18, color: MUTED, align: "center" });
    text(s, "出力：1人3枚", { objectName: "label-out", x: MX + 4 * (bw + aw) - 0.2, y: y + h + 0.15, w: bw + 0.4, h: 0.4, fontSize: 18, color: MUTED, align: "center" });
    text(s, [{ text: "生成のあと、", options: {} }, { text: "主催者が確認・修正してから印刷", options: { bold: true } }, { text: "する", options: {} }], { objectName: "message", x: MX, y: 6.0, w: CW, h: 0.5, fontSize: 24 });
  },
});

// 5. おいとまの役割（必須1）
add({
  section: "仕組み", layout: "本文", main: true, chip: "#おいとまの役割",
  title: "おいとまは「言葉の処理」だけを担当する",
  claim: "ブラウザが指揮、サーバーが中継と検証、おいとまは意味の判断だけ。数の計算と保存はアプリ",
  visual: "3ノードの構成図（ブラウザ → Next.jsサーバー → おいとま）と、各ノードの責務",
  script: "おいとまの役割です。主催者のブラウザが生成全体を指揮し、Next.jsのサーバーを通しておいとまを呼びます。サーバーはAPIキーを持ち、指示文を組み立て、返ってきたJSONを検証します。おいとまが担うのは、話題の読み取り、共有タグへの言い換え、当てはまりの判断。言葉の処理だけです。",
  points: "矢印は要求と応答の往復（両向き）。ブラウザ→サーバーは /api/llm/extract・catalog・rank・summary・regenerate、サーバー→おいとまは OpenAI互換の POST {OITOMA_BASE_URL}/chat/completions（SDKは使わずfetch）。APIキーはサーバーの環境変数だけにあり、ブラウザには渡さない。生成の指揮をブラウザに置くのは、1回の呼び出しを数人分に短く保ってタイムアウトに強くし、進捗表示と途中再開を作り、サーバーに状態を持たないため（仕様書）。",
  next: "では、おいとまをいつ呼ぶのかを説明します。",
  sources: "docs/spec.md「全体構成」「おいとま連携」／src/lib/pipeline/llm-api.ts（ブラウザのfetch）／src/app/api/llm/*/route.ts（入力をzodで検証、ログは task・ms・attempts・ok のみ）／src/lib/llm/client.ts 179–217行（/chat/completions、Authorization: Bearer）／src/lib/llm/prompts.ts",
  status: "実装確認：通信経路、キーの置き場所、JSON検証。モデル名は環境変数 OITOMA_MODEL で選ぶ（README の例は qwen3.8-27b-it）。当日の実行モデルは設定次第。",
  qa: "Q：どのモデル？ → A：OpenAI互換APIのモデルを環境変数で選ぶ。README の設定例は qwen3.8-27b-it（高品質）、速さ優先なら qwen3.6-35b-a3b-it。\nQ：なぜサーバーを挟む？ → A：キーをブラウザに配らないため。JSONの取り出し・検証・再試行と同時実行数の制限（同時3件、待機60件・120秒）を1か所にまとめるため。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const y = 2.4, h = 1.15, bw = 3.25, gap = (CW - bw * 3) / 2;
    const xs = [MX, MX + bw + gap, MX + (bw + gap) * 2];
    box(s, xs[0], y, bw, h, "app", [{ text: "主催者のブラウザ", options: { fontSize: 22, bold: true } }], { objectName: "node-browser" });
    box(s, xs[1], y, bw, h, "app", [{ text: "Next.js サーバー", options: { fontSize: 22, bold: true, breakLine: true } }, { text: "主催者のPC", options: { fontSize: 16, color: MUTED } }], { objectName: "node-server" });
    box(s, xs[2], y, bw, h, "oitoma", [{ text: "おいとま", options: { fontSize: 22, bold: true, breakLine: true } }, { text: "学内のLLM", options: { fontSize: 16, color: C.accent4 } }], { objectName: "node-oitoma" });
    const nodeNames = ["node-browser", "node-server", "node-oitoma"];
    [[0, "/api/llm/*"], [1, "/chat/completions"]].forEach(([i, label]) => {
      const x1 = xs[i] + bw + 0.08, len = gap - 0.16;
      line(s, x1, y + h / 2, len, 0, { name: `api-arrow-${i}`, color: INK, width: 2.25, beginArrow: true, connect: [nodeNames[i], 3, nodeNames[i + 1], 1] });
      text(s, label, { objectName: `api-label-${i}`, x: x1 + len / 2 - 1.2, y: y - 0.44, w: 2.4, h: 0.34, fontFace: MONO, fontSize: 16, color: MUTED, align: "center" });
    });
    const cards = [
      { k: "app", items: ["生成の指揮・再開", "人数の計算・割り当て", "結果をブラウザに保存"] },
      { k: "app", items: ["APIキーを保持", "指示文を組み立て", "JSONを検証・再試行"] },
      { k: "oitoma", items: ["話題の読み取り", "共有タグへの言い換え", "当てはまりの判断"] },
    ];
    cards.forEach((c, i) => {
      const fill = c.k === "oitoma" ? NAVY_TINT : CARD;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: `duty-card-${i + 1}`, x: xs[i], y: 3.8, w: bw, h: 1.85, rectRadius: 0.12, fill: { color: fill }, line: { color: fill, width: 0 } });
      text(s, c.items.map((t, j) => ({ text: t, options: { breakLine: j < c.items.length - 1 } })), { objectName: `duty-${i + 1}`, x: xs[i] + 0.25, y: 3.8, w: bw - 0.35, h: 1.85, fontSize: 20, valign: "middle", lineSpacingMultiple: 1.35, color: c.k === "oitoma" ? NAVY : INK, bold: c.k === "oitoma" });
    });
    text(s, [
      { text: "意味の判断は", options: {} }, { text: "AI", options: { bold: true, color: NAVY } },
      { text: "、数の計算と保存は", options: {} }, { text: "アプリ", options: { bold: true, color: ORANGE_INK } },
    ], { objectName: "message", x: MX, y: 6.0, w: CW, h: 0.5, fontSize: 26 });
  },
});

// 6. 呼び出しタイミング（必須1）
add({
  section: "仕組み", layout: "本文", main: true, chip: "#呼び出すタイミング",
  title: "おいとまを呼ぶのは、生成・確認・当日追加の3場面",
  claim: "おいとまの呼び出しは、主催者がボタンを押す3つの場面に限られる",
  visual: "左から事前→確認→当日の時間軸。各場面に実際のボタン名と呼ぶ処理",
  script: "おいとまを呼ぶのは3つの場面です。事前に「タグをまとめて作る」を押すと、4種類の処理を順に呼びます。確認画面では、個性タグの別案を頼めます。当日の飛び入りは、その1人分だけを作り、ほかの人のタグは変えません。",
  points: "ボタン名は実際の画面の表記。①生成画面：extract→catalog→rank→（不足者だけ再rank）→summary。40人なら抽出5回・候補1回・順位3回・まとめ1回の最少10回（再要求・再試行は除く）。②確認画面：regenerate で個性タグ候補を3つ追加（候補は最大6件）。③取り込み画面の「1人分を手入力で追加」タブ：extract・rankをその1人だけに行い、割り当てはコード（assignOne）。失敗したら参加者を追加せず入力を残す。保存済み結果の読み込み・確認・印刷では呼ばない（オフラインでも可）。",
  next: "一番大きい①の生成の中身を、5段階で説明します。",
  sources: "src/app/admin/generate/page.tsx 203–216行・276行（runGeneration、ボタン）／src/app/admin/review/page.tsx 230–245行・625行（regenerate）／src/app/admin/import/page.tsx 220行・684行（generateForOne）／src/lib/pipeline/add-one.ts／docs/SPEC-ADD-1.md「データと処理」／README.md（保存済み結果には接続不要）",
  status: "実装確認：3つの呼び出し箇所とボタン名。呼び出し回数はバッチサイズ（8人・15人）からの計算値で、実測ではない。",
  qa: "Q：同時に何人も生成したら？ → A：1つのNode.jsサーバー全体で同時3件まで、残りは最大60件・120秒まで順番待ち（src/lib/llm/limiter.ts、環境変数で調整可）。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const cw = 3.7, gap = (CW - cw * 3) / 2, axisY = 2.6;
    line(s, MX + 0.2, axisY, CW - 0.4, 0, { name: "timeline", color: MUTED, width: 2 });
    const cols = [
      { when: "事前", where: "生成画面", button: "タグをまとめて作る", call: "話題・候補・順位・まとめ", result: "全員分のタグができる" },
      { when: "確認", where: "確認・修正画面", button: "おいとまに別案を出してもらう", call: "個性タグの別案を3つ", result: "候補に追加する" },
      { when: "当日", where: "取り込み画面", button: "追加してタグを作る", call: "その1人だけ抽出・順位", result: "他の人のタグは変えない" },
    ];
    cols.forEach((c, i) => {
      const x = MX + i * (cw + gap);
      s.addShape(pres.shapes.OVAL, { objectName: `timeline-dot-${i + 1}`, x: x + cw / 2 - 0.13, y: axisY - 0.13, w: 0.26, h: 0.26, fill: { color: NAVY }, line: { color: WHITE, width: 2 } });
      text(s, [{ text: c.when, options: { bold: true, color: NAVY } }, { text: `　${c.where}`, options: { color: MUTED } }], { objectName: `when-${i + 1}`, x, y: 2.08, w: cw, h: 0.38, fontSize: 18, align: "center" });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: `scene-card-${i + 1}`, x, y: 2.98, w: cw, h: 2.95, rectRadius: 0.12, fill: { color: CARD }, line: { color: CARD, width: 0 } });
      // 実際の画面のボタン（黒地・白文字）
      s.addText(c.button, { objectName: `button-${i + 1}`, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x: x + 0.15, y: 3.2, w: cw - 0.3, h: 0.62, fill: { color: INK }, line: { color: INK, width: 0 }, fontFace: FONT, fontSize: 16, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0.04, isTextBox: true });
      line(s, x + cw / 2, 3.88, 0, 0.42, { name: `scene-arrow-${i + 1}`, color: NAVY, connect: [`button-${i + 1}`, 2, `call-${i + 1}`, 0] });
      s.addText(c.call, { objectName: `call-${i + 1}`, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x: x + 0.15, y: 4.38, w: cw - 0.3, h: 0.72, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, fontFace: FONT, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0.06, isTextBox: true });
      text(s, c.result, { objectName: `result-${i + 1}`, x: x + 0.2, y: 5.28, w: cw - 0.4, h: 0.45, fontSize: 18, color: INK, align: "center" });
    });
    text(s, "保存済みの結果を開く・印刷するときは呼ばない", { objectName: "message", x: MX, y: 6.3, w: CW, h: 0.5, fontSize: 24, bold: true });
  },
});

// 7. 5段階（必須2：主要な処理フロー、重要な処理を強調）
add({
  section: "仕組み", layout: "本文", main: true, chip: "#主要な処理",
  title: "生成は5段階：言葉はおいとま、割り当てはコード",
  claim: "5段階のうち、言葉を扱う①②③⑤をおいとま、④の割り当てをコードが担う。④で不足した人だけ③に戻る",
  visual: "左→右の5段階。おいとま＝紺、コード＝オレンジ枠で強調。④→③の戻り矢印",
  script: "生成の中身です。①おいとまが8人ずつ話題を読み取り、個性タグの候補を作ります。②全員分を見比べて共有タグの候補を作り、③各人に当てはまる順に並べます。④割り当てはコードです。少なすぎるタグを外し、1人2つの共有タグを決めます。足りない人だけ③をやり直し、⑤で会場の傾向をまとめます。",
  points: "強調は④。①extract：8人ずつ、同時3件。話題1〜5個と個性タグ候補3個。②catalog：全員で1回、候補は人数から決めた数（40人なら15個、最大40個）。③rank：15人ずつ、同時3件、1人5候補を当てはまる順に。④assign.ts：上位2つを持たせ、下限未満のタグを1つずつ外して割り当て直す。上限超えは別の候補へ付け替え。⑤summary：人数の多い上位8タグから会場の傾向を2〜3文に。失敗しても全体は止めない（skipped）。個性タグは候補の1つ目を採用。",
  next: "なぜ④をAIではなくコードにしたのか。ここが技術的な工夫です。",
  sources: "docs/spec.md「タグ生成パイプライン」「5つの段階」／src/lib/pipeline/run.ts（段階1：143–180行、段階2：182–211行、段階3：213–248行、段階4：250–341行、段階5：343–373行）／src/config/event.ts PIPELINE（8・15・同時3・rankLength 5）／src/lib/sizing.ts",
  status: "実装確認：5段階、バッチサイズ、並列数、戻りの条件、⑤の失敗時の扱い。",
  qa: "Q：1つの共有タグは何人くらい？ → A：参加人数から自動で決める。40人なら目安8人・下限4人・上限16人・候補15個（src/lib/sizing.ts）。上限は目安で、付け替え先がなければ超えることがあり、確認画面で分かる。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const n = 5, aw = 0.34, y = 2.3, h = 2.15;
    const bw = (CW - aw * (n - 1)) / n;
    const st = [
      { k: "oitoma", a: "話題の読み取り", t: "extract", u: "8人ずつ" },
      { k: "oitoma", a: "共有タグ候補", t: "catalog", u: "全員で1回" },
      { k: "oitoma", a: "当てはまり順", t: "rank", u: "15人ずつ" },
      { k: "appStrong", a: "割り当て", t: "assign.ts", u: "人数を調整" },
      { k: "oitoma", a: "会場のまとめ", t: "summary", u: "失敗しても続行" },
    ];
    st.forEach((d, i) => {
      const x = MX + i * (bw + aw);
      const onNavy = d.k === "oitoma";
      box(s, x, y, bw, h, d.k, [
        { text: "①②③④⑤"[i], options: { fontSize: 22, bold: true, breakLine: true, color: onNavy ? WHITE : ORANGE_INK } },
        { text: d.a, options: { fontSize: 20, bold: true, breakLine: true } },
        { text: d.t, options: { fontFace: MONO, fontSize: 16, breakLine: true, color: onNavy ? C.accent4 : ORANGE_INK } },
        { text: d.u, options: { fontSize: 16, color: onNavy ? C.accent4 : INK } },
      ], { objectName: `stage-${i + 1}`, lineSpacingMultiple: 1.15 });
      if (i < n - 1) line(s, x + bw + 0.05, y + h / 2, aw - 0.1, 0, { name: `stage-arrow-${i + 1}`, color: INK, connect: [`stage-${i + 1}`, 3, `stage-${i + 2}`, 1] });
    });
    // ④ → ③ の戻り（2つ持てない人だけ）
    const x3 = MX + 2 * (bw + aw) + bw / 2, x4 = MX + 3 * (bw + aw) + bw / 2, by = y + h + 0.45;
    line(s, x4, y + h + 0.04, 0, by - y - h - 0.04, { name: "retry-down", color: ORANGE, width: 2.5, arrow: false });
    line(s, x3, by, x4 - x3, 0, { name: "retry-left", color: ORANGE, width: 2.5, arrow: false });
    line(s, x3, y + h + 0.06, 0, by - y - h - 0.06, { name: "retry-up", color: ORANGE, width: 2.5, flipV: true });
    text(s, "2つ持てない人だけ、③をやり直す", { objectName: "retry-label", x: x3 - 1.6, y: by + 0.08, w: (x4 - x3) + 3.2, h: 0.4, fontSize: 18, bold: true, color: ORANGE_INK, align: "center" });
    // 凡例
    const ly = 5.95;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "legend-oitoma", x: MX, y: ly + 0.06, w: 0.42, h: 0.32, rectRadius: 0.06, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    text(s, "おいとま（言葉の処理）", { objectName: "legend-oitoma-label", x: MX + 0.55, y: ly, w: 4, h: 0.45, fontSize: 20, valign: "middle" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "legend-code", x: MX + 4.6, y: ly + 0.06, w: 0.42, h: 0.32, rectRadius: 0.06, fill: { color: ORANGE_TINT }, line: { color: ORANGE, width: 2.25 } });
    text(s, "コード（数の処理）", { objectName: "legend-code-label", x: MX + 5.15, y: ly, w: 4, h: 0.45, fontSize: 20, valign: "middle" });
  },
});

// 8. 技術的な工夫（必須3）
add({
  section: "工夫と意義", layout: "本文", main: true, chip: "#技術的な工夫",
  title: "割り当てはAIに任せず、コードで人数を守る",
  claim: "AIに全員分の割り当てまで出させる案と比べ、AIは候補と順位まで・割り当てはコードとする分担を選んだ",
  visual: "比較表（行：出力・人数の下限・失敗時、列：AIに全部任せる案／採用した分担）",
  script: "技術的な工夫は、この役割分担です。AIに全員分の割り当てまで出させると、出力が長く崩れやすく、人数の下限も保証できません。そこでAIは候補と順位まで、割り当てはコードにしました。出力は数人分と短く、下限はコードが守り、失敗した分だけやり直せます。",
  points: "左の案は仕様書で検討した比較案で、実装・比較実験はしていない。仕様書の理由：「200人分の割り当てを一度に出力させずに済み、出力の崩れにも強くなる」。採用案では、下限未満のタグを人数の少ない順に1つずつ外して割り当て直す（付録A1にコード）。足りない人の補充は人数を増やすだけなので下限は崩れない。ただし採用できるタグが2つ未満になる極端な場合は、候補を戻して全員に2つ持たせることを優先し、要確認の印を付ける。数の処理はコードなので、assign.test.ts などの自動テストで確かめられる。",
  next: "ここまでが仕組みと工夫です。最後に、学内AIのおいとまを使う意義を説明します。",
  sources: "docs/spec.md「タグ生成パイプライン」冒頭・「割り当てのアルゴリズム」・「事前の試算」・決定事項4／src/lib/assign.ts 177–261行／src/lib/pipeline/run.ts 265–332行（補充）／src/lib/assign.test.ts／src/lib/llm/client.ts（呼び出しごとの再試行）／src/lib/pipeline/run.ts 147行・217行（続きからは未処理の人だけ）",
  status: "実装確認：採用案の割り当て・補充・再試行・再開。仕様書記載：比較案と選択理由、乱数の当てはまり順による事前試算（30回の試行で下限は全試行で守られた）。比較案は未実装で、性能差は測っていない。",
  qa: "Q：AIに一括でやらせる案と比較実験した？ → A：していない。出力長・検証可能性からの設計判断。仕様書の事前試算では、乱数で作った当てはまり順を30回試し、下限は全試行で守られた。40人で、ランダムな2人が共有タグを持つ割合は約44%（試算値で実績ではない）。\nQ：上限は守る？ → A：上限は目安。超えたタグの人を別の候補に付け替えるが、付け替え先がなければ超える。確認画面に表示する。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const lx = MX, lw = 2.2, ax = MX + 2.4, cw = 4.55, bx = ax + cw + 0.25, top = 2.15, hh = 1.3, rh = 0.74;
    // 見出し（列）
    s.addText([
      { text: "比較案（未実装）", options: { fontSize: 16, color: MUTED, breakLine: true } },
      { text: "AIに全部任せる", options: { fontSize: 24, bold: true, breakLine: true } },
      { text: "AIが全員分の割り当てまで出力", options: { fontSize: 16, color: MUTED } },
    ], { objectName: "col-a-head", shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x: ax, y: top, w: cw, h: hh, fill: { color: CARD }, line: { color: CARD, width: 0 }, fontFace: FONT, color: INK, align: "center", valign: "middle", margin: 0.06, isTextBox: true });
    s.addText([
      { text: "採用", options: { fontSize: 16, bold: true, color: ORANGE_INK, breakLine: true } },
      { text: "AIとコードで分担", options: { fontSize: 24, bold: true, breakLine: true } },
      { text: "AIは候補と順位、割り当てはコード", options: { fontSize: 16, color: INK } },
    ], { objectName: "col-b-head", shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x: bx, y: top, w: cw, h: hh, fill: { color: ORANGE_TINT }, line: { color: ORANGE, width: 2.25 }, fontFace: FONT, color: INK, align: "center", valign: "middle", margin: 0.06, isTextBox: true });
    const rows = [
      { k: "出力", a: "全員分を一度に", b: "数人分ずつ短く" },
      { k: "人数の下限", a: "守れたか分からない", b: "コードが守る" },
      { k: "失敗時", a: "全体をやり直し", b: "その分だけ再試行" },
    ];
    rows.forEach((r, i) => {
      const y = top + hh + 0.2 + i * rh;
      if (i > 0) s.addShape(pres.shapes.LINE, { objectName: `row-rule-${i}`, x: lx, y: y - 0.02, w: bx + cw - lx, h: 0, line: { color: CARD, width: 1.5 } });
      text(s, r.k, { objectName: `row-${i + 1}-label`, x: lx, y, w: lw, h: rh - 0.08, fontSize: 20, bold: true, color: MUTED, valign: "middle" });
      text(s, r.a, { objectName: `row-${i + 1}-a`, x: ax, y, w: cw, h: rh - 0.08, fontSize: 22, color: MUTED, align: "center", valign: "middle" });
      text(s, r.b, { objectName: `row-${i + 1}-b`, x: bx, y, w: cw, h: rh - 0.08, fontSize: 22, bold: true, color: INK, align: "center", valign: "middle" });
    });
    text(s, [{ text: "数の制約は、", options: {} }, { text: "テストで確かめられるコード", options: { bold: true, color: ORANGE_INK } }, { text: "で守る", options: {} }], { objectName: "message", x: MX, y: 6.15, w: CW, h: 0.5, fontSize: 24 });
  },
});

// 9. 意義（必須4）
add({
  section: "工夫と意義", layout: "本文", main: true, chip: "#おいとまを使う意義",
  title: "学内AIだから、個人情報をセキュアにAI処理できる",
  claim: "学内AIのおいとまなら、参加者の自己紹介という個人情報を、学外のAI事業者に渡さずにAIで処理できる。アプリ側でも送る情報と保存先を絞った",
  visual: "大きな主張と根拠3点（左）＋学内の境界図（右）",
  script: "おいとまを使う意義です。自己紹介は個人情報ですが、学内AIのおいとまなら、学外のAI事業者に渡さずにAIで読み解けます。アプリ側でも、名前は送らずIDで処理し、同意のない人の自己紹介は送らず、サーバーにも保存しません。学内AIだからこそ、個人情報をセキュアにAIで処理できます。",
  points: "強調点：AIによる処理そのものが学内のおいとまで完結し、学外のAI事業者に回答を渡さない。根拠：①おいとまに送るのはID・所属・区分・自己紹介・一言・話題の要素で、名前は送らない（ExtractInput に名前の項目がない。2026-10-12の受け入れ確認で、1人追加の送信内容に名前がないことを確認）。②同意列が「同意しない」の人は、取り込み時に自己紹介と一言を空にする。③Next.jsサーバーは中継のみで、ログはタスク名・所要時間・試行回数・成否だけ。参加者データは主催者のブラウザ（localStorage）にだけ置き、イベント後に「このPCからデータを消す」で消す。おいとまが入力を再学習に使わない点は、仕様書がおいとまマニュアルを根拠に記載（マニュアル原本は今回の資料に含まれない）。注意：所属は送る。自由記述に書かれた人名の自動匿名化はしない。同意列がないExcelはデモ用に全員同意として扱い、警告を出す。学外の端末から使う場合は ngrok（Google認証）を経由する（付録A3）。",
  next: "最後に、ここまでの実装で確認できた結果をお見せします。",
  sources: "docs/spec.md「必ず守ること」「個人情報の扱い」「決定事項8」／src/lib/pipeline/run.ts 69–71行（toExtractInput：名前なし、同意なしは空）／src/lib/llm/schemas.ts 45–51行／src/lib/import/forms.ts 86–110行（同意列）／src/app/api/llm/*/route.ts（ログ）／src/lib/store.ts（localStorage 'nametag-app-v1'）／docs/ACCEPTANCE-2026-10-12.md 追加9／docs/NGROK.md §7",
  status: "実装確認：名前を送らない、同意なしの自己紹介を送らない、サーバーに保存しない。仕様書記載（原本未確認）：おいとまは学内で、入力を再学習に使わない。運用文書：学外からの利用はngrok経由。",
  qa: "Q：ngrokで外に出しているのでは？ → A：付録A3。AIの処理は学内のおいとまで行う。学外の端末からの通信はGoogle認証付きのngrokを通り、手順書では通信内容を保存しない設定にしている。基本の運用（学内のPCで直接操作）ではngrokを通らない。\nQ：所属は送るのか？ → A：送る。タグの文脈理解に使う。名前は送らない。\nQ：再学習は？ → A：仕様書には、おいとまマニュアルの記載として「入力を再学習に使わない」とある。原本の規程は今回の資料には含めていない。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    text(s, [
      { text: "参加者の自己紹介を、", options: { breakLine: true } },
      { text: "学外のAI事業者に渡さず", options: { color: ORANGE_INK } },
      { text: "AI処理", options: {} },
    ], { objectName: "statement", x: MX, y: 2.15, w: 6.8, h: 1.25, fontSize: 28, bold: true, lineSpacingMultiple: 1.15 });
    const items = ["名前は送らず、IDで処理", "同意なしの自己紹介は送らない", "サーバーに保存しない"];
    items.forEach((t, i) => {
      const y = 3.9 + i * 0.72;
      s.addShape(pres.shapes.OVAL, { objectName: `basis-dot-${i + 1}`, x: MX, y: y + 0.13, w: 0.24, h: 0.24, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
      text(s, t, { objectName: `basis-${i + 1}`, x: MX + 0.45, y, w: 6.2, h: 0.5, fontSize: 24, valign: "middle" });
    });
    // 境界図
    const bx = 7.75, by = 2.15, bw = 4.88, bh = 2.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "campus-boundary", x: bx, y: by, w: bw, h: bh, rectRadius: 0.15, fill: { color: NAVY_TINT }, line: { color: NAVY, width: 1.75, dashType: "dash" } });
    text(s, "学内ネットワーク／OU-VPN", { objectName: "campus-label", x: bx + 0.25, y: by + 0.15, w: bw - 0.5, h: 0.4, fontSize: 18, bold: true, color: NAVY });
    const pw = 1.65, ow = 2.15;
    box(s, bx + 0.3, by + 0.85, pw, 1.6, "app", [{ text: "主催者の", options: { fontSize: 18, bold: true, breakLine: true } }, { text: "PC", options: { fontSize: 18, bold: true } }], { objectName: "campus-pc" });
    box(s, bx + bw - 0.3 - ow, by + 0.85, ow, 1.6, "oitoma", [{ text: "おいとま", options: { fontSize: 20, bold: true, breakLine: true } }, { text: "再学習に使わない※", options: { fontSize: 15, color: C.accent4 } }], { objectName: "campus-oitoma" });
    line(s, bx + 0.3 + pw + 0.08, by + 0.85 + 0.8, bw - 0.6 - pw - ow - 0.16, 0, { name: "campus-arrow", color: INK, beginArrow: true, connect: ["campus-pc", 3, "campus-oitoma", 1] });
    s.addText("学外のAIサービス", { objectName: "external-ai", shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x: bx + 0.3, y: by + bh + 0.55, w: bw - 0.6, h: 0.62, fill: { color: WHITE }, line: { color: MUTED, width: 1.25, dashType: "dash" }, fontFace: FONT, fontSize: 18, color: MUTED, align: "center", valign: "middle", margin: 0, isTextBox: true });
    text(s, "回答を送らない", { objectName: "external-label", x: bx + 0.3, y: by + bh + 0.12, w: bw - 0.6, h: 0.38, fontSize: 18, bold: true, color: ORANGE_INK, align: "center" });
    text(s, "※ 仕様書の記載（根拠はおいとまマニュアル）。学外の端末から使う場合は付録A3", { objectName: "footnote", x: MX, y: 6.55, w: CW - 0.7, h: 0.35, fontSize: 15, color: MUTED });
  },
});

// 10. 結果
add({
  section: "成果とまとめ", layout: "本文", main: true, chip: "#結果",
  title: "取り込みから印刷まで、動作を確認した",
  claim: "自動テストと受け入れ確認で、取り込み・生成・1人追加・印刷の一連の動作を確認した",
  visual: "大きな数値3つ（98/98、18/18、120枚）＋liveでの改善と未計測の範囲",
  script: "結果です。自動テスト98件がすべて成功し、取り込みから1人追加、印刷までの受け入れ確認18項目を通しました。本物のおいとまの出力を見ながら、指示文も改善しています。",
  points: "98/98：2026-10-15に npm test（Vitest）を実行し、17ファイル98件が成功。18/18：2026-10-12にmock（おいとまを呼ばない練習モード）で基本9項目・追加9項目の受け入れ確認が成功。120枚：40人分のシールをA4 5ページに配置した印刷PDFで、はみ出し0件と全員分の文字を確認。live：本物のおいとまで「学生生活送ってます」のような肩書きの言い直しタグが出たため、2026-10-15に指示文で禁止した。未計測：会場での会話促進効果、liveの所要時間とタグの品質評価、実紙での位置合わせ。",
  next: "まとめます。",
  sources: "npm test 実行結果（2026-10-15、17ファイル・98件成功）／docs/ACCEPTANCE-2026-10-12.md（基本1〜9・追加1〜9、基本7のPDF検査）／docs/DECISIONS.md「タグ品質2026-10-15」／git 480d010「prompt修正」",
  status: "今回実行で確認：98テスト。過去の記録（日付付き、mock）：18項目、40人120枚のPDF。記録あり（数値なし）：liveの出力を受けた指示文の修正。未計測：会話効果、live性能。",
  qa: "Q：本物のおいとまでの生成時間は？ → A：記録した数値がなく、資料からは示せない。受け入れ確認の約3.2秒（40人）はmockの値で、おいとまの速度ではない。\nQ：精度は？ → A：タグの品質の定量評価はまだ。主催者の確認・修正を前提にしている。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const cw = 3.75, gap = (CW - cw * 3) / 2, y = 2.3, h = 2.6;
    const stats = [
      { big: "98/98", label: "自動テスト成功", sub: "17ファイル・10/15実行" },
      { big: "18/18", label: "受け入れ確認", sub: "基本9＋追加9・mock" },
      { big: "120枚", label: "印刷PDFを検査", sub: "40人分・A4 5ページ" },
    ];
    stats.forEach((st, i) => {
      const x = MX + i * (cw + gap);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: `stat-card-${i + 1}`, x, y, w: cw, h, rectRadius: 0.12, fill: { color: CARD }, line: { color: CARD, width: 0 } });
      text(s, st.big, { objectName: `stat-${i + 1}`, x: x + 0.3, y: y + 0.25, w: cw - 0.6, h: 1.05, fontSize: 60, bold: true, color: ORANGE_INK });
      text(s, st.label, { objectName: `stat-${i + 1}-label`, x: x + 0.3, y: y + 1.35, w: cw - 0.6, h: 0.5, fontSize: 24, bold: true });
      text(s, st.sub, { objectName: `stat-${i + 1}-sub`, x: x + 0.3, y: y + 1.9, w: cw - 0.6, h: 0.4, fontSize: 18, color: MUTED });
    });
    text(s, [{ text: "本物のおいとま（live）", options: { bold: true, color: NAVY } }, { text: "の出力を見て、指示文を改善" }], { objectName: "live-note", x: MX, y: 5.35, w: CW, h: 0.5, fontSize: 24 });
    text(s, "未計測：会場での会話の効果、liveの所要時間", { objectName: "not-measured", x: MX, y: 6.0, w: CW, h: 0.45, fontSize: 20, color: MUTED });
  },
});

// 11. まとめ
add({
  section: "成果とまとめ", layout: "まとめ", main: true,
  title: "学内AIで、名札に「話題」を足す",
  claim: "分担の設計、一連の動作、学内AIによる個人情報の扱いの3点が成果",
  visual: "結論3つ（番号はシールと同じ枠のチップ）",
  script: "まとめです。言葉はおいとま、人数はコードで分担し、Excelから印刷までつなげました。そして個人情報を、学内AIでセキュアに処理できます。ありがとうございました。",
  points: "3点は、スライド8（工夫）、4・10（流れと結果）、9（意義）に対応。質疑では付録A1〜A3を使う。",
  next: "（質疑へ）",
  sources: "本編スライド4〜10の根拠と同じ",
  status: "本編の確認区分を引き継ぐ。",
  qa: "",
  build(s) {
    title(s, this.title);
    const items = ["言葉はおいとま、人数はコードで分担", "Excelから印刷まで、1つの画面で完結", "個人情報を、学内AIでセキュアに処理"];
    items.forEach((t, i) => {
      const y = 2.55 + i * 1.2;
      s.addText(String(i + 1), { objectName: `conclusion-no-${i + 1}`, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, x: MX, y, w: 0.9, h: 0.78, fill: { color: WHITE }, line: { color: ORANGE, width: 2.25 }, fontFace: FONT, fontSize: 28, bold: true, color: INK, align: "center", valign: "middle", margin: 0, isTextBox: true });
      text(s, t, { objectName: `conclusion-${i + 1}`, x: MX + 1.25, y, w: 10.5, h: 0.78, fontSize: 30, bold: true, color: WHITE, valign: "middle" });
    });
    text(s, "#おいとま活用中", { objectName: "app-name", x: MX, y: 6.35, w: 6, h: 0.5, fontSize: 22, bold: true, color: ORANGE });
  },
});

// ---- 付録（質疑用。4分の対象外） ----
add({
  section: "付録（質疑用）", layout: "本文", main: false, chip: "#付録A1 割り当てのコード",
  title: "下限に届かないタグを1つずつ外し、割り当て直す",
  claim: "assign.ts の中心ループ。上位2つを持たせ、下限未満のタグがなくなるまで最少のタグを外す",
  visual: "コード（左、12行）＋処理の説明（右）",
  script: "",
  points: "コードは src/lib/assign.ts 233–251行から抜粋。変数名・処理は実コードのまま。「…」は省略（victim を選ぶ8行：下限未満のうち人数が最少、同数なら候補の並びで後ろのもの）。長い式は投影のため改行位置だけ変えた。この後、最後の active で pickTop2 と resolveOverflow をもう一度行い、2つ持てなかった人を shortIds として返す（run.ts で再rankと補充）。",
  next: "",
  sources: "src/lib/assign.ts 177–261行／src/lib/assign.test.ts／docs/spec.md「割り当てのアルゴリズム」",
  status: "実装確認。",
  qa: "Q：ループは必ず終わる？ → A：1周で候補を1つ外すので、最大で候補の数だけ回る（for の上限も candidateIds.length）。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const code = [
      "for (let iter = 0; iter < candidateIds.length; iter += 1) {",
      "  pickTop2();",
      "  resolveOverflow();",
      "  const counts = countHolders();",
      "  active = active.filter((id) => (counts.get(id) ?? 0) > 0);",
      "  const recount = countHolders();",
      "  const below = active.filter(",
      "    (id) => (recount.get(id) ?? 0) < minSize);",
      "  if (below.length === 0) break;",
      "  let victim = below[0]; // …最少人数のタグを選ぶ",
      "  active = active.filter((id) => id !== victim);",
      "}",
    ];
    codeBlock(s, code, MX, 2.1, 7.0, { fontSize: 15, pitchPt: 22, hl: [6, 7, 10], source: "src/lib/assign.ts 233–251行（「…」は省略、改行位置のみ変更）" });
    numbered(s, ["各人に、順位の\n上位2つを持たせる", "下限未満のタグから\n最少の1つを外す", "下限未満がなくなる\nまで繰り返す"], 8.1, 2.3, 4.55, 1.35, { fontSize: 22 });
  },
});

add({
  section: "付録（質疑用）", layout: "本文", main: false, chip: "#付録A2 出力の検証",
  title: "崩れたJSONは、理由を添えて最大3回まで再依頼",
  claim: "おいとまの応答から JSON を取り出し、zodで検証し、失敗理由を会話に足して再依頼する",
  visual: "コード（左）＋処理の説明（右）",
  script: "",
  points: "コードは src/lib/llm/client.ts 280–311行から抜粋。「…」は省略（ログ出力、理由の組み立て）。extractJsonText は <think>…</think> とコードブロック記号を除き、最初の { から最後の } までを取り出す（62–79行）。通信エラー・429・5xxは2秒・5秒待って再試行、401・403は再試行しない。400はJSONモードや追加パラメータを外して送り直し、通った組み合わせを覚える（試行回数に数えない）。応答が空なら次の試行で max_tokens を3倍にする。",
  next: "",
  sources: "src/lib/llm/client.ts 62–79行・188–313行／src/lib/llm/client.test.ts（コードブロック・think・前後の文・途中で切れたJSON・400の段階的な縮退・403）／src/lib/llm/schemas.ts",
  status: "実装確認。",
  qa: "Q：検証に通れば内容も正しい？ → A：形式・件数・文字数・候補IDは保証するが、意味の正しさまでは保証しない。主催者の確認・修正で補う。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const code = [
      "try {",
      "  const text = extractJsonText(contentStr);",
      "  const parsed: unknown = JSON.parse(text);",
      "  const r = opts.schema.safeParse(parsed);",
      "  if (!r.success) { /* … */ throw new Error(…); }",
      "  // …validate で追加検査、成功なら return",
      "} catch (e) {",
      "  const reason = e instanceof Error ? e.message : String(e);",
      "  if (attempts >= 3) { /* … */ throw new LlmError(…); }",
      "  messages = [...messages,",
      "    { role: 'assistant', content: contentStr.slice(0, 2000) },",
      "    { role: 'user', content:",
      "      `前の出力は条件を満たしていません：${reason}。…` }];",
      "}",
    ];
    codeBlock(s, code, MX, 2.1, 7.0, { fontSize: 14, pitchPt: 20, hl: [1, 3, 12], source: "src/lib/llm/client.ts 280–311行（「…」は省略、改行位置のみ変更）" });
    numbered(s, ["思考の欄やコード記号を\n除いてJSONを取り出す", "zodで形式を検証する", "失敗理由を会話に\n足して再依頼する"], 8.1, 2.3, 4.55, 1.35, { fontSize: 22 });
  },
});

add({
  section: "付録（質疑用）", layout: "本文", main: false, chip: "#付録A3 学外からの利用",
  title: "学外からは、ngrokのGoogle認証を通して使う",
  claim: "AIの処理は学内。学外の端末から操作する場合は、Google認証付きのngrokを経由する",
  visual: "4ノードの通信経路。学内の範囲を破線で示す",
  script: "",
  points: "2026-10-14の運用方針：Vercelへのデプロイはせず、学内ネットワーク／OU-VPNにつないだPCのアプリ全ページとAPIを、ngrokのGoogle認証と許可メール一覧で利用者限定にする。外部ブラウザのAPI通信はngrokを経由するため、「回答は学内から出ない」という基本仕様の前提は変わる（NGROK.md §7）。おいとまのキーはサーバーに置き、ブラウザには配らない。手順書では --inspect=false とし、Traffic Inspector の Full Capture を有効にしない（通信内容を残さない）。アプリ自体にログイン機能はない。トンネルの開設・認証の動作確認の結果は、資料上は記録がない。",
  next: "",
  sources: "README.md（2026-10-14の運用方針）／docs/NGROK.md §1・§5〜§8／docs/DECISIONS.md「公開方針2026-10-14」／src/lib/admin.ts",
  status: "運用文書（手順書）。稼働・認証の確認記録なし。",
  qa: "Q：ngrok側に回答が残らない？ → A：ngrok公式は通常の通信内容は保存せず、Full Captureを有効にすると本文を保存すると説明している（NGROK.md §7の引用）。手順書では無効のまま運用する。",
  build(s) {
    chip(s, this.chip); title(s, this.title);
    const y = 2.95, h = 1.4, bw = 2.55, aw = (CW - bw * 4) / 3;
    const xs = [0, 1, 2, 3].map((i) => MX + i * (bw + aw));
    // 学内の範囲（主催者PCとおいとま）
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { objectName: "campus-boundary", x: xs[2] - 0.2, y: y - 0.65, w: bw * 2 + aw + 0.4, h: h + 0.9, rectRadius: 0.15, fill: { color: NAVY_TINT }, line: { color: NAVY, width: 1.75, dashType: "dash" } });
    text(s, "学内ネットワーク／OU-VPN", { objectName: "campus-label", x: xs[2], y: y - 0.55, w: bw * 2 + aw, h: 0.38, fontSize: 16, bold: true, color: NAVY });
    box(s, xs[0], y, bw, h, "plain", [{ text: "許可した人の", options: { fontSize: 20, bold: true, breakLine: true } }, { text: "ブラウザ", options: { fontSize: 20, bold: true } }], { objectName: "path-browser" });
    box(s, xs[1], y, bw, h, "plain", [{ text: "ngrok", options: { fontSize: 20, bold: true, breakLine: true } }, { text: "Google認証", options: { fontSize: 16, color: MUTED } }], { objectName: "path-ngrok" });
    box(s, xs[2], y, bw, h, "app", [{ text: "主催者のPC", options: { fontSize: 20, bold: true, breakLine: true } }, { text: "Next.js", options: { fontSize: 16, color: MUTED } }], { objectName: "path-pc" });
    box(s, xs[3], y, bw, h, "oitoma", [{ text: "おいとま", options: { fontSize: 20, bold: true } }], { objectName: "path-oitoma" });
    const pathNames = ["path-browser", "path-ngrok", "path-pc", "path-oitoma"];
    [0, 1, 2].forEach((i) => line(s, xs[i] + bw + 0.06, y + h / 2, aw - 0.12, 0, { name: `path-arrow-${i + 1}`, color: INK, beginArrow: true, connect: [pathNames[i], 3, pathNames[i + 1], 1] }));
    numbered(s, ["AIの処理は学内。ただし通信はngrokを経由する", "手順書で、通信内容を残さない設定にする", "認証の動作確認は、資料上まだ記録がない"], MX + 0.2, 4.95, CW - 0.4, 0.6, { fontSize: 22 });
  },
});

// ---- 生成 ----
const sectionsAdded = new Set();
for (const def of slides) {
  if (!sectionsAdded.has(def.section)) { pres.addSection({ title: def.section }); sectionsAdded.add(def.section); }
  const s = pres.addSlide({ masterName: def.layout, sectionTitle: def.section });
  currentConnectors = [];
  def.build.call(def, s);
  def.connectors = currentConnectors;
  def.slide = s;
}

// 読み上げ時間の見積もり（1秒あたり5.2文字＋切り替え1秒）
const RATE = 5.2;
let total = 0;
slides.forEach((def, i) => {
  def.no = def.main ? String(i + 1) : `A${i - slides.filter((d) => d.main).length + 1}`;
  def.chars = [...def.script.replace(/\s/g, "")].length;
  def.seconds = def.main ? Math.round(def.chars / RATE + 1) : 0;
  total += def.seconds;
});

slides.forEach((def) => {
  const sl = def.slide;
  const parts = [];
  if (def.main) parts.push(`【時間】約${def.seconds}秒（原稿${def.chars}字）／本編合計 約${total}秒`);
  else parts.push("【時間】質疑用の付録。4分の本編には含めない");
  parts.push(`【このスライドの主張】${def.claim}`);
  if (def.script) parts.push(`【話す内容】${def.script}`);
  parts.push(`【図・コードの説明ポイント】${def.points}`);
  if (def.next) parts.push(`【次へのつなぎ】${def.next}`);
  parts.push(`【根拠】${def.sources}`);
  parts.push(`【確認の区分】${def.status}`);
  if (def.qa) parts.push(`【想定質問】${def.qa}`);
  sl.addNotes(parts.join("\n\n"));
});

// 日本語の文字に英語の言語タグが付くと、PowerPointで赤い波線（スペルチェック）が出るため ja-JP にする
function patchLang(xml) {
  return xml.replace(/ lang="en-US"/g, ' lang="ja-JP" altLang="en-US"');
}

// 直線の矢印を、両端の図形に接続したコネクタ（p:cxnSp）に変える
function patchConnectors(xml, connectors, slideNo) {
  const idOf = (name) => {
    const m = xml.match(new RegExp(`<p:cNvPr id="(\\d+)" name="${name}"`));
    if (!m) throw new Error(`slide ${slideNo}: shape "${name}" not found`);
    return m[1];
  };
  for (const c of connectors) {
    const from = idOf(c.from), to = idOf(c.to);
    const re = new RegExp(`<p:sp><p:nvSpPr><p:cNvPr id="(\\d+)" name="${c.name}"></p:cNvPr><p:cNvSpPr/><p:nvPr></p:nvPr></p:nvSpPr>(<p:spPr>(?:(?!</p:sp>).)*?)<a:prstGeom prst="line">((?:(?!</p:sp>).)*?)</p:sp>`, "s");
    if (!re.test(xml)) throw new Error(`slide ${slideNo}: line "${c.name}" not found`);
    xml = xml.replace(re, (_, id, pre, post) =>
      `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="${c.name}"></p:cNvPr><p:cNvCxnSpPr><a:stCxn id="${from}" idx="${c.fromIdx}"/><a:endCxn id="${to}" idx="${c.toIdx}"/></p:cNvCxnSpPr><p:nvPr></p:nvPr></p:nvCxnSpPr>${pre}<a:prstGeom prst="straightConnector1">${post}</p:cxnSp>`);
  }
  return xml;
}

async function patchSlides(file) {
  const JSZip = require(require.resolve("jszip", { paths: [require.resolve("pptxgenjs")] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const p of Object.keys(zip.files).filter((n) => /^ppt\/(slides|slideLayouts|slideMasters|notesSlides|notesMasters)\/[^/]+\.xml$/.test(n))) {
    let xml = patchLang(await zip.file(p).async("string"));
    const m = p.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (m) xml = patchConnectors(xml, slides[Number(m[1]) - 1].connectors || [], m[1]);
    zip.file(p, xml);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

async function patchFonts(file) {
  // テーマの日本語フォント（ea と Jpan）を本文と同じにし、後から足す文字も同じ書体になるようにする
  const JSZip = require(require.resolve("jszip", { paths: [require.resolve("pptxgenjs")] }));
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const p = "ppt/theme/theme1.xml";
  let xml = await zip.file(p).async("string");
  xml = xml.replace(/<a:ea typeface=""\/>/g, `<a:ea typeface="${FONT}"/>`)
    .replace(/<a:font script="Jpan" typeface="[^"]*"\/>/g, `<a:font script="Jpan" typeface="${FONT}"/>`);
  zip.file(p, xml);
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

(async () => {
  await pres.writeFile({ fileName: DECK });
  if (APPLY_THEME) {
    const { applyTheme } = require(APPLY_THEME);
    await applyTheme(DECK, THEME);
  }
  await patchFonts(DECK);
  await patchSlides(DECK);

  // 発表者ノートとスライドデータを書き出す
  const md = ["# 発表者ノート（4分・開発成果報告）", "", `本編${slides.filter((d) => d.main).length}枚・読み上げ約${total}秒（1秒5.2文字＋切り替え1秒で見積もり）。付録${slides.filter((d) => !d.main).length}枚は質疑用。PPTXの各スライドのノートと同じ内容。`, ""];
  for (const def of slides) {
    md.push(`## ${def.no}. ${def.title.replace(/\n/g, "")}`, "");
    if (def.main) md.push(`- 時間：約${def.seconds}秒（原稿${def.chars}字）`);
    md.push(`- 主張：${def.claim}`, `- 図解：${def.visual}`, "");
    if (def.script) md.push("**話す内容**", "", `> ${def.script}`, "");
    md.push("**図・コードの説明ポイント**", "", def.points, "");
    if (def.next) md.push(`**次へのつなぎ**：${def.next}`, "");
    md.push(`**根拠**：${def.sources}`, "", `**確認の区分**：${def.status}`, "");
    if (def.qa) md.push("**想定質問**", "", ...def.qa.split("\n").map((l) => `- ${l}`), "");
  }
  fs.writeFileSync(path.join(OUT_DIR, "speaker-notes.md"), md.join("\n"));
  fs.writeFileSync(path.join(OUT_DIR, "slide-data.json"), JSON.stringify(slides.map((d) => ({
    no: d.no, main: d.main, section: d.section, title: d.title.replace(/\n/g, ""), claim: d.claim, visual: d.visual, seconds: d.seconds, scriptChars: d.chars,
  })), null, 2) + "\n");
  console.log(`wrote ${DECK}: ${slides.length} slides, main ${total}s`);
})();

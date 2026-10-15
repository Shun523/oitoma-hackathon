"""Build an editable, source-grounded Japanese talk. No app dependencies change.

python-pptx==1.0.2 is required. For PDF rendering use LibreOffice Impress.
Run from any directory: python3 docs/presentation/build_presentation.py
"""

from __future__ import annotations

import json
from pathlib import Path
import re

from PIL import ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt


OUT = Path(__file__).resolve().parent
FONT = 'IPAexGothic'
FONT_FILE = '/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf'
W, H = 13.333333, 7.5
BG, WHITE = 'FAFBFC', 'FFFFFF'
INK, MUTED = '172C38', '52646F'
TEAL, TEAL_PALE = '007C78', 'E9F4F2'
ORANGE, ORANGE_PALE = 'D54A24', 'FCEFE9'
GREY, BORDER = 'EFF2F4', 'CDD7DC'

SLIDES = [
    dict(title='名札に「話しかけるきっかけ」を足す', seconds=20,
         claim='学内交流会の会話の入口を、話題シールで作る。',
         body=['所属だけでは、何を話せばよいか見つけにくい。',
               '自己紹介を、会話の入口になる「話題シール」へ。'],
         script='交流会で名札を見ても、所属だけでは、最初に何を話せばよいか迷うことがあります。そこで、学内AIおいとまを使い、参加者の自己紹介を短い話題シールにするアプリ「おいとま活用中」を開発しました。目指したのは、名札から会話を始めるきっかけを作ることです。',
         points='背景と課題は開発の着眼点であり、学内の全参加者を調査した結果ではない。「会話が増えた」といった効果測定の主張はしない。',
         transition='まず、自己紹介がどのようなシールになるかを示します。',
         refs=['docs/spec.md「概要とスコープ」',
               'docs/PRESENTATION-TAG-GENERATION.md「発表で伝える一文」',
               'src/config/event.ts EVENT.appName'],
         status='仕様に記載された目的。会話促進効果は未検証。',
         qa='Q. 学内のどの課題を扱った？ A. 企業・研究者・学生などが参加する交流会で、初対面の会話の入口を見つける課題を対象にした。学内全体の課題解決効果を測ったわけではない。'),
    dict(title='回答を「個性1つ＋共有2つ」に変える', seconds=30,
         claim='個性タグと共有タグで、質問と共感の入口を作る。',
         body=['個性タグは「それ、何ですか？」の入口。',
               '共有タグは「私も同じです」の入口。'],
         script='例えば、カレー屋を開拓し、ランニングを始めた人と、ラーメンの食べ歩きとサイクリングが好きな人がいます。言葉は違っても、「ごはん屋開拓勢」「体を動かしたい」という共通点があります。個性タグはその人に質問する入口、共有タグは「私も同じです」と話しかける入口です。1人分を3枚のシールにして、名札に貼ります。画面の回答とタグは説明用の架空例です。',
         points='左が入力例、右の橙が個性タグ1枚、緑が共有タグ2枚。AとBで緑の2タグが同じになる点を指す。実際の割り当ては会場全体の話題と人数に依存し、この例の結果を必ず返す保証はない。図は説明用で、実際のシールの配色・寸法の再現ではない。',
         transition='この変換を、Excelの取り込みから印刷までつなぎました。',
         refs=['docs/PRESENTATION-TAG-GENERATION.md「回答がタグに変わる具体例」',
               'src/lib/pipeline/sticker.ts buildAssignment',
               'src/components/StickerSet.tsx',
               'docs/spec.md「1行（1人分）の並び」「受付と貼り方」'],
         status='入出力の形式は実装で確認。回答とタグの組み合わせは架空例。',
         qa='Q. 共有タグだけでは？ A. 個性タグは本人への具体的な質問、共有タグは他の人との共通点という役割を持たせた。これは設計意図で、効果比較は未実施。'),
    dict(title='取り込みから印刷まで、主催者が進められる', seconds=25,
         claim='Forms回答から人の確認を経て、印刷物まで出力できる。',
         body=['Formsの回答を読み込み、生成後は主催者が確認・修正。',
               '1人3枚のシールをA4ラベル用紙へ印刷する。'],
         script='操作は左から右です。Formsの回答Excelを読み込み、列の割り当てを確認して、タグをまとめて生成します。生成結果は、元の回答と見比べながら修正できます。最後に、A4の24面ラベル用紙へ、1人分を横1行に並べて印刷します。AIの出力をそのまま配らず、主催者が確認する工程を入れています。',
         points='中央の「タグ生成」が次のスライドで詳しく説明する処理。Formsから直接API連携するのではなく、書き出されたxlsxを読み込む。解析と状態管理はブラウザ側。印刷は操作端末のブラウザ印刷であり、遠隔から主催者PCのプリンタに自動印刷する機能ではない。',
         transition='中央の生成で、おいとまをいつ呼び出すかを見ます。',
         refs=['src/lib/import/forms.ts readSheet / guessColumns / toParticipants',
               'src/app/admin/import/page.tsx',
               'src/app/admin/generate/page.tsx startRun',
               'src/app/admin/review/page.tsx',
               'src/app/admin/print/page.tsx',
               'src/components/StickerSheet.tsx',
               'src/config/event.ts SHEET_PRESETS.label24'],
         status='各操作の実装を確認。実紙の位置合わせは別途必要。',
         qa='Q. 何人まで対応？ A. 一括生成は実装上6〜300人。上限を実運用で検証した人数や、性能保証を意味しない。'),
    dict(title='生成開始時に、おいとまへ段階的に問い合わせる', seconds=45,
         claim='おいとまが言葉の処理を担当し、ブラウザが生成を進める。',
         body=['「タグをまとめて作る」で開始。おいとまが言葉と意味を扱い、',
               'ブラウザが各段階の進行と割り当てを担う。'],
         script='生成ボタンを押すと、ブラウザがNext.jsのAPIを通して、おいとまに段階的に問い合わせます。最初に、各人の回答から話題と個性タグ候補を抽出します。次に全員の話題から共有タグ候補を作り、各人に当てはまる順に順位を付けます。その順位を受け取り、人数を調整して共有タグ2つを決めるのはブラウザのプログラムです。不足する人だけ、もう一度おいとまに選び直してもらいます。最後に、採用タグと人数から会場の要約を作ります。APIキーと応答のJSON検証はサーバー側に置いています。',
         points='上段は論理的なAPIの通信経路で、ネットワーク境界を示す図ではない。外部利用時のngrok経路は付録10を参照。要求と応答は反対方向の矢印。下段は実装の5段階。①extractは8人単位、②catalogは全員の抽出話題、③rankは15人単位、④assignはブラウザ、⑤summaryは上位8タグの名称と人数が入力。④の不足者のみrankへ戻る。通常の抽出・候補・順位・要約はAI、人数の最終割り当てはコード。⑤は失敗してもskippedとなりシールを使える。図の「1回の開始」はAPI通信1回を意味しない。',
         transition='このように、AIに任せる部分とコードで確定する部分を分けたことが、技術的な工夫です。',
         refs=['src/app/admin/generate/page.tsx startRun（184行付近）',
               'src/lib/pipeline/run.ts runGeneration（143〜375行）',
               'src/lib/pipeline/llm-api.ts createHttpLlmApi',
               'src/app/api/llm/{extract,catalog,rank,summary}/route.ts POST',
               'src/lib/llm/client.ts chatJsonUnqueued（179〜214行：URL・POST、280〜296行：検証）',
               'src/lib/llm/tasks.ts liveExtract / liveCatalog / liveRank / liveSummary',
               'src/config/event.ts PIPELINE'],
         status='実装で確認した処理。liveでの応答性能や実行モデルは未確認。',
         qa='Q. ほかの呼び出しタイミングは？ A. 確認画面で「別案」を要求したときはregenerate。生成後に1人追加したときはextractと、採用タグが2個以上ならrankを呼ぶ。接続確認pingではモデル一覧を読む。Q. 保存済み結果の再生もAI？ A. 再生は既存結果の表示で、生成APIを呼ばない。'),
    dict(title='言葉はAI、人数調整はコードに分ける', seconds=40,
         claim='意味判断と数の制約を分離して、最終割り当てを検証可能にする。',
         body=['意味判断と人数制約を分け、少人数の候補を外して集中を調整する。',
               '上限は目安。人数合わせで補充したタグは要確認。'],
         script='すべての人のタグと人数調整まで、一度にAIへ依頼する方法も考えられます。しかし、それでは最終的な人数の制約も生成に依存します。採用したのは、おいとまに言葉と当てはまりを考えてもらい、コードで人数を数えて割り当てる方法です。少人数の候補を外し、集中したタグは順位に沿って振り替えます。一方、当てはまる候補がなければ上限を超えることはあります。人数合わせで補充した場合は要確認とし、主催者が見直せるようにしました。',
         points='左は未実装の比較案、右が実装済みの採用案。比較実験・性能差・精度改善率を主張しない。assignSharedTagsは上位2候補から始め、下限未満の候補を外して再計算し、上限超過は最大3巡で調整する。runGenerationは不足者に採用タグで再rankし、それでも不足すると人数が少ないタグで補充してfallback_sharedを付ける。上限は厳密制約ではない。仕様に「下限を必ず守る」とあるが、候補再追加等の補充経路を含む全入力で保証したとは説明しない。構造の検証（Zod等）と内容の正しさは別であり、主催者確認が必要。',
         transition='個人の回答を扱うため、AIの選び方とデータの扱いにも工夫を入れています。',
         refs=['docs/spec.md「タグ生成パイプライン」「割り当てのアルゴリズム」',
               'src/lib/assign.ts assignSharedTags / pickTop2 / resolveOverflow',
               'src/lib/pipeline/run.ts（258〜337行：割り当て・補充）',
               'src/lib/pipeline/sticker.ts buildAssignment',
               'src/lib/llm/client.ts chatJsonUnqueued',
               'src/lib/llm/schemas.ts'],
         status='採用案は実装確認。比較案は設計上の選択肢。効果の比較実験はない。',
         qa='Q. 全員への適合は保証する？ A. 保証しない。候補不足を人数で補う経路があるためフラグを付ける。Q. 人数の既定値は？ A. computeParams(40)は目安8、下限4、上限目安16、候補15。これは設定値で、実測人数や成果ではない。'),
    dict(title='学内AIと送信の最小化で、個人情報を扱う', seconds=35,
         claim='学内AIの利用とデータ最小化を組み合わせ、個人情報をセキュアに扱う設計にする。',
         body=['学内AIで、参加者の個人情報をセキュアに扱う設計。',
               '氏名欄を送らず、IDで処理',
               '同意なしは自由記述を除外',
               '作業状態はブラウザ内に保存',
               'ngrok利用時は学外中継あり'],
         script='参加者の個人情報をAIで扱ううえで、学内AIのおいとまを使うことに意義があります。さらに、名前欄は送らずIDで処理し、同意なしの人は自己紹介と一言を送らない設計です。作業状態は操作するブラウザに保存し、アプリのサーバーには永続保存しません。ただし、自由記述の自動匿名化ではなく、外部利用ではngrokの学外中継も通ります。安全性は、こうした実装対策と運用条件を合わせて説明します。',
         points='学内AIの利用を明確に強調する一方、無条件の安全保証にはしない。実装上の送信項目はID・所属・区分・同意のある自己紹介・一言・抽出話題等。氏名「欄」を除外するだけで、自由記述に書かれた人名を検出して消す仕組みはない。所属・区分は同意なしでも送る。Excelに同意列がない場合は、デモ用に全員同意として扱う警告付き仕様である。実回答では列の確認が必要。localStorageとJSONバックアップに暗号化機能があるとは確認できない。アプリのAPIログはtask・時間・回数・成否であり、本文を保存する処理は見られない。おいとま側の保存期間・アクセス制御は資料から確認できない。仕様書には「入力を再学習に使わない（おいとまマニュアル）」とあるが、マニュアル原本は未提供で、独立確認していない。ngrok認証・本文キャプチャ無効は運用手順であり稼働確認済みとは言わない。',
         transition='ここまでの実装について、確認できた成果を示します。',
         refs=['docs/spec.md「必ず守ること」「個人情報の扱い」',
               'src/lib/pipeline/run.ts toExtractInput（69〜71行）',
               'src/lib/import/forms.ts toParticipants（86〜110行：同意列・除外）',
               'src/lib/import/manual.ts makeManualParticipant（29〜31行）',
               'src/lib/store.ts persist / safeStorage / partialize',
               'src/app/api/llm/*/route.ts console.log',
               'docs/NGROK.md §7「本物のおいとまに切り替える」・§8'],
         status='氏名欄除外・同意処理・保存先は実装確認。学内AIという位置付けは仕様。サービス側の保証条件と認証の稼働は未確認。',
         qa='Q. 回答は学外へ出ない？ A. 主催者PCのローカル利用と外部利用を分ける必要がある。今回の外部利用方針ではngrokを経由するため「学外へ出ない」とは言わない。Q. セキュアと言い切れる？ A. 学内AIと送信最小化を採用した設計を指す。完全な匿名化・漏えいゼロ・サービスの無保存を保証する表現ではない。'),
    dict(title='取り込み・追加・印刷まで動作を確認した', seconds=30,
         claim='自動テストとモック受け入れ確認で、一連の操作を検証した。',
         body=['2026-10-12 ／ mock',
               '40人120枚をA4・5ページに配置し、PDFを検査。',
               '会話促進効果・live性能は未確認。'],
         script='現行コードで自動テスト98件の成功を確認しました。また、10月12日の記録では、基本9項目と追加9項目、計18項目のモック受け入れ確認が成功しています。取り込み、途中再開、1人追加、復元、印刷までを含みます。印刷は40人120枚をA4の5ページへ配置したPDFで検査しています。一方、会話がどれだけ増えたか、liveでの性能、実紙の位置合わせは、この検証結果には含まれません。',
         points='98は今回2026-10-15に実行したnpm testの結果（17ファイル）。18は2026-10-12の受け入れ記録で今回ブラウザ再実行した数ではない。40人×3枚=120枚、1ページ24面なので5ページ。PDF検査は実紙・プリンタ検査ではない。モック生成約3.2秒、再生約10.5秒という過去記録はliveの生成速度を示さないため本編に載せない。遭遇率はタグが重なる組合せ比率で、実際に会話した確率ではない。未確認のものを不具合として扱わず、検証範囲として区別する。',
         transition='最後に、今回できたことと次の検証をまとめます。',
         refs=['今回実行：npm test（2026-10-15、17 files / 98 tests passed）',
               'docs/ACCEPTANCE-2026-10-12.md 冒頭・基本1〜9・追加1〜9・末尾の未確認範囲',
               'src/lib/metrics.ts computeMetrics'],
         status='98テストは今回実行。18項目とPDFは過去のモック検証記録。会話効果とlive性能の検証資料はない。',
         qa='Q. 98件は何を検証？ A. 取り込み、人数調整、生成、追加、状態管理・復元、APIクライアント、実行制御、印刷配置など。テスト件数そのものが品質や実運用成功を保証するわけではない。'),
    dict(title='学内AIを、会話の最初の一言につなげる', seconds=15,
         claim='おいとまの意味理解を、確認して配れる話題シールにつなげた。',
         body=['自己紹介を、手に取れる話題シールへ。',
               '次は、実会場で会話の促進効果を検証する。'],
         script='おいとまが意味を読み、アプリが人数を整え、人が確認して名札に貼る。学内AIを、会話の最初の一言につなげる仕組みを実装しました。次は実会場で、会話のきっかけとして役立つかを検証します。',
         points='本編はここで終了。付録9・10は質疑用で4分に含めない。「つながった」「会話が増えた」という実証済みの成果には言い換えない。',
         transition='発表を終え、質疑へ移る。質問に応じて付録を表示する。',
         refs=['docs/spec.md「概要とスコープ」',
               'src/lib/pipeline/run.ts',
               'src/lib/assign.ts',
               'src/app/admin/review/page.tsx',
               'src/components/StickerSheet.tsx'],
         status='実装した仕組みのまとめ。現場効果の評価は今後。',
         qa='Q. 次に何を測る？ A. 実会場で、タグが会話の入口に使われたかを確認する。測定方法や数値目標はこの実装資料から確認できないため、決定済みとは言わない。'),
    dict(title='追加した1人だけ生成し、既存タグを保つ', seconds=0,
         claim='当日の追加で、既存参加者の結果を作り直さない。',
         body=['生成後の追加は、その人だけ話題を抽出して共有タグを選ぶ。',
               '成功後に追加し、既存参加者の割り当ては維持する。'],
         script='当日の飛び入り参加には、その人だけの生成を実装しています。おいとまに話題を抽出してもらい、既に採用した共有タグから選びます。最後にプログラムで割り当て、成功した場合にだけブラウザの状態へ追加します。',
         points='通常はextractとrankの2タスク。HTTPやモデルの実呼び出しは再試行で増えるので「必ず2リクエスト」とは言わない。activeTagIdsが2個未満ならrankをスキップし、要確認フラグが付く経路がある。catalogとsummaryは作り直さない。generateForOneはストアを変更せず結果を返し、画面が成功後に追加する。失敗・画面離脱時は追加せず入力等を維持。',
         transition='外部端末で体験する場合の運用境界は次の付録で説明する。',
         refs=['docs/SPEC-ADD-1.md「1人分の生成」「画面での流れ」',
               'src/lib/pipeline/add-one.ts generateForOne',
               'src/lib/assign.ts assignOne',
               'src/app/admin/import/page.tsx',
               'src/lib/pipeline/add-one.test.ts'],
         status='実装確認。過去のモック受け入れ確認で既存40人の保持を確認。',
         qa='Q. 既存の共有タグの人数上限は？ A. 1人追加では既存の割り当てを保ち、既存タグから選ぶ。上限を守るために全員を再調整する設計ではない。'),
    dict(title='外部利用はngrok認証を前提にする', seconds=0,
         claim='ngrokによる学外中継と認証を含む運用構成として扱う。',
         body=['今回の運用方針：全ページとAPIをGoogle認証で保護。',
               'アプリ単体にログインはなく、外部中継の設定で制限する。',
               '運用手順の構成。認証の稼働は未確認。'],
         script='今回の方針は、学内かOU-VPNにつながる主催者PCをngrokで中継する形です。許可メールに限定したGoogle認証を、全ページとAPIへ適用する手順になっています。これはアプリに認証が実装されているという意味ではなく、運用設定が必要です。',
         points='図は2026-10-14の運用方針。Vercelを使う古い基本仕様と混ぜない。外部ブラウザ→HTTPSのngrok（Google OAuthと許可メール）→PCのngrokエージェント→127.0.0.1:3000のNext.js→学内またはOU-VPN経由のおいとま。生成結果は同経路を戻り、作業状態は利用ブラウザのlocalStorageへ保存。PC・アプリ・ngrokの稼働継続が必要。アプリのisAdminEnabledはVERCEL環境の制御で、利用者認証ではない。本文キャプチャの無効化と許可外アカウントの遮断を確認する手順があるが、実施済みの証跡はない。サーバー全体の同時実行は既定3、待機最大60、120秒（1 Node.jsプロセス）。複数プロセスの分散制御は未実装。共有編集の同期もない。',
         transition='必要なら実装・保存・認証の確認範囲を補足して質疑を終える。',
         refs=['README.md「2026-10-14の運用方針」',
               'docs/NGROK.md §1「構成と準備」・§5〜6「認証・確認」・§7〜8',
               'src/lib/admin.ts isAdminEnabled',
               'src/lib/store.ts persist',
               'src/lib/llm/limiter.ts getLlmLimiter'],
         status='運用手順に記載。今回の資料作成ではトンネル開設・認証設定・live接続を行っていない。',
         qa='Q. 外部の誰でも使える？ A. 手順では許可したGoogleアカウントに限定する。認証の動作確認が必要。Q. 同時編集は？ A. 各ブラウザが独立して保存し、同期・統合しない。'),
]


prs = Presentation()
prs.slide_width, prs.slide_height = Inches(W), Inches(H)
prs.core_properties.title = '学内AIおいとまで、交流会の名札に話題を足す'
prs.core_properties.subject = '4分の開発成果報告／本編8枚・質疑用付録2枚'
prs.core_properties.author = 'おいとま活用中 開発プロジェクト'
prs.core_properties.keywords = 'おいとま, 学内AI, 交流会, 話題シール, 技術発表'
prs.core_properties.comments = '実装・仕様に基づく。各ページの発表者ノートに根拠と確認範囲を記載。'

text_records = []
geometry_records = []


def rgb(value):
    return RGBColor.from_string(value)


def rect(slide, x, y, w, h, fill=WHITE, line=None, rounded=True):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE,
                                  Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded:
        shape.adjustments[0] = 0.07
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)
    if line:
        shape.line.color.rgb = rgb(line)
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    shape._element.spPr.append(OxmlElement('a:effectLst'))
    geometry_records.append(dict(slide=len(prs.slides), x=x, y=y, w=w, h=h, kind='shape'))
    return shape


def txt(slide, value, x, y, w, h, size=26, color=INK, bold=False,
        align='left', valign=MSO_ANCHOR.TOP, role='label'):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shape.text_frame
    tf.clear()
    tf.margin_left = tf.margin_right = 0
    tf.margin_top = tf.margin_bottom = 0
    tf.word_wrap = False
    tf.vertical_anchor = valign
    tf.auto_size = None
    lines = value.split('\n')
    for idx, line in enumerate(lines):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.alignment = {'left': PP_ALIGN.LEFT, 'center': PP_ALIGN.CENTER, 'right': PP_ALIGN.RIGHT}[align]
        p.space_before = p.space_after = Pt(0)
        p.line_spacing = 1.16
        pPr = p._p.get_or_add_pPr()
        # Leave a little lateral room for different PowerPoint font metrics.
        pPr.set('marL', '0')
        pPr.set('marR', '0')
        run = p.add_run()
        run.text = line
        run.font.name = FONT
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = rgb(color)
        rpr = run._r.get_or_add_rPr()
        rpr.set('lang', 'ja-JP')
        for script in ('ea', 'cs'):
            node = OxmlElement(f'a:{script}')
            node.set('typeface', FONT)
            rpr.append(node)
    text_records.append(dict(slide=len(prs.slides), text=value, x=x, y=y, w=w, h=h,
                             size=size, role=role, bold=bold))
    return shape


def arrow(slide, x1, y1, x2, y2, color=MUTED, width=1.8):
    line = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,
                                      Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    line.line.color.rgb = rgb(color)
    line.line.width = Pt(width)
    end = OxmlElement('a:tailEnd')
    end.set('type', 'triangle')
    end.set('w', 'med')
    end.set('len', 'med')
    line.line._get_or_add_ln().append(end)
    geometry_records.append(dict(slide=len(prs.slides), x=min(x1, x2), y=min(y1, y2),
                                 w=abs(x2-x1), h=abs(y2-y1), kind='arrow'))
    return line


def node(slide, label, x, y, w, h, fill=WHITE, color=INK, size=24, border=BORDER):
    rect(slide, x, y, w, h, fill=fill, line=border)
    return txt(slide, label, x+.12, y+.10, w-.24, h-.20, size=size, color=color,
               bold=True, align='center', valign=MSO_ANCHOR.MIDDLE)


def body(slide, index, y, size=26, x=.68, w=12.0, gap=.55, color=INK):
    for idx, value in enumerate(SLIDES[index]['body']):
        txt(slide, value, x, y+idx*gap, w, .46, size=size, color=color, role='body')


def add_slide(index):
    d = SLIDES[index]
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb(BG)
    appendix = index >= 8
    txt(s, '#おいとま活用中' if not appendix else '質疑用付録 ／ 4分の対象外', .68, .25, 8.5, .25,
        size=12, color=MUTED, role='meta')
    if index > 0:
        txt(s, d['title'], .68, .79, 12.0, .66, size=32 if index == 3 else 34,
            bold=True, role='title')
    txt(s, '学内AI おいとまを使って学内の課題解決', .68, 7.09, 10.8, .22,
        size=11, color=MUTED, role='meta')
    txt(s, f'{index+1:02d}' if not appendix else f'A{index-7}', 11.96, 7.06, .68, .25,
        size=12, color=MUTED, align='right', role='meta')
    timing = f'{d["seconds"]}秒' if d['seconds'] else '質疑用／本編の時間外'
    notes = '\n\n'.join([
        f'{index+1}. {d["title"]}［{timing}］',
        f'【中心となる主張】\n{d["claim"]}',
        f'【読み上げ原稿】\n{d["script"]}',
        f'【図・説明のポイント（原稿に含めない補足）】\n{d["points"]}',
        f'【次へのつなぎ】\n{d["transition"]}',
        '【根拠】\n'+'\n'.join('- '+r for r in d['refs']),
        f'【確認区分・制約】\n{d["status"]}',
        f'【想定質問と回答】\n{d["qa"]}',
    ])
    s.notes_slide.notes_text_frame.text = notes
    return s


# 1. Problem and proposal.
s = add_slide(0)
txt(s, '学内AI おいとま × 交流会', .7, 1.08, 11.9, .52, size=26, color=TEAL, bold=True)
txt(s, '名札に「話しかける\nきっかけ」を足す', .68, 2.00, 12, 1.6, size=40, bold=True, role='title')
body(s, 0, 4.27, size=26, gap=.67)
txt(s, '#おいとま活用中', .7, 6.10, 11.8, .46, size=26, color=TEAL, bold=True)

# 2. Two grounded illustrative examples, entirely editable.
s = add_slide(1)
txt(s, '説明用の架空例', .68, 1.58, 12, .4, size=24, color=MUTED)
txt(s, '回答', .9, 2.15, 3.25, .4, size=24, bold=True)
txt(s, '個性 1', 4.65, 2.15, 2.2, .4, size=24, color=ORANGE, bold=True, align='center')
txt(s, '共有 2', 7.38, 2.15, 5.15, .4, size=24, color=TEAL, bold=True, align='center')
rows = [
    ('A', 'カレー屋開拓\nランニング開始', 'カレー屋を\n開拓中'),
    ('B', 'ラーメン巡り\nサイクリング', 'サイクリング\n好き'),
]
for j, (who, answer, personal) in enumerate(rows):
    y = 2.76+j*1.34
    rect(s, .68, y, 3.42, 1.12, GREY)
    txt(s, who, .85, y+.12, .43, .46, size=26, bold=True, color=MUTED)
    txt(s, answer, 1.35, y+.12, 2.63, .9, size=24)
    arrow(s, 4.18, y+.55, 4.47, y+.55)
    node(s, personal, 4.62, y, 2.45, 1.12, ORANGE_PALE, ORANGE, size=24, border=None)
    node(s, 'ごはん屋\n開拓勢', 7.32, y, 2.45, 1.12, TEAL_PALE, TEAL, size=24, border=None)
    node(s, '体を\n動かしたい', 10.02, y, 2.45, 1.12, TEAL_PALE, TEAL, size=24, border=None)
body(s, 1, 5.86, size=26, gap=.55)

# 3. User flow from input to physical output.
s = add_slide(2)
labels = ['Forms回答\nExcel', '取り込み\n列を確認', 'タグ生成\nおいとま', '確認・修正\n主催者', 'A4印刷\n話題シール']
xs = [.68+2.47*i for i in range(5)]
for j, (x, label) in enumerate(zip(xs, labels)):
    node(s, label, x, 2.9, 2.10, 1.58,
         fill=TEAL_PALE if j==2 else WHITE, color=TEAL if j==2 else INK,
         border=TEAL if j==2 else BORDER)
    if j < 4:
        arrow(s, x+2.15, 3.69, x+2.40, 3.69)
body(s, 2, 5.36, size=26, gap=.65)

# 4. Communication architecture and the five-stage pipeline.
s = add_slide(3)
body(s, 3, 1.65, size=24, gap=.43)
node(s, 'ブラウザ\n生成の指揮', .68, 2.82, 3.05, 1.08, WHITE)
node(s, 'Next.js API\nキー・JSON検証', 5.10, 2.82, 3.05, 1.08, WHITE)
node(s, 'おいとま\n学内AI', 9.56, 2.82, 3.05, 1.08, TEAL_PALE, TEAL, border=TEAL)
for a, b in [(3.82, 5.00), (8.25, 9.46)]:
    arrow(s, a, 3.09, b, 3.09, color=TEAL)
    arrow(s, b, 3.64, a, 3.64, color=MUTED)
txt(s, '要求 → ／ ← 応答', 4.4, 4.03, 4.6, .35, size=24, color=MUTED, align='center')
steps = [('① 話題抽出\n個性候補', True), ('② 共有候補\nづくり', True),
         ('③ 順位付け\n当てはまり', True), ('④ 人数調整\n割り当て', False), ('⑤ 会場の\n要約', True)]
for j, (label, ai) in enumerate(steps):
    x = .68+j*2.47
    node(s, label, x, 4.71, 2.1, 1.12, TEAL_PALE if ai else ORANGE_PALE,
         TEAL if ai else ORANGE, size=24, border=None)
    if j<4:
        arrow(s, x+2.14, 5.27, x+2.40, 5.27)
txt(s, '緑：おいとま　橙：ブラウザのコード', .68, 6.14, 12, .42, size=24, color=MUTED)
txt(s, '④で不足した人だけ、③を再実行', .68, 6.61, 12, .38, size=24, color=ORANGE)

# 5. Design comparison, explicitly a conceptual alternative.
s = add_slide(4)
rect(s, .68, 1.91, 5.76, 3.40, GREY)
rect(s, 6.76, 1.91, 5.88, 3.40, TEAL_PALE)
txt(s, '比較案：AIで一括割り当て', .94, 2.16, 5.21, .5, size=26, bold=True)
txt(s, '採用：AI＋コード', 7.02, 2.16, 5.30, .5, size=26, bold=True, color=TEAL)
node(s, 'AI：タグ作成＋割り当て', 1.02, 3.00, 5.05, .78, WHITE, size=24, border=None)
arrow(s, 3.55, 3.88, 3.55, 4.18)
txt(s, '人数の制約も生成に依存', 1.02, 4.39, 5.05, .5, size=24, color=MUTED, align='center')
node(s, 'AI：候補・当てはまり順位', 7.10, 3.00, 5.17, .78, WHITE, TEAL, size=24, border=None)
arrow(s, 9.68, 3.88, 9.68, 4.18, color=TEAL)
node(s, 'コード：人数調整・割り当て', 7.10, 4.32, 5.17, .78, WHITE, ORANGE, size=24, border=None)
txt(s, '比較案は未実装', .94, 5.48, 5.2, .39, size=24, color=MUTED)
txt(s, SLIDES[4]['body'][0], .68, 6.03, 12, .43, size=26, role='body')
txt(s, SLIDES[4]['body'][1], .68, 6.54, 12, .42, size=24, color=MUTED, role='body')

# 6. Privacy claim with implementation measures and an explicit routing condition.
s = add_slide(5)
txt(s, SLIDES[5]['body'][0], .68, 1.96, 12, .6, size=28, color=TEAL, bold=True, role='body')
for j, value in enumerate(SLIDES[5]['body'][1:4]):
    y = 3.08+j*.88
    txt(s, f'{j+1:02}', .71, y, .65, .43, size=24, color=TEAL, bold=True)
    txt(s, value, 1.58, y-.02, 10.8, .53, size=28, role='body')
rect(s, .68, 6.09, 11.96, .68, GREY)
txt(s, SLIDES[5]['body'][4], .92, 6.24, 11.45, .42, size=24, color=MUTED, role='body')

# 7. Results with verification scopes attached to the numbers.
s = add_slide(6)
rect(s, .68, 1.99, 5.75, 2.90, WHITE, line=BORDER)
rect(s, 6.76, 1.99, 5.88, 2.90, WHITE, line=BORDER)
txt(s, '98', 1.03, 2.22, 4.93, 1.30, size=76, color=TEAL, bold=True)
txt(s, '自動テスト成功', 1.03, 3.58, 4.93, .5, size=28, bold=True)
txt(s, '今回実行 ／ 17ファイル', 1.03, 4.17, 4.93, .4, size=24, color=MUTED)
txt(s, '18', 7.11, 2.22, 4.96, 1.30, size=76, color=TEAL, bold=True)
txt(s, 'モック受け入れ項目', 7.11, 3.58, 4.96, .5, size=28, bold=True)
txt(s, SLIDES[6]['body'][0], 7.11, 4.17, 4.96, .4, size=24, color=MUTED, role='body')
txt(s, SLIDES[6]['body'][1], .68, 5.24, 12, .55, size=28, role='body')
txt(s, SLIDES[6]['body'][2], .68, 6.25, 12, .5, size=26, color=MUTED, role='body')

# 8. A short, deliberate ending before the appendix.
s = add_slide(7)
txt(s, SLIDES[7]['body'][0], .68, 2.02, 12, .64, size=32, bold=True, role='body')
for j, (label, fill, color) in enumerate([('個性 1', ORANGE_PALE, ORANGE),
                                         ('共有 1', TEAL_PALE, TEAL), ('共有 2', TEAL_PALE, TEAL)]):
    node(s, label, .68+4.09*j, 3.25, 3.77, 1.53, fill, color, size=30, border=None)
txt(s, SLIDES[7]['body'][1], .68, 5.70, 12, .58, size=28, color=TEAL, bold=True, role='body')

# 9. Q&A: add-one pipeline.
s = add_slide(8)
for j, (label, fill, color) in enumerate([('① 話題抽出\nおいとま', TEAL_PALE, TEAL),
                                         ('② 既存タグ選択\nおいとま', TEAL_PALE, TEAL),
                                         ('③ 1人分の割り当て\nコード', ORANGE_PALE, ORANGE)]):
    x=.68+j*4.11
    node(s, label, x, 2.56, 3.72, 1.48, fill, color, border=None)
    if j<2:
        arrow(s, x+3.78, 3.30, x+4.04, 3.30)
body(s, 8, 4.86, size=26, gap=.68)
txt(s, '通常はextract・rankの2タスク', .68, 6.18, 12, .47, size=24, color=MUTED)

# 10. Q&A: actual documented deployment plan, not the old Vercel topology.
s = add_slide(9)
txt(s, SLIDES[9]['body'][0], .68, 1.62, 12, .48, size=26, role='body')
nodes = [(.68, '外部端末\nブラウザ', WHITE, INK),
         (3.80, 'ngrok\nGoogle認証', TEAL_PALE, TEAL),
         (6.92, '主催者PC\nNext.js API', WHITE, INK),
         (10.04, 'おいとま\n学内AI', TEAL_PALE, TEAL)]
for j, (x,label,fill,color) in enumerate(nodes):
    node(s,label,x,2.83,2.60,1.30,fill,color,border=BORDER)
    if j<3:
        arrow(s,x+2.66,3.27,x+3.04,3.27,color=TEAL)
        arrow(s,x+3.04,3.77,x+2.66,3.77,color=MUTED)
node(s, 'ブラウザ内保存\nlocalStorage', .68, 4.72, 2.92, 1.0, GREY, MUTED, border=None)
arrow(s, 1.98, 4.21, 1.98, 4.62)
txt(s, '学内／OU-VPN', 9.20, 4.40, 3.43, .40, size=24, color=MUTED, align='right')
txt(s, 'アプリ単体にログインはなく、\n外部中継の設定で制限する。', 4.03, 5.00, 8.60, .88, size=24, role='body')
txt(s, SLIDES[9]['body'][2], .68, 6.25, 12, .5, size=26, color=MUTED, role='body')


def write_notes():
    result = ['# 発表者ノート', '',
              '本編8枚の読み上げを合計4分で行う想定。図を指す間と切り替えを含む目安であり、リハーサルで調整する。付録9・10は質疑用。', '',
              '同じ内容をPPTXの各スライドの発表者ノートにも埋め込んでいる。補足・出典・想定質問は読み上げ時間に含めない。', '']
    elapsed=0
    for i,d in enumerate(SLIDES):
        result += [f'## {i+1}. {d["title"]}', '']
        if d['seconds']:
            start=f'{elapsed//60}:{elapsed%60:02}'
            elapsed+=d['seconds']
            end=f'{elapsed//60}:{elapsed%60:02}'
            result += [f'時間：{start}〜{end}（{d["seconds"]}秒）', '']
        else:
            result += ['時間：質疑用。本編4分には含めない。', '']
        for title,key in [('中心となる主張','claim'),('読み上げ原稿','script'),
                          ('図・説明のポイント','points'),('次へのつなぎ','transition'),
                          ('確認区分・制約','status'),('想定質問と回答','qa')]:
            result += [f'### {title}', '', d[key], '']
        result += ['### 根拠', ''] + ['- `'+r+'`' for r in d['refs']] + ['']
    (OUT/'speaker-notes.md').write_text('\n'.join(result), encoding='utf-8')


def preflight():
    issues=[]
    for rec in geometry_records+text_records:
        if rec['x'] < -.01 or rec['y'] < -.01 or rec['x']+rec['w'] > W+.01 or rec['y']+rec['h'] > H+.01:
            issues.append(f'Outside slide: {rec}')
    for rec in text_records:
        if rec['role']!='meta' and rec['size']<24:
            issues.append(f'Text below 24pt: {rec}')
        font=ImageFont.truetype(FONT_FILE, size=int(rec['size']*4))
        for line in rec['text'].split('\n'):
            width_pt=font.getlength(line)/4
            if width_pt > rec['w']*72*.99:
                issues.append(f'Slide {rec["slide"]}: text too wide ({width_pt:.1f} > {rec["w"]*72:.1f} pt): {line}')
        lines=rec['text'].count('\n')+1
        if lines*rec['size']*1.16 > rec['h']*72+3:
            issues.append(f'Slide {rec["slide"]}: text box too short: {rec["text"]}')
    body_counts=[]
    for i,d in enumerate(SLIDES):
        texts=[r['text'] for r in text_records if r['slide']==i+1 and r['role']=='body']
        count=len(re.sub(r'\s', '', ''.join(texts)))
        body_counts.append(dict(slide=i+1, body_characters=count, seconds=d['seconds']))
        if count>80:
            issues.append(f'Slide {i+1}: body text {count} > 80 characters')
    report=dict(issues=issues, body_counts=body_counts, main_seconds=sum(d['seconds'] for d in SLIDES),
                slide_count=len(SLIDES), notes_count=len(prs.slides),
                minimum_content_font_pt=min(r['size'] for r in text_records if r['role']!='meta'),
                text_records=text_records)
    (OUT/'preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2), encoding='utf-8')
    return issues


if __name__=='__main__':
    issues=preflight()
    write_notes()
    prs.save(OUT/'oitoma-4min.pptx')
    (OUT/'slide-data.json').write_text(json.dumps(SLIDES,ensure_ascii=False,indent=2), encoding='utf-8')
    print(json.dumps({'pptx':str(OUT/'oitoma-4min.pptx'), 'slides':len(SLIDES),
                      'main_seconds':sum(d['seconds'] for d in SLIDES), 'preflight_issues':issues},
                     ensure_ascii=False,indent=2))

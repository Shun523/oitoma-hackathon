// src/lib/llm/prompts.ts
// 文面は docs/spec.md のとおり。`{…}` は差し込み。調整は人がこのファイルで行う。
import { EVENT } from '../../config/event';

export function toneText(tone: 'casual' | 'standard' | 'academic'): string {
  if (tone === 'casual') return '友だちに話すような、かなりくだけた言葉';
  if (tone === 'standard') return '初対面の大人同士でも使える、親しみやすい言葉';
  return '少し知的な好奇心をくすぐる言葉';
}

export function systemPrompt(): string {
  return [
    'あなたは、交流会の名札に載せる「話しかけたくなるハッシュタグ」を作る編集者です。',
    `イベント：${EVENT.eventName}`,
    `参加者層：${EVENT.audience}`,
    `言葉の温度感：${toneText(EVENT.tone)}`,
    '',
    '守ること：',
    '- 出力は指定されたJSONだけにする。前置き、説明、コードブロックの記号は書かない。',
    '- タグには「#」を付けない。空白を入れない。全角12文字以内（半角は0.5文字）。',
    '- 雑談の入口になる、くだけた日常の言葉にする。肩書き、専門用語、仕事の課題はそのまま使わず言い換える。',
    '- 家族、健康・病気、恋愛、収入、宗教、政治、容姿、年齢に関わる話題は使わない。',
    '- 回答に書かれていないことを事実のように書かない。',
  ].join('\n');
}

export function extractPrompt(people: { id: string; affiliation: string; category: string; intro: string; hobby: string }[]): {
  system: string;
  user: string;
} {
  const lines = people.map((p) => JSON.stringify(p)).join('\n');
  return {
    system: systemPrompt(),
    user: [
      '次の参加者それぞれについて、「話題の要素」と「個性タグの候補」を作ってください。',
      '',
      '# 話題の要素（topics）',
      '- 自己紹介と「最近ハマっていること」から、雑談の種になる要素を1〜5個抜き出す。',
      '- 各15文字以内の短い名詞句にする。表記ゆれをそろえ、細かすぎる固有名詞は一段まるめる。',
      '  例：「岡山駅前の〇〇カレー」→「カレー屋めぐり」',
      '- 自己紹介も一言も空の人は、所属と区分から無難な要素を1〜2個作る。',
      '  例：所属「工学部 情報系」→「プログラミング」',
      '',
      '# 個性タグの候補（personal）',
      '- 3個。その人だけの具体的な一言で、見た人が「それ何ですか？」と聞きたくなる言い回しにする。',
      '- 良い例：週末は畑仕事／夜型を科学したい／パンを焼き始めた／ランニング3か月目',
      '- 悪い例：趣味はいろいろ（ぼんやりしている）／画像処理を研究（肩書きのまま）／よろしくお願いします（話題がない）',
      '- 自己紹介も一言も空の人も、所属や区分から1個以上作る。',
      '',
      '# 参加者',
      lines,
      '',
      '# 出力形式',
      '{"results":[{"id":"P001","topics":["カレー屋めぐり","ランニング"],"personal":["パンを焼き始めた","週末は畑仕事","夜型を科学したい"]}]}',
      '入力の全員分を、入力と同じidで返す。',
    ].join('\n'),
  };
}

export function catalogPrompt(
  lines: string[],
  params: { n: number; targetSize: number; minSize: number; maxSize: number; candidateCount: number },
): { system: string; user: string } {
  return {
    system: systemPrompt(),
    user: [
      `参加者全員の「話題の要素」を見比べて、名札に載せる「共有タグ」の候補を${params.candidateCount}個作ってください。`,
      '共有タグは、会場の何人かとかぶって「同じですね」から話が始まるためのタグです。',
      '',
      '# 条件',
      `- 1つのタグが、会場の約${params.targetSize}人（${params.minSize}〜${params.maxSize}人）に当てはまる粒度にする。会場は${params.n}人。`,
      '- 広すぎるタグ（趣味がある、食べるのが好き）は誰とでもかぶって会話にならない。狭すぎるタグ（岡山駅前のカレー屋）は1人しか持たない。どちらも作らない。',
      '- 似た話題をまとめ、抽象度を一段上げる。',
      '  例：「ラーメン屋めぐり」「カレー屋開拓」→「ごはん屋開拓勢」',
      '  例：「ランニングを始めた」「運動不足」→「体を動かしたい」',
      '- 堅い話題は、くだけた共通点に言い換える。',
      '  例：「腸内細菌の研究」「発酵食品の研究」→「微生物にお世話になってる」',
      '- 話題の少ない人にも当てはまるタグ（区分や所属から言えるもの）を2〜3個入れる。',
      '- 「朝型」「夜型」のような対になるタグを入れてもよい。',
      '- 同じ意味のタグを重ねない。',
      '- covers には、そのタグがまとめる話題を20文字以内で書く。',
      '',
      '# 参加者の話題（id: 区分 / 話題の要素）',
      lines.join('\n'),
      '',
      '# 出力形式',
      '{"tags":[{"label":"ごはん屋開拓勢","covers":"ラーメンやカレーなど店めぐり"}]}',
    ].join('\n'),
  };
}

export function rankPrompt(tagLines: string[], personLines: string[], rankLength: number): {
  system: string;
  user: string;
} {
  return {
    system: systemPrompt(),
    user: [
      `共有タグの候補一覧から、各参加者に当てはまるタグを、当てはまる順に${rankLength}個選んでください。`,
      '',
      '# 条件',
      '- 話題の要素に一番近いタグを先頭にする。',
      '- 直接書かれていなくても、自然に当てはまるタグは選んでよい（例：「カレー屋開拓」→「ごはん屋開拓勢」）。',
      `- 当てはまるタグが少ない人も、無理のない範囲で${rankLength}個選ぶ。`,
      '- 候補一覧にないidは使わない。',
      '',
      '# 共有タグの候補（id ラベル：まとめる話題）',
      tagLines.join('\n'),
      '',
      '# 参加者（id: 区分 / 話題の要素 / 最近ハマっていること）',
      personLines.join('\n'),
      '',
      '# 出力形式',
      '{"results":[{"id":"P001","ranked":["T03","T11","T07","T01","T15"]}]}',
      '入力の全員分を返す。',
    ].join('\n'),
  };
}

export function summaryPrompt(lines: string[]): { system: string; user: string } {
  return {
    system: systemPrompt(),
    user: [
      '今日の交流会で盛り上がりそうな話題を、開会前のアナウンス用に2〜3文でまとめてください。',
      '- 共有タグと人数をもとに、参加者が「話しかけてみよう」と思える明るい文にする。',
      '- 個人名や、個人が分かる内容は書かない。',
      '- 全体で150文字以内。',
      '',
      '# 共有タグ（人数）',
      lines.join('\n'),
      '',
      '# 出力形式',
      '{"text":"..."}',
    ].join('\n'),
  };
}

const EXTRACT_PERSONAL_RULES = [
  '- 3個。その人だけの具体的な一言で、見た人が「それ何ですか？」と聞きたくなる言い回しにする。',
  '- 良い例：週末は畑仕事／夜型を科学したい／パンを焼き始めた／ランニング3か月目',
  '- 悪い例：趣味はいろいろ（ぼんやりしている）／画像処理を研究（肩書きのまま）／よろしくお願いします（話題がない）',
].join('\n');

export function regeneratePrompt(
  person: { id: string; affiliation: string; category: string; intro: string; hobby: string; topics: string[] },
  avoid: string[],
): { system: string; user: string } {
  return {
    system: systemPrompt(),
    user: [
      'この参加者の個性タグを、別の切り口で3個作ってください。',
      `次の案とは違う言い回し・違う話題にすること：${avoid.join('／')}`,
      '',
      '# 個性タグの条件',
      EXTRACT_PERSONAL_RULES,
      '',
      '# 参加者',
      JSON.stringify(person),
      '',
      '# 出力形式',
      '{"personal":["...","...","..."]}',
    ].join('\n'),
  };
}

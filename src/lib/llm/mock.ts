// src/lib/llm/mock.ts
// おいとまを呼ばず、決まった結果を返す（サーバー・スクリプト・テスト共用）。
// 同じ入力なら毎回同じ結果になるようにし、乱数は使わない。
import { elapsedMs } from '../time';
import { displayLength, sanitizeTag } from '../text';
import type { CatalogInput, ExtractInput, LlmApi, RankInput, SharedTag } from '../types';

interface TopicDict {
  label: string;
  covers: string;
  keywords: string[];
}

export const MOCK_TOPICS: TopicDict[] = [
  { label: 'ごはん屋開拓勢', covers: 'ラーメンやカレーなど店めぐり', keywords: ['ラーメン', 'カレー', 'パン', 'グルメ', '店'] },
  { label: '体を動かしたい', covers: '走る・鍛える・登るなど運動', keywords: ['ランニング', '筋トレ', 'ジム', '運動', 'ヨガ', '登山'] },
  { label: 'コーヒーがないと無理', covers: 'コーヒーとカフェの話', keywords: ['コーヒー', 'カフェ'] },
  { label: '夜型を自認', covers: '夜更かしと夜型の話', keywords: ['夜型', '夜更かし', '徹夜'] },
  { label: '朝活してる', covers: '早起きと朝活の話', keywords: ['朝型', '朝活', '早起き'] },
  { label: '週末アウトドア', covers: 'キャンプや釣りの話', keywords: ['キャンプ', '釣り', 'アウトドア'] },
  { label: '旅に出たい', covers: '旅行と旅の話', keywords: ['旅行', '旅'] },
  { label: 'ゲームで夜更かし', covers: 'ゲームの話', keywords: ['ゲーム'] },
  { label: '動物と暮らしてる', covers: '猫や犬などペットの話', keywords: ['猫', '犬', 'ペット'] },
  { label: '自炊がんばり中', covers: '料理や弁当の話', keywords: ['料理', '自炊', '弁当'] },
  { label: '土いじり好き', covers: '畑や植物の話', keywords: ['畑', '家庭菜園', '植物'] },
  { label: 'AIに頼りがち', covers: '生成AIなどAI活用の話', keywords: ['AI', '生成AI', 'ChatGPT'] },
  { label: '本と漫画', covers: '読書や漫画の話', keywords: ['本', '読書', '漫画', '小説'] },
  { label: '音楽が好き', covers: 'ライブや楽器の話', keywords: ['音楽', 'ライブ', 'ギター', 'ピアノ'] },
  { label: '推し活中', covers: '推しやアニメの話', keywords: ['推し', 'アイドル', 'アニメ'] },
  { label: '岡山を開拓中', covers: '岡山や地元の話', keywords: ['岡山', '地元'] },
  { label: 'ものづくり好き', covers: '開発やDIYの話', keywords: ['工学', '開発', 'プログラム', '電子工作', 'DIY'] },
  { label: '微生物にお世話になってる', covers: '微生物や発酵の話', keywords: ['微生物', '細菌', '発酵'] },
  { label: '教えるのが好き', covers: '教育や学生の話', keywords: ['教育', '授業', '入試', '学生'] },
  { label: '写真を撮りがち', covers: '写真やカメラの話', keywords: ['写真', 'カメラ'] },
];

export function hashStr(s: string): number {
  let h = 0;
  for (const ch of s) {
    h = (Math.imul(h, 31) + (ch.codePointAt(0) ?? 0)) | 0;
  }
  return h >>> 0;
}

function normHay(s: string): string {
  return s.normalize('NFKC').toLowerCase();
}

async function mockWait(key: string): Promise<void> {
  if (process.env.VITEST) return;
  const ms = 200 + (hashStr(key) % 401);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isTagOk(s: string): boolean {
  const d = displayLength(s);
  return d >= 1 && d <= 12;
}

function matchedKeywords(hay: string): { entry: TopicDict; keyword: string }[] {
  const out: { entry: TopicDict; keyword: string }[] = [];
  for (const entry of MOCK_TOPICS) {
    const hit = entry.keywords.find((k) => hay.includes(normHay(k)));
    if (hit !== undefined) out.push({ entry, keyword: hit });
  }
  return out;
}

function extractOne(p: ExtractInput): { topics: string[]; personal: string[] } {
  const hay = normHay(`${p.intro}\n${p.hobby}\n${p.affiliation}`);
  const matched = matchedKeywords(hay);
  let topics = matched.map((m) => m.keyword).slice(0, 5);
  if (p.hobby.trim() !== '') {
    const head = p.hobby.trim().slice(0, 15);
    topics = [head, ...topics.filter((t) => t !== head)].slice(0, 5);
  }
  if (topics.length === 0) {
    topics = [(p.affiliation.trim() || p.category).slice(0, 15)];
  }
  const first = topics[0] ?? p.category;
  const candidates = [p.hobby.trim().slice(0, 12), `${first}好き`, `${first}が気になる`]
    .map((s) => sanitizeTag(s))
    .filter((s, i, arr) => s !== '' && isTagOk(s) && arr.indexOf(s) === i)
    .slice(0, 3);
  return { topics: topics.slice(0, 5), personal: candidates };
}

function dictByLabel(label: string): TopicDict | undefined {
  return MOCK_TOPICS.find((d) => d.label === label);
}

export const mockLlmApi: LlmApi = {
  async extract(people: ExtractInput[]) {
    const started = performance.now();
    await mockWait(people.map((p) => p.id).join(','));
    const results = people.map((p) => {
      const { topics, personal } = extractOne(p);
      return { id: p.id, topics, personal };
    });
    return { results, missing: [], meta: { attempts: 1, ms: elapsedMs(started) } };
  },

  async catalog(people: CatalogInput[], params: { candidateCount: number }) {
    const started = performance.now();
    await mockWait(people.map((p) => p.id).join(','));
    const scored = MOCK_TOPICS.map((entry) => {
      let count = 0;
      for (const p of people) {
        const hay = normHay(`${p.topics.join('\n')}\n${p.category}`);
        if (entry.keywords.some((k) => hay.includes(normHay(k)))) count += 1;
      }
      return { entry, count };
    });
    scored.sort((a, b) => b.count - a.count);
    const tags = scored
      .slice(0, Math.max(0, params.candidateCount))
      .map((s) => ({ label: s.entry.label, covers: s.entry.covers }));
    return { tags, meta: { attempts: 1, ms: elapsedMs(started) } };
  },

  async rank(tags: SharedTag[], people: RankInput[], rankLength: number) {
    const started = performance.now();
    await mockWait(`${tags.map((t) => t.id).join(',')}|${people.map((p) => p.id).join(',')}`);
    const results = people.map((p) => {
      const hay = normHay(`${p.topics.join('\n')}\n${p.hobby}`);
      const scored = tags.map((t) => {
        const dict = dictByLabel(t.label);
        const keys = dict ? dict.keywords : [t.label];
        const score = keys.filter((k) => hay.includes(normHay(k))).length;
        return { id: t.id, score, tie: hashStr(`${p.id}:${t.id}`) };
      });
      scored.sort((a, b) => b.score - a.score || a.tie - b.tie);
      return { id: p.id, ranked: scored.slice(0, rankLength).map((s) => s.id) };
    });
    return { results, missing: [], meta: { attempts: 1, ms: elapsedMs(started) } };
  },

  async summary(tags: { label: string; count: number }[]) {
    const started = performance.now();
    await mockWait(tags.map((t) => t.label).join(','));
    const sorted = [...tags].sort((a, b) => b.count - a.count);
    const text =
      sorted.length >= 2
        ? `今日は『${sorted[0].label}』『${sorted[1].label}』の仲間が多い会場です。話題シールのタグを見て、気軽に話しかけてみましょう。`
        : sorted.length === 1
          ? `今日は『${sorted[0].label}』の仲間が多い会場です。話題シールのタグを見て、気軽に話しかけてみましょう。`
          : '今日はさまざまな話題の仲間が多い会場です。話題シールのタグを見て、気軽に話しかけてみましょう。';
    return { text, meta: { attempts: 1, ms: elapsedMs(started) } };
  },

  async regenerate(person: ExtractInput & { topics: string[] }, avoid: string[]) {
    const started = performance.now();
    await mockWait(person.id);
    const topic = person.topics[0] ?? person.hobby.slice(0, 12) ?? person.category;
    const hobby = person.hobby.trim();
    const candidates = [`最近${topic}`, `${topic}の話がしたい`, hobby ? `${hobby}中` : 'はじめまして']
      .map((s) => sanitizeTag(s))
      .filter((s, i, arr) => s !== '' && isTagOk(s) && !avoid.includes(s) && arr.indexOf(s) === i)
      .slice(0, 3);
    const personal = candidates.length > 0 ? candidates : ['話しかけてね'];
    return { personal, meta: { attempts: 1, ms: elapsedMs(started) } };
  },
};

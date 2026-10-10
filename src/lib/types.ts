// src/lib/types.ts
export type Category = '学生' | '教員' | '職員' | '企業' | '自治体' | 'その他';

export interface Participant {
  id: string; // 'P001' から取り込み順の連番
  name: string; // シールの隅に小さく載せる（受付で配るため）。おいとまには送らない
  affiliation: string; // 所属（空文字可）
  category: Category;
  intro: string; // 自己紹介。未回答・同意なしは ''
  hobby: string; // 最近ハマっていること。未回答・同意なしは ''
  consent: boolean;
}

export interface Extraction {
  participantId: string;
  topics: string[]; // 1〜5個。各15文字以内
  personalCandidates: string[]; // 0〜3個。'#'なし、12文字以内
  source: 'llm' | 'fallback';
}

export interface SharedTag {
  id: string; // 'T01' から候補の順に連番
  label: string; // '#'なし、12文字以内
  covers: string; // まとめた話題の説明（確認画面用。シールには出さない）
}

export type Flag =
  | 'no_answer' // 自己紹介も一言も空
  | 'no_consent' // 掲載に同意していない
  | 'ng_word' // NG語を含む疑い
  | 'fallback_personal' // 個性タグが代替の文言
  | 'fallback_shared'; // 共有タグをプログラムで補った

export interface Assignment {
  participantId: string;
  personalTag: string; // 採用中の個性タグ
  sharedTagIds: string[]; // 原則2つ。足りない場合は flag を付ける
  edited: boolean; // 人が手で変えたら true
  flags: Flag[];
}

export interface GenerationParams {
  n: number; // 対象人数
  targetSize: number; // 1つの共有タグを持つ人数の目安
  minSize: number; // 下限（必ず守る）
  maxSize: number; // 上限（できるだけ守る。超えたら警告）
  candidateCount: number; // 共有タグ候補の数
  rankLength: number; // 1人あたりの当てはまり順の長さ（5）
}

export interface Metrics {
  participants: number;
  sharedTagCount: number; // 1人以上が持つ共有タグの数
  matesMin: number; // 共通タグ仲間の最小
  matesMedian: number;
  matesMax: number;
  encounterRate: number; // 0〜1
  sizeMin: number; // 共有タグの人数の最小
  sizeMax: number;
  needsReview: number; // flags を1つ以上持つ人数
}

export type PhaseKey = 'extract' | 'catalog' | 'rank' | 'assign' | 'summary';
export interface PhaseProgress {
  key: PhaseKey;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  done: number;
  total: number;
  startedAt?: number; // Date.now()。生成の再生で所要時間の表示に使う
  finishedAt?: number;
  message?: string;
}

export interface LlmCallLog {
  task: 'extract' | 'catalog' | 'rank' | 'summary' | 'regenerate';
  ms: number;
  ok: boolean;
  attempts: number;
  at: string; // ISO
}

export type SheetPresetKey = 'label24' | 'label21';

export interface PrintOptions {
  preset: SheetPresetKey; // 既定 'label24'
  showCount: boolean; // 共有タグに人数を添える（SHOULD）
  offsetXmm: number; // 印刷位置の調整（-10〜10、0.5刻み）
  offsetYmm: number;
  gapXmm: number; // ラベルどうしのすき間（0〜10）。用紙の説明書きに合わせる
  gapYmm: number;
}

// localStorage に保存する全体（キー 'nametag-app-v1'）
export interface AppState {
  version: 1;
  participants: Participant[];
  importedAt: string | null;
  params: GenerationParams | null;
  extractions: Record<string, Extraction>;
  candidates: SharedTag[]; // 段階2の候補（全件）
  rankings: Record<string, string[]>; // participantId → 候補IDの当てはまり順
  activeTagIds: string[]; // 段階4で残った共有タグのID
  assignments: Record<string, Assignment>;
  summary: string; // 会場の傾向（なければ ''）
  progress: PhaseProgress[];
  llmLog: LlmCallLog[]; // 直近200件まで
  generatedAt: string | null;
  printOptions: PrintOptions;
}

// src/data/published.json（公開トップが読む）
export interface PublishedData {
  version: 1;
  eventName: string;
  generatedAt: string;
  stickers: { id: string; name: string; affiliation: string; personalTag: string; sharedTags: string[] }[];
  sharedTags: { label: string; count: number }[]; // 人数の多い順
  metrics: Metrics;
  summary: string;
}

// おいとま連携で共有する型
export interface ExtractInput {
  id: string;
  affiliation: string;
  category: Category;
  intro: string;
  hobby: string;
}
export interface ExtractResult {
  id: string;
  topics: string[];
  personal: string[];
}
export interface CatalogInput {
  id: string;
  category: Category;
  topics: string[];
}
export interface RankInput {
  id: string;
  category: Category;
  topics: string[];
  hobby: string;
}
export interface RankResult {
  id: string;
  ranked: string[];
}
export interface CallMeta {
  attempts: number;
  ms: number;
}

export interface LlmApi {
  extract(people: ExtractInput[]): Promise<{ results: ExtractResult[]; missing: string[]; meta: CallMeta }>;
  catalog(people: CatalogInput[], params: GenerationParams): Promise<{ tags: { label: string; covers: string }[]; meta: CallMeta }>;
  rank(tags: SharedTag[], people: RankInput[], rankLength: number): Promise<{ results: RankResult[]; missing: string[]; meta: CallMeta }>;
  summary(tags: { label: string; count: number }[]): Promise<{ text: string; meta: CallMeta }>;
  regenerate(person: ExtractInput & { topics: string[] }, avoid: string[]): Promise<{ personal: string[]; meta: CallMeta }>;
}

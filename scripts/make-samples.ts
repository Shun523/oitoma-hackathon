// scripts/make-samples.ts
// ダミー回答 → Forms形式のxlsx。`npm run samples` で実行。
// public/samples/sample-40.xlsx は sample-participants.ts をそのまま、
// public/samples/sample-200.xlsx は候補リストを種固定の乱数で組み合わせる（毎回同じ結果）。
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { SAMPLE_PARTICIPANTS_40, type SampleAnswer } from '../src/data/sample-participants';

const HEADERS = [
  'ID',
  '開始時刻',
  '完了時刻',
  'メール',
  '名前',
  '最終変更時刻',
  'お名前',
  '所属',
  '区分',
  '自己紹介（任意）',
  '最近ハマっていること（任意）',
  '名札への掲載に同意します',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// 2026-10-01の適当な時刻。開始から10分後に完了。
function timeRange(index: number): [string, string] {
  const totalMinutes = 9 * 60 + index * 3;
  const end = totalMinutes + 10;
  const fmt = (m: number): string => `2026/10/01 ${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;
  return [fmt(totalMinutes), fmt(end)];
}

function toRow(a: SampleAnswer, index: number): (string | number)[] {
  const [start, end] = timeRange(index);
  return [
    index + 1,
    start,
    end,
    'anonymous',
    '',
    '',
    a.name,
    a.affiliation,
    a.category,
    a.intro,
    a.hobby,
    a.consent ? '同意します' : '',
  ];
}

function writeXlsx(filePath: string, answers: SampleAnswer[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...answers.map(toRow)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '回答');
  XLSX.writeFile(wb, filePath);
  console.log(`wrote ${filePath} (${answers.length}人)`);
}

// 種固定の乱数（毎回同じ結果）。
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SURNAMES_200 = [
  '山田', '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '中村', '小林', '加藤',
  '吉田', '山本', '松本', '井上', '木村', '林', '清水', '森', '池田', '橋本',
];
const GIVEN_200 = [
  'さくら', 'はると', 'みずき', 'れん', 'あおい', 'ゆうと', 'かりん', 'そうた', 'りお', 'かいと',
  'ほのか', 'だいき', 'ゆな', 'しょうた', 'あかり', 'ゆうき', 'めい', 'ひなた', 'りく', 'ここな',
];
const AFFILIATIONS_200 = [
  '文学部', '教育学部', '法学部', '経済学部', '理学部', '工学部', '農学部',
  '環境生命科学研究科', '総務課', '入試課', '〇〇食品株式会社', '〇〇システムズ株式会社',
];
const CATEGORIES_200 = ['学生', '大学院学生', '教授', '准教授', '大学職員', '事務職員', '会社員', '自治体関係者'];

const INTROS_200 = [
  ...SAMPLE_PARTICIPANTS_40.map((a) => a.intro).filter((s) => s !== ''),
  '週末は本屋を巡っています',
  '子どもと公園に行きます',
  '日本酒の飲み比べが好きです',
  '朝の散歩が日課です',
  '手芸で小物を作っています',
];
const HOBBIES_200 = [
  ...SAMPLE_PARTICIPANTS_40.map((a) => a.hobby).filter((s) => s !== ''),
  '銭湯巡り',
  'ベランダ菜園',
  '深夜ラジオを聴く',
  '御朱印集め',
  'プラモデルづくり',
];

function make200(): SampleAnswer[] {
  const rand = mulberry32(20261009);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  return Array.from({ length: 200 }, () => ({
    name: `${pick(SURNAMES_200)}${pick(GIVEN_200)}`,
    affiliation: pick(AFFILIATIONS_200),
    category: pick(CATEGORIES_200),
    intro: rand() < 0.85 ? pick(INTROS_200) : '',
    hobby: rand() < 0.9 ? pick(HOBBIES_200) : '',
    consent: rand() >= 0.05,
  }));
}

// 体験用15人（40人の中から話題が重なるように選ぶ。全員が自己紹介と一言あり・同意あり）。
// 飲食店めぐり3、運動3、コーヒー・カフェ2、ゲーム2、AIを使った作業2、旅行・キャンプ2、堅い自己紹介2。
// 小川たくみはAIと堅いの両方に数え、15人目は近い話題の村上ゆいとにした。
const SAMPLE_15_NAMES = [
  '山田さくら', '佐藤はると', '高橋れん', // 飲食店めぐり
  '中村そうた', '小林りお', '加藤かいと', // 運動
  '井上しょうた', '木村あかり', // コーヒー・カフェ
  '森ひなた', '橋本ここな', // ゲーム
  '山下さら', '小川たくみ', // AIを使った作業（小川は堅い自己紹介も兼ねる）
  '藤田こうき', '村上ゆいと', // 旅行・キャンプ
  '斎藤ゆずき', // 堅い自己紹介
];

const root = path.resolve(__dirname, '..');
writeXlsx(path.join(root, 'public', 'samples', 'sample-15.xlsx'), SAMPLE_15_NAMES.map((name) => {
  const found = SAMPLE_PARTICIPANTS_40.find((a) => a.name === name);
  if (!found) throw new Error(`sample-15 にない名前: ${name}`);
  return found;
}));
writeXlsx(path.join(root, 'public', 'samples', 'sample-40.xlsx'), SAMPLE_PARTICIPANTS_40);
writeXlsx(path.join(root, 'public', 'samples', 'sample-200.xlsx'), make200());

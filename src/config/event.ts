// src/config/event.ts
import type { PrintOptions } from '../lib/types';

export const EVENT = {
  appName: '#おいとま活用中',
  eventName: 'オープンイノベーションMatch Up 交流会（デモ）',
  audience: '企業、研究者、学生、自治体関係者',
  tone: 'casual' as 'casual' | 'standard' | 'academic',
  fallbackPersonalTag: '話しかけてね',
  accentColor: '#E4572E',
  publicNote: 'デモ用のダミーデータと、掲載に同意した回答から作っています',
};

export const PIPELINE = {
  extractBatchSize: 8, // 話題の読み取り：1回で送る人数
  rankBatchSize: 15, // 当てはまり順：1回で送る人数
  concurrency: 3, // おいとまへの同時呼び出し数
  rankLength: 5,
  minParticipants: 6,
  maxParticipants: 300,
};

// ラベル用紙の型番。どれも3列で、1行＝1人分（個性タグ、共有タグ1、共有タグ2）。
// 寸法はmm、文字はpt。並びは用紙の中央に寄せ、すき間とずれは PrintOptions で調整する
export const SHEET_PRESETS = {
  label24: { label: 'A4 24面ラベル（66.0×33.9mm）', rows: 8, wMm: 66.0, hMm: 33.9, padMm: 3, minPt: 12, maxPt: 20 },
  label21: { label: 'A4 21面ラベル（70.0×42.3mm）', rows: 7, wMm: 70.0, hMm: 42.3, padMm: 3, minPt: 13, maxPt: 22 },
} as const;
export const STICKER_COLS = 3;
export const STICKER_CAPTION_PT = 6.5;

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  preset: 'label24',
  showCount: false,
  offsetXmm: 0,
  offsetYmm: 0,
  gapXmm: 0,
  gapYmm: 0,
};

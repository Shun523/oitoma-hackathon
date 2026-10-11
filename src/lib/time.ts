// 経過時間はPCの日時補正に影響されない時計で測る。
export function elapsedMs(started: number): number {
  return Math.max(0, Math.round(performance.now() - started));
}

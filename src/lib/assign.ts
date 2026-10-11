// src/lib/assign.ts
// 共有タグの割り当て。下限（minSize）は必ず守り、上限（maxSize）はできるだけ守る。

export interface AssignInput {
  participantIds: string[]; // ID順
  rankings: Record<string, string[]>; // 候補IDの当てはまり順
  candidateIds: string[]; // 候補の並び順（同点のときの優先順）
  minSize: number;
  maxSize: number;
}

export interface AssignResult {
  held: Record<string, string[]>;
  activeIds: string[];
  shortIds: string[];
}

export function assignSharedTags(input: AssignInput): AssignResult {
  const { participantIds, rankings, candidateIds, minSize, maxSize } = input;
  let active = [...candidateIds];
  const held: Record<string, string[]> = {};

  const isActive = (id: string): boolean => active.includes(id);

  // 各人に、当てはまり順のうち active にあるものを先頭から2つ持たせる。
  const pickTop2 = (): void => {
    for (const pid of participantIds) {
      held[pid] = (rankings[pid] ?? []).filter(isActive).slice(0, 2);
    }
  };

  const countHolders = (): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const id of active) counts.set(id, 0);
    for (const pid of participantIds) {
      for (const id of held[pid] ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  };

  // あふれの解消：最大3回、上限を超えたタグを人数の多い順に見ていく。
  const resolveOverflow = (): void => {
    for (let round = 0; round < 3; round += 1) {
      const counts = countHolders();
      const over = active
        .filter((id) => (counts.get(id) ?? 0) > maxSize)
        .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
      if (over.length === 0) return;
      for (const tagId of over) {
        const holders = participantIds.filter((pid) => (held[pid] ?? []).includes(tagId));
        // そのタグの順位が低い人から（同順位ならIDの大きい人から）見る。
        holders.sort((a, b) => {
          const ra = (rankings[a] ?? []).indexOf(tagId);
          const rb = (rankings[b] ?? []).indexOf(tagId);
          if (ra !== rb) return rb - ra;
          return b < a ? -1 : b > a ? 1 : 0;
        });
        for (const pid of holders) {
          const current = countHolders();
          if ((current.get(tagId) ?? 0) <= maxSize) break; // 人数が上限に戻ったら次のタグへ
          const target = (rankings[pid] ?? []).find(
            (id) =>
              active.includes(id) && !(held[pid] ?? []).includes(id) && (current.get(id) ?? 0) < maxSize,
          );
          if (target !== undefined) {
            held[pid] = (held[pid] ?? []).map((id) => (id === tagId ? target : id));
          }
          // 付け替え先がない人はそのままにする。
        }
      }
    }
  };

  for (let iter = 0; iter < candidateIds.length; iter += 1) {
    pickTop2();
    resolveOverflow();
    const counts = countHolders();
    active = active.filter((id) => (counts.get(id) ?? 0) > 0); // 0人のタグを外す
    const recount = countHolders();
    const below = active.filter((id) => (recount.get(id) ?? 0) < minSize);
    if (below.length === 0) break;
    // 下限未満の中で一番人数の少ないタグを1つだけ外す（同数なら候補の並びで後ろのもの）。
    let victim = below[0];
    for (const id of below) {
      const c = recount.get(id) ?? 0;
      const vc = recount.get(victim) ?? 0;
      if (c < vc || (c === vc && candidateIds.indexOf(id) > candidateIds.indexOf(victim))) {
        victim = id;
      }
    }
    active = active.filter((id) => id !== victim);
  }

  // 最後の active で、pickTop2 とあふれの解消をもう一度行う。
  pickTop2();
  resolveOverflow();

  const finalCounts = countHolders();
  const activeIds = candidateIds.filter((id) => (finalCounts.get(id) ?? 0) > 0);
  const shortIds = participantIds.filter((pid) => (held[pid] ?? []).length < 2);
  return { held, activeIds, shortIds };
}

export interface AssignOneInput {
  ranking: string[]; // おいとまの当てはまり順（候補ID）
  activeIds: string[]; // 採用タグ（候補の並び順）
  counts: Record<string, number>; // 今の各採用タグの人数（この人を含まない）
}

export function assignOne(input: AssignOneInput): { sharedTagIds: string[]; usedFallback: boolean } {
  const { ranking, activeIds, counts } = input;
  // 当てはまり順のうち採用タグにあるものを、先頭から重複なしで2つまで取る。
  const picked: string[] = [];
  for (const tid of ranking) {
    if (picked.length >= 2) break;
    if (activeIds.includes(tid) && !picked.includes(tid)) picked.push(tid);
  }
  if (picked.length >= 2) return { sharedTagIds: picked, usedFallback: false };
  // 足りなければ、まだ持っていない採用タグを人数の少ない順、同数なら採用タグの並び順で足す。
  const rest = activeIds
    .filter((tid) => !picked.includes(tid))
    .sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0) || activeIds.indexOf(a) - activeIds.indexOf(b));
  return { sharedTagIds: [...picked, ...rest].slice(0, 2), usedFallback: true };
}

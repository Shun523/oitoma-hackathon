// src/app/admin/review/page.tsx
// 確認と差し替え、ビフォー・アフター。編集すると指標とシールがすぐ変わる。
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FitToWidth } from '@/components/FitToWidth';
import { MetricsCards } from '@/components/MetricsCards';
import { StickerSet } from '@/components/StickerSet';
import { TagInput } from '@/components/TagInput';
import { displayLength, sanitizeTag } from '@/lib/text';
import { computeMetrics } from '@/lib/metrics';
import { useHydrated, useStore } from '@/lib/store';

const FLAG_LABEL: Record<string, string> = {
  no_answer: '未回答',
  no_consent: '同意なし',
  ng_word: 'NG語の疑い',
  fallback_personal: '代替タグ',
  fallback_shared: '代替タグ',
};

function isTagOk(label: string): boolean {
  const cleaned = sanitizeTag(label);
  const d = displayLength(cleaned);
  return cleaned !== '' && d >= 1 && d <= 12;
}

export default function ReviewPage(): React.JSX.Element {
  const hydrated = useHydrated();
  const participants = useStore((s) => s.participants);
  const params = useStore((s) => s.params);
  const extractions = useStore((s) => s.extractions);
  const candidates = useStore((s) => s.candidates);
  const activeTagIds = useStore((s) => s.activeTagIds);
  const assignments = useStore((s) => s.assignments);
  const summary = useStore((s) => s.summary);
  const updateAssignment = useStore((s) => s.updateAssignment);
  const addPersonalCandidates = useStore((s) => s.addPersonalCandidates);
  const renameSharedTag = useStore((s) => s.renameSharedTag);

  const [tab, setTab] = useState<'tags' | 'people'>('tags');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [jumpId, setJumpId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<{ id: string; message: string } | null>(null);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  if (participants.length === 0) {
    return (
      <div className="space-y-3 py-6">
        <h1 className="text-xl font-bold">3 確認</h1>
        <p>まだ回答を取り込んでいません。</p>
        <Link href="/admin/import" className="inline-block rounded border px-3 py-2 text-sm">
          取り込みへ
        </Link>
      </div>
    );
  }

  if (Object.keys(assignments).length === 0) {
    return (
      <div className="space-y-3 py-6">
        <h1 className="text-xl font-bold">3 確認</h1>
        <p>まだタグを生成していません。</p>
        <Link href="/admin/generate" className="inline-block rounded border px-3 py-2 text-sm">
          生成へ
        </Link>
      </div>
    );
  }

  const metrics = computeMetrics(assignments);
  const labelById = new Map(candidates.map((c) => [c.id, c.label]));
  const counts = new Map<string, number>();
  for (const id of Object.keys(assignments)) {
    for (const tid of assignments[id]?.sharedTagIds ?? []) counts.set(tid, (counts.get(tid) ?? 0) + 1);
  }
  const memberNames = new Map<string, string[]>();
  for (const p of participants) {
    for (const tid of assignments[p.id]?.sharedTagIds ?? []) {
      memberNames.set(tid, [...(memberNames.get(tid) ?? []), p.name]);
    }
  }
  const sortedTags = [...activeTagIds].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

  const filteredPeople = participants.filter((p) => {
    const a = assignments[p.id];
    if (!a) return false;
    if (needsReviewOnly && a.flags.length === 0) return false;
    if (query !== '' && !p.name.includes(query)) return false;
    return true;
  });

  const changePersonal = (participantId: string, value: string): void => {
    if (!isTagOk(value)) return;
    updateAssignment(participantId, { personalTag: sanitizeTag(value) });
  };

  const changeShared = (participantId: string, index: 0 | 1, tagId: string): void => {
    const current = assignments[participantId]?.sharedTagIds ?? [];
    const next = index === 0 ? [tagId, current[1]] : [current[0], tagId];
    const picked = next.filter((v): v is string => v !== undefined && v !== '');
    if (new Set(picked).size !== picked.length) return; // 同じタグを2つは選べない
    updateAssignment(participantId, { sharedTagIds: picked });
  };

  const changeTagLabel = (tagId: string, value: string): void => {
    if (!isTagOk(value)) return;
    renameSharedTag(tagId, sanitizeTag(value));
  };

  const regeneratePersonal = async (participantId: string): Promise<void> => {
    const p = participants.find((q) => q.id === participantId);
    const extraction = extractions[participantId];
    if (!p || regenerating) return;
    setRegenerating(participantId);
    setRegenError(null);
    try {
      const res = await fetch('/api/llm/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person: {
            id: p.id,
            affiliation: p.affiliation,
            category: p.category,
            intro: p.intro,
            hobby: p.hobby,
            topics: extraction?.topics ?? [],
          },
          avoid: extraction?.personalCandidates ?? [],
        }),
      });
      if (!res.ok) {
        let message = '別案を作れませんでした';
        try {
          const data = (await res.json()) as { message?: unknown };
          if (typeof data?.message === 'string' && data.message !== '') message = data.message;
        } catch {
          // 既定の文言のまま
        }
        setRegenError({ id: participantId, message });
        return;
      }
      const data = (await res.json()) as { personal?: string[] };
      addPersonalCandidates(participantId, (data.personal ?? []).filter(isTagOk).map(sanitizeTag));
    } catch {
      setRegenError({
        id: participantId,
        message: 'おいとまに接続できません。学内ネットワークかOU-VPNにつないでいるか確認してください',
      });
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-xl font-bold">3 確認</h1>

      <MetricsCards metrics={metrics} />
      {summary !== '' && <p className="text-sm">{summary}</p>}

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setTab('tags')}
          className={`rounded border px-3 py-2 ${tab === 'tags' ? 'bg-gray-900 font-bold text-white' : ''}`}
        >
          共有タグ
        </button>
        <button
          type="button"
          onClick={() => setTab('people')}
          className={`rounded border px-3 py-2 ${tab === 'people' ? 'bg-gray-900 font-bold text-white' : ''}`}
        >
          参加者
        </button>
      </div>

      {tab === 'tags' && (
        <ul className="space-y-3">
          {sortedTags.map((tid) => {
            const count = counts.get(tid) ?? 0;
            const badge =
              params && count < params.minSize
                ? 'bg-red-200 text-red-900'
                : params && count > params.maxSize
                  ? 'bg-yellow-200 text-yellow-900'
                  : 'bg-gray-100 text-gray-700';
            return (
              <li key={tid} className="rounded border border-gray-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <TagInput
                    value={labelById.get(tid) ?? ''}
                    ariaLabel={`共有タグ${tid}の名前`}
                    onChange={(v) => changeTagLabel(tid, v)}
                  />
                  <span className={`rounded px-2 py-1 text-xs font-bold ${badge}`}>{count}人</span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{candidates.find((c) => c.id === tid)?.covers}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(memberNames.get(tid) ?? []).map((name) => {
                    const pid = participants.find((p) => p.name === name)?.id;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          if (pid) setJumpId(pid);
                          setTab('people');
                        }}
                        className="rounded-full bg-gray-100 px-2 py-1 text-xs hover:underline"
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'people' && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setNeedsReviewOnly(false)}
              className={`rounded border px-3 py-1 ${!needsReviewOnly ? 'bg-gray-900 text-white' : ''}`}
            >
              すべて
            </button>
            <button
              type="button"
              onClick={() => setNeedsReviewOnly(true)}
              className={`rounded border px-3 py-1 ${needsReviewOnly ? 'bg-gray-900 text-white' : ''}`}
            >
              要確認のみ
            </button>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="名前検索"
              className="rounded border border-gray-300 px-2 py-1"
            />
          </div>

          <ul className="space-y-4">
            {filteredPeople.map((p) => {
              const a = assignments[p.id];
              if (!a) return null;
              const extraction = extractions[p.id];
              const sharedOptions = activeTagIds.map((tid) => ({ id: tid, label: labelById.get(tid) ?? tid }));
              return (
                <li
                  key={p.id}
                  ref={jumpId === p.id ? (el) => el?.scrollIntoView({ block: 'center' }) : undefined}
                  className="rounded border border-gray-200 p-3"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-bold">ビフォー</h3>
                      <p className="text-sm">
                        {p.name}・{p.affiliation}・{p.category}
                      </p>
                      {p.intro !== '' && <p className="mt-1 text-sm">{p.intro}</p>}
                      {p.hobby !== '' && <p className="mt-1 text-sm">{p.hobby}</p>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(extraction?.topics ?? []).map((t) => (
                          <span key={t} className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold">アフター</h3>
                      <FitToWidth designWidthPx={760}>
                        <StickerSet preset="label24" personalTag={a.personalTag} sharedTags={a.sharedTagIds.map((tid) => labelById.get(tid) ?? tid)} name={p.name} />
                      </FitToWidth>
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-20 shrink-0">個性タグ</span>
                          <select
                            value={a.personalTag}
                            onChange={(e) => changePersonal(p.id, e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1"
                            aria-label={`${p.name}の個性タグの候補`}
                          >
                            {!extraction?.personalCandidates.includes(a.personalTag) && (
                              <option value={a.personalTag}>{a.personalTag}（編集中）</option>
                            )}
                            {(extraction?.personalCandidates ?? []).map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <TagInput value={a.personalTag} ariaLabel={`${p.name}の個性タグ`} onChange={(v) => changePersonal(p.id, v)} />
                          <button
                            type="button"
                            onClick={() => void regeneratePersonal(p.id)}
                            disabled={regenerating !== null}
                            className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                          >
                            {regenerating === p.id ? '作成中…' : '別案'}
                          </button>
                        </div>
                        {regenError?.id === p.id && <p className="text-xs text-red-700">{regenError.message}</p>}
                        {([0, 1] as const).map((i) => (
                          <label key={i} className="flex items-center gap-2">
                            <span className="w-20 shrink-0">共有タグ{i + 1}</span>
                            <select
                              value={a.sharedTagIds[i] ?? ''}
                              onChange={(e) => changeShared(p.id, i, e.target.value)}
                              className="rounded border border-gray-300 px-2 py-1"
                            >
                              <option value="">（なし）</option>
                              {sharedOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                  #{o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                        {a.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {a.flags.map((f) => (
                              <span key={f} className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-900">
                                {FLAG_LABEL[f] ?? f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link href="/admin/print" className="inline-block rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white">
            印刷へ
          </Link>
        </>
      )}
    </div>
  );
}

// src/app/admin/review/page.tsx
// 確認・修正。数字カード＋参加者の表＋選んだ人の詳細（共有タグタブはU3で作り替える）。
'use client';

import { useState } from 'react';
import { GuideCard } from '@/components/GuideCard';
import { TagInput } from '@/components/TagInput';
import { toOitomaNotice } from '@/components/oitoma-error';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardToolbar } from '@/components/ui/Card';
import { CountBar } from '@/components/ui/CountBar';
import { HelpTip } from '@/components/ui/HelpTip';
import { Notice } from '@/components/ui/Notice';
import { SearchBox } from '@/components/ui/SearchBox';
import { Segmented } from '@/components/ui/Segmented';
import { StatCard } from '@/components/ui/StatCard';
import { TagChip } from '@/components/ui/TagChip';
import { showToast } from '@/components/ui/Toast';
import { IconArrowDown, IconCheck, IconSave, IconSparkle, IconWarning } from '@/components/ui/icons';
import { PageFooter } from '@/components/PageFooter';
import { PageHeader } from '@/components/PageHeader';
import { displayLength, sanitizeTag } from '@/lib/text';
import { computeMetrics } from '@/lib/metrics';
import { useHydrated, useStore } from '@/lib/store';
import type { AppState, Flag } from '@/lib/types';

const FLAG_LABEL: Record<Flag, string> = {
  no_answer: '回答なし',
  no_consent: '掲載の同意なし',
  ng_word: '気になる言葉あり',
  fallback_personal: '自動で補ったタグ',
  fallback_shared: '自動で補ったタグ',
};

const HELP = {
  personal: 'その人だけの話題です。見た人が「それ何ですか？」と聞きたくなる一言にしています。',
  shared: '会場の何人かと同じになる話題です。全員の回答を見比べて作ります。',
  mates: '自分と共有タグが1つ以上同じ人の数です。一番少ない人の値を出しています。',
  encounter: '会場からランダムに2人選んだとき、共有タグが同じである確率です。',
};

function isTagOk(label: string): boolean {
  const cleaned = sanitizeTag(label);
  const d = displayLength(cleaned);
  return cleaned !== '' && d >= 1 && d <= 12;
}

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stamp(date: Date): string {
  const pad = (v: number): string => String(v).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export default function ReviewPage(): React.JSX.Element {
  const hydrated = useHydrated();
  const participants = useStore((s) => s.participants);
  const params = useStore((s) => s.params);
  const extractions = useStore((s) => s.extractions);
  const candidates = useStore((s) => s.candidates);
  const activeTagIds = useStore((s) => s.activeTagIds);
  const assignments = useStore((s) => s.assignments);
  const updateAssignment = useStore((s) => s.updateAssignment);
  const addPersonalCandidates = useStore((s) => s.addPersonalCandidates);
  const renameSharedTag = useStore((s) => s.renameSharedTag);

  const [tab, setTab] = useState<'tags' | 'people'>('people');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jumpId, setJumpId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<{ id: string; message: string } | null>(null);

  if (!hydrated) {
    return <p>読み込み中…</p>;
  }

  if (participants.length === 0) {
    return (
      <div className="space-y-3 py-6">
        <PageHeader
          step={3}
          title="確認・修正"
          description="おいとまが作ったタグを見て、気になるものだけ直します。"
        />
        <GuideCard
          title="まだ回答を読み込んでいません"
          description="参加登録フォームの回答を先に読み込みます。"
          next={{ href: '/admin/import', label: '1 回答を読み込むへ' }}
        />
        <PageFooter next={{ href: '/admin/print', label: 'シールを印刷', disabled: true }} />
      </div>
    );
  }

  if (Object.keys(assignments).length === 0) {
    return (
      <div className="space-y-3 py-6">
        <PageHeader
          step={3}
          title="確認・修正"
          description="おいとまが作ったタグを見て、気になるものだけ直します。"
        />
        <GuideCard
          title="まだタグを作っていません"
          description="おいとまでタグを作ってから、ここで確認します。"
          next={{ href: '/admin/generate', label: '2 タグを作るへ' }}
        />
        <PageFooter next={{ href: '/admin/print', label: 'シールを印刷', disabled: true }} />
      </div>
    );
  }

  const metrics = computeMetrics(assignments);
  const minSize = params?.minSize ?? metrics.sizeMin;
  const maxSize = params?.maxSize ?? metrics.sizeMax;
  const labelById = new Map(candidates.map((c) => [c.id, c.label]));
  const counts = new Map<string, number>();
  for (const id of Object.keys(assignments)) {
    for (const tid of assignments[id]?.sharedTagIds ?? []) counts.set(tid, (counts.get(tid) ?? 0) + 1);
  }
  const memberIds = new Map<string, string[]>();
  for (const p of participants) {
    for (const tid of assignments[p.id]?.sharedTagIds ?? []) {
      memberIds.set(tid, [...(memberIds.get(tid) ?? []), p.id]);
    }
  }
  const participantById = new Map(participants.map((p) => [p.id, p]));
  const sortedTags = [...activeTagIds].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const visibleTags = sortedTags.filter((tid) => (counts.get(tid) ?? 0) > 0);

  const filteredPeople = participants.filter((p) => {
    const a = assignments[p.id];
    if (!a) return false;
    if (needsReviewOnly && a.flags.length === 0) return false;
    if (query !== '' && !p.name.includes(query)) return false;
    return true;
  });

  const selected =
    selectedId !== null ? (participants.find((p) => p.id === selectedId && assignments[p.id]) ?? null) : null;
  const firstFallback =
    (participants.find((p) => (assignments[p.id]?.flags.length ?? 0) > 0) ?? participants[0]) ?? null;
  const shown = selected ?? firstFallback;
  const shownAssignment = shown ? assignments[shown.id] : undefined;
  const regenMapped =
    regenError !== null && shown !== null && regenError.id === shown.id
      ? toOitomaNotice(regenError.message)
      : null;

  const answeredCount = participants.filter((p) => p.intro !== '' || p.hobby !== '').length;
  const noConsentCount = participants.filter((p) => !p.consent).length;

  const saveWork = (): void => {
    const s = useStore.getState();
    const snapshot: AppState = {
      version: 1,
      participants: s.participants,
      importedAt: s.importedAt,
      params: s.params,
      extractions: s.extractions,
      candidates: s.candidates,
      rankings: s.rankings,
      activeTagIds: s.activeTagIds,
      assignments: s.assignments,
      summary: s.summary,
      progress: s.progress,
      llmLog: s.llmLog,
      generatedAt: s.generatedAt,
      printOptions: s.printOptions,
    };
    download(`nametag-state-${stamp(new Date())}.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
    showToast('作業データを保存しました');
  };

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

  const startRename = (tagId: string): void => {
    setEditingTagId(tagId);
    setDraftLabel(labelById.get(tagId) ?? '');
  };

  const commitRename = (tagId: string): void => {
    if (!isTagOk(draftLabel)) return;
    changeTagLabel(tagId, draftLabel);
    setEditingTagId(null);
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
    <div className="flex flex-col gap-5">
      <PageHeader
        step={3}
        title="確認・修正"
        description="おいとまが作ったタグを見て、気になるものだけ直します。"
        actions={
          <Button variant="secondary" icon={<IconSave size={16} />} onClick={saveWork}>
            作業データを保存
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <StatCard
          label="参加者"
          value={participants.length}
          unit="人"
          note={`回答あり ${answeredCount}人・同意なし ${noConsentCount}人`}
        />
        <StatCard
          label="共有タグ"
          value={metrics.sharedTagCount}
          unit="個"
          note={`1つのタグを${minSize}〜${maxSize}人で共有`}
          help={HELP.shared}
        />
        <StatCard
          label="共通の話題がある人"
          value={metrics.matesMin}
          prefix="最少"
          unit="人"
          note={`中央値 ${metrics.matesMedian}人`}
          help={HELP.mates}
        />
        <StatCard
          label="遭遇率"
          value={Math.round(metrics.encounterRate * 100)}
          unit="%"
          note="ランダムな2人に共通タグがある確率"
          help={HELP.encounter}
        />
        <StatCard
          label="確認が必要"
          value={metrics.needsReview}
          unit="人"
          note={metrics.needsReview > 0 ? '表の黄色い行を見てください' : 'ありません'}
          tone={metrics.needsReview > 0 ? 'warn' : 'normal'}
        />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-[999_1_560px] overflow-hidden">
          <CardToolbar>
            <Segmented
              items={[
                { key: 'people', label: `参加者 ${participants.length}`, pressed: tab === 'people', onClick: () => setTab('people') },
                { key: 'tags', label: `共有タグ ${metrics.sharedTagCount}`, pressed: tab === 'tags', onClick: () => setTab('tags') },
              ]}
            />
            {tab === 'people' && (
              <Button
                variant="warn"
                size="sm"
                icon={<IconWarning size={16} />}
                aria-pressed={needsReviewOnly}
                onClick={() => setNeedsReviewOnly((v) => !v)}
                className={needsReviewOnly ? 'ring-2 ring-adm-primary' : ''}
              >
                確認が必要な人だけ表示（{metrics.needsReview}）
              </Button>
            )}
            {tab === 'people' && (
              <span className="ml-auto">
                <SearchBox value={query} onChange={setQuery} />
              </span>
            )}
            {tab === 'tags' && (
              <span className="ml-auto text-adm-xs text-adm-sub">
                バー＝人数。縦線＝下限（{minSize}人）。目安は{minSize}〜{maxSize}人
              </span>
            )}
          </CardToolbar>

          {tab === 'people' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-adm-table">
                  <thead>
                    <tr className="bg-adm-head text-left text-adm-ink2">
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">名前</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">所属</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">個性タグ</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">共有タグ</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">確認</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeople.map((p) => {
                      const a = assignments[p.id];
                      if (!a) return null;
                      const isSelected = shown?.id === p.id;
                      const needsReview = a.flags.length > 0;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          ref={
                            jumpId === p.id
                              ? (el) => {
                                  el?.scrollIntoView({ block: 'center' });
                                }
                              : undefined
                          }
                          className={`cursor-pointer hover:bg-adm-head ${
                            isSelected ? 'bg-adm-primary-soft' : needsReview ? 'bg-adm-warn-bg' : ''
                          }`}
                        >
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => setSelectedId(p.id)}
                              aria-current={isSelected ? 'true' : undefined}
                              className="text-left focus-visible:outline-2 focus-visible:outline-adm-primary"
                            >
                              <span className="block font-bold">{p.name}</span>
                              <span className="block text-adm-xs text-adm-sub">{p.category}</span>
                            </button>
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top text-adm-ink2">
                            {p.affiliation}
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            <TagChip kind="personal" label={a.personalTag} />
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {a.sharedTagIds.map((tid) => (
                                <TagChip key={tid} kind="shared" label={labelById.get(tid) ?? tid} />
                              ))}
                            </div>
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            {a.flags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {a.flags.map((f) => (
                                  <Badge key={f} tone="warn">
                                    {FLAG_LABEL[f]}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-adm-sub">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 text-adm-sm text-adm-sub">
                {filteredPeople.length}人を表示（全{participants.length}人）
              </div>
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-adm-table">
                  <thead>
                    <tr className="bg-adm-head text-left text-adm-ink2">
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">共有タグ</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">まとめた話題</th>
                      <th scope="col" className="w-[260px] whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">人数</th>
                      <th scope="col" className="whitespace-nowrap border-b border-adm-divider px-4 py-2.5 text-adm-sm font-bold">メンバー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTags.map((tid) => {
                      const count = counts.get(tid) ?? 0;
                      const members = (memberIds.get(tid) ?? [])
                        .map((pid) => participantById.get(pid))
                        .filter((p): p is NonNullable<typeof p> => p !== undefined);
                      return (
                        <tr key={tid}>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            {editingTagId === tid ? (
                              <TagInput
                                value={draftLabel}
                                ariaLabel="共有タグの名前を変更"
                                onChange={setDraftLabel}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRename(tid);
                                  else if (e.key === 'Escape') setEditingTagId(null);
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-start gap-1">
                                <TagChip kind="shared" label={labelById.get(tid) ?? tid} />
                                <button
                                  type="button"
                                  onClick={() => startRename(tid)}
                                  className="text-adm-xs text-adm-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-adm-primary"
                                >
                                  名前を変える
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top text-adm-ink2">
                            {candidates.find((c) => c.id === tid)?.covers}
                          </td>
                          <td className="w-[260px] border-b border-adm-divider px-4 py-3 align-top">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <CountBar count={count} min={minSize} max={maxSize} />
                              </div>
                              {count < minSize ? (
                                <Badge tone="danger">少なすぎ</Badge>
                              ) : count > maxSize ? (
                                <Badge tone="warn">多すぎ</Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="border-b border-adm-divider px-4 py-3 align-top">
                            <div className="flex flex-wrap items-center gap-1">
                              {members.slice(0, 6).map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setJumpId(m.id);
                                    setSelectedId(m.id);
                                    setTab('people');
                                  }}
                                  className="cursor-pointer rounded-full bg-adm-field px-2 py-0.5 text-adm-sm hover:text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
                                >
                                  {m.name}
                                </button>
                              ))}
                              {members.length > 6 && (
                                <span className="text-adm-sm text-adm-sub">ほか{members.length - 6}人</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 text-adm-sm text-adm-sub">
                {visibleTags.length}個を表示（人数の多い順）
              </div>
            </>
          )}
        </Card>

        <aside
          aria-label="選んだ人の詳細"
          className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 rounded-xl border border-adm-line bg-adm-surface p-5"
        >
          {shown && shownAssignment ? (
            <>
              <div>
                <div className="text-adm-name font-bold">{shown.name}</div>
                <div className="text-adm-sm text-adm-sub">
                  {shown.affiliation}・{shown.category}
                </div>
                {shownAssignment.flags.length > 0 && (
                  <div className="mt-2">
                    <Notice
                      tone="warn"
                      title={shownAssignment.flags.map((f) => FLAG_LABEL[f]).join('・')}
                    >
                      タグを見て、問題なければそのままで構いません。
                    </Notice>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1.5 text-adm-sm font-bold text-adm-ink2">回答（ビフォー）</div>
                <div className="rounded-lg bg-adm-head px-3.5 py-3 text-adm-table leading-[1.7]">
                  {shown.intro !== '' || shown.hobby !== ''
                    ? shown.intro
                    : '回答はありません。所属と区分からタグを作りました。'}
                </div>
                {shown.hobby !== '' && (
                  <div className="mt-2 text-adm-sm text-adm-ink2">最近ハマっていること：{shown.hobby}</div>
                )}
              </div>

              <div className="flex items-center gap-2 text-adm-sm font-bold text-adm-ink2">
                <IconArrowDown />
                おいとまが作ったシール（アフター）
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 rounded-md border border-adm-line-strong px-3 py-2.5">
                  <TagChip kind="personal" label={shownAssignment.personalTag} size="md" />
                  <span className="text-adm-xs text-adm-sub">個性タグ</span>
                </div>
                {shownAssignment.sharedTagIds.map((tid) => (
                  <div
                    key={tid}
                    className="flex items-center justify-between gap-2 rounded-md border border-adm-line-strong px-3 py-2.5"
                  >
                    <TagChip kind="shared" label={labelById.get(tid) ?? tid} size="md" />
                    <span className="text-adm-xs text-adm-sub">会場に{counts.get(tid) ?? 0}人</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-adm-divider pt-3.5">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-1 text-adm-sm font-bold text-adm-ink2">
                    個性タグを選ぶ
                    <HelpTip text={HELP.personal} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(extractions[shown.id]?.personalCandidates ?? []).map((c) => {
                      const pressed = shownAssignment.personalTag === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={pressed}
                          onClick={() => changePersonal(shown.id, c)}
                          className={
                            pressed
                              ? 'min-h-10 rounded-lg border-2 border-adm-primary bg-adm-primary-soft px-3 text-adm-table font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary'
                              : 'min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-3 text-adm-table focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-primary'
                          }
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-adm-sm text-adm-sub">自分で入力</span>
                    <TagInput
                      value={shownAssignment.personalTag}
                      ariaLabel="個性タグを自分で入力"
                      onChange={(v) => changePersonal(shown.id, v)}
                    />
                  </div>
                  <div>
                    <Button
                      variant="dashed"
                      size="sm"
                      icon={<IconSparkle size={16} />}
                      disabled={regenerating !== null}
                      onClick={() => void regeneratePersonal(shown.id)}
                    >
                      {regenerating === shown.id ? '考えています…' : 'おいとまに別案を出してもらう'}
                    </Button>
                  </div>
                  {regenMapped !== null && (
                    <Notice tone="danger" title={regenMapped.title}>
                      {regenMapped.body}
                    </Notice>
                  )}

                  <div className="flex items-center gap-1 text-adm-sm font-bold text-adm-ink2">
                    共有タグ
                    <HelpTip text={HELP.shared} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([0, 1] as const).map((i) => (
                      <label key={i} className="flex flex-[1_1_140px] flex-col gap-1">
                        <span className="text-adm-xs text-adm-sub">{i === 0 ? '1つ目' : '2つ目'}</span>
                        <select
                          value={shownAssignment.sharedTagIds[i] ?? ''}
                          onChange={(e) => changeShared(shown.id, i, e.target.value)}
                          className="min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
                        >
                          <option value="">（なし）</option>
                          {sortedTags.map((tid) => (
                            <option
                              key={tid}
                              value={tid}
                              disabled={shownAssignment.sharedTagIds[1 - i] === tid}
                            >
                              {labelById.get(tid) ?? tid}（{counts.get(tid) ?? 0}人）
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <p className="flex items-center gap-1.5 text-adm-xs text-adm-done">
                <IconCheck size={14} />
                変更は自動で保存されます
              </p>
            </>
          ) : (
            <p className="text-adm-sub">表の行を押すと、ここにその人の回答とシールが出ます。</p>
          )}
        </aside>
      </div>

      <PageFooter next={{ href: '/admin/print', label: 'シールを印刷' }} />
    </div>
  );
}

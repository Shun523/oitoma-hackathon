// src/app/admin/ui/page.tsx
// 部品を全部並べた確かめ用のページ。メニューには出さない。
'use client';

import { useState } from 'react';
import { adminFont } from '../fonts';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardTitle, CardToolbar } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CountBar } from '@/components/ui/CountBar';
import { HelpTip } from '@/components/ui/HelpTip';
import { Notice } from '@/components/ui/Notice';
import { SearchBox } from '@/components/ui/SearchBox';
import { Segmented } from '@/components/ui/Segmented';
import { StatCard } from '@/components/ui/StatCard';
import { TagChip } from '@/components/ui/TagChip';
import { ToastHost, showToast } from '@/components/ui/Toast';
import {
  IconArrowRight,
  IconCheck,
  IconHelp,
  IconPlay,
  IconPrinter,
  IconSave,
  IconSearch,
  IconSparkle,
  IconTrash,
  IconUpload,
  IconWarning,
  IconArrowDown,
  IconClose,
  IconUserPlus,
} from '@/components/ui/icons';

function Section(props: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Card className="p-5">
      <CardTitle>{props.title}</CardTitle>
      <div className="mt-3 flex flex-wrap items-center gap-2">{props.children}</div>
    </Card>
  );
}

export default function UiShowcasePage(): React.JSX.Element {
  const [tab, setTab] = useState<'a' | 'b'>('a');
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <div className={`${adminFont.className} mx-auto flex max-w-[1120px] flex-col gap-5 bg-adm-bg px-8 pb-10 pt-7 text-adm-body leading-[1.6] text-adm-ink`}>
      <h1 className="text-adm-h1 font-bold">部品の見本</h1>

      <Section title="ボタン">
        <Button variant="primary">主ボタン</Button>
        <Button variant="secondary">副ボタン</Button>
        <Button variant="warn">確認が必要</Button>
        <Button variant="danger">消す</Button>
        <Button variant="dashed">おいとまに頼む</Button>
        <Button variant="primary" size="sm">小</Button>
        <Button variant="primary" size="lg">次へ</Button>
        <Button variant="primary" disabled>押せない</Button>
        <Button variant="secondary" icon={<IconSave size={16} />}>保存</Button>
        <Button variant="secondary" aria-pressed={pressed} onClick={() => setPressed((v) => !v)} className={pressed ? 'ring-2 ring-adm-primary' : ''}>
          切り替え
        </Button>
        <a href="/admin/ui" className={buttonClass('primary', 'lg')}>
          リンクのボタン
        </a>
      </Section>

      <Section title="カード">
        <Card className="w-full p-5">
          <CardToolbar>
            <CardTitle>表の上の操作</CardTitle>
          </CardToolbar>
          <p className="p-4 text-adm-sm text-adm-sub">カードの中身</p>
        </Card>
      </Section>

      <Section title="数字カード">
        <div className="flex w-full flex-wrap gap-3">
          <StatCard label="参加者" value={40} unit="人" note="回答あり 35人・同意なし 2人" />
          <StatCard label="共有タグ" value={13} unit="個" note="1つのタグを4〜16人で共有" help="会場の何人かと同じになる話題です。全員の回答を見比べて作ります。" />
          <StatCard label="共通の話題がある人" value={6} prefix="最少" unit="人" note="中央値 15人" />
          <StatCard label="遭遇率" value={41} unit="%" note="ランダムな2人に共通タグがある確率" />
          <StatCard label="確認が必要" value={3} unit="人" note="表の黄色い行を見てください" tone="warn" />
        </div>
      </Section>

      <Section title="タグチップ">
        <TagChip kind="personal" label="夜型を科学したい" />
        <TagChip kind="shared" label="ごはん屋開拓勢" />
        <TagChip kind="personal" label="夜型を科学したい" size="md" />
        <TagChip kind="shared" label="ごはん屋開拓勢" size="md" />
      </Section>

      <Section title="バッジ">
        <Badge tone="warn">確認が必要な理由</Badge>
        <Badge tone="danger">少なすぎ</Badge>
        <Badge tone="neutral">プログラム</Badge>
        <Badge tone="oitoma">おいとま</Badge>
        <Badge tone="done">完了</Badge>
      </Section>

      <Section title="人数バー">
        <div className="flex w-full flex-col gap-3">
          <CountBar count={10} min={4} max={16} />
          <div className="flex items-center gap-2">
            <div className="flex-1"><CountBar count={3} min={4} max={16} /></div>
            <Badge tone="danger">少なすぎ</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1"><CountBar count={20} min={4} max={16} /></div>
            <Badge tone="warn">多すぎ</Badge>
          </div>
        </div>
      </Section>

      <Section title="切り替えタブ・検索欄">
        <Segmented
          items={[
            { key: 'a', label: '参加者 40', pressed: tab === 'a', onClick: () => setTab('a') },
            { key: 'b', label: '共有タグ 13', pressed: tab === 'b', onClick: () => setTab('b') },
          ]}
        />
        <SearchBox value={query} onChange={setQuery} />
        <span className="text-adm-sm text-adm-sub">入力：{query}</span>
      </Section>

      <Section title="「？」の説明">
        <span className="flex items-center gap-1 text-adm-sm">個性タグ <HelpTip text="その人だけの話題です。見た人が「それ何ですか？」と聞きたくなる一言にしています。" /></span>
        <span className="flex items-center gap-1 text-adm-sm">共有タグ <HelpTip text="会場の何人かと同じになる話題です。全員の回答を見比べて作ります。" /></span>
        <span className="flex items-center gap-1 text-adm-sm">共通の話題がある人 <HelpTip text="自分と共有タグが1つ以上同じ人の数です。一番少ない人の値を出しています。" /></span>
        <span className="flex items-center gap-1 text-adm-sm">遭遇率 <HelpTip text="会場からランダムに2人選んだとき、共有タグが同じである確率です。" /></span>
      </Section>

      <Section title="入力欄">
        <label className="flex flex-col gap-1 text-adm-xs text-adm-sub">
          名前
          <input
            type="text"
            defaultValue="岡山 太郎"
            className="min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-adm-xs text-adm-sub">
          共有タグ（1つ目）
          <select
            defaultValue="ごはん屋開拓勢"
            className="min-h-10 rounded-lg border border-adm-line-strong bg-adm-surface px-2.5 text-adm-table text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-primary"
          >
            <option>ごはん屋開拓勢</option>
            <option>体を動かしたい</option>
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 text-adm-table text-adm-ink">
          <input type="checkbox" defaultChecked className="size-4 accent-adm-primary" />
          共有タグに会場の人数を出す
        </label>
      </Section>

      <Section title="確認ダイアログ・通知">
        <Button variant="danger" onClick={() => setDialogOpen(true)}>ダイアログを開く</Button>
        <Button variant="secondary" onClick={() => showToast('作業データを保存しました')}>通知を出す</Button>
        <ConfirmDialog
          open={dialogOpen}
          title="作り直しますか？"
          body="手で直した3人分のタグも作り直しになります。"
          confirmLabel="作り直す"
          tone="danger"
          onConfirm={() => setDialogOpen(false)}
          onCancel={() => setDialogOpen(false)}
        />
      </Section>

      <Section title="お知らせ欄">
        <div className="flex w-full flex-col gap-3">
          <Notice tone="info" title="40人分を読み込み済みです">別のファイルを読み込むと、今の回答とタグは置き換わります。</Notice>
          <Notice tone="warn" title="このPCのブラウザに保存できませんでした">念のため、作業データをファイルに保存してください。</Notice>
          <Notice tone="danger" title="話題の読み取りで止まりました">おいとまに接続できません。学内ネットワークかOU-VPNにつないでいるか確かめてください。</Notice>
          <Notice tone="success" title="タグができました">40人に、7個の共有タグを割り当てました。</Notice>
        </div>
      </Section>

      <Section title="アイコン">
        <IconCheck /> <IconSave /> <IconWarning /> <IconSearch /> <IconSparkle /> <IconArrowRight />
        <IconArrowDown /> <IconUpload /> <IconPrinter /> <IconTrash /> <IconHelp /> <IconClose /> <IconPlay />
        <IconUserPlus />
      </Section>

      <ToastHost />
    </div>
  );
}

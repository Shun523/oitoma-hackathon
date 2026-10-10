// src/data/sample-participants.ts
// 40人分のダミー回答（実在の人物と無関係な架空の名前）。
// scripts/make-samples.ts がここからForms形式のxlsxを作る。

export interface SampleAnswer {
  name: string;
  affiliation: string;
  category: string; // Formsの区分欄に入っていた文言そのまま
  intro: string; // 自己紹介
  hobby: string; // 最近ハマっていること
  consent: boolean;
}

export const SAMPLE_PARTICIPANTS_40: SampleAnswer[] = [
  // 飲食店めぐり7人
  { name: '山田さくら', affiliation: '文学部', category: '学生', intro: '岡山駅前のラーメン屋を巡っています', hobby: '休日のラーメン屋巡り', consent: true },
  { name: '佐藤はると', affiliation: '工学部', category: '大学院学生', intro: 'スパイスカレーを家で作っています', hobby: '岡山のカレー屋開拓', consent: true },
  { name: '鈴木みずき', affiliation: '教育学部', category: '教授', intro: '週末はパン屋巡りをしています', hobby: 'パンを焼き始めた', consent: true },
  { name: '高橋れん', affiliation: '〇〇食品株式会社', category: '会社員', intro: 'ラーメンとカレーの店を開拓中です', hobby: '行列店の食べ歩き', consent: true },
  { name: '田中あおい', affiliation: '法学部', category: '学生', intro: 'パンとコーヒーが好きです', hobby: 'カフェでパンを食べる', consent: true },
  { name: '伊藤ゆうと', affiliation: '総務課', category: '大学職員', intro: '', hobby: '飲食店めぐり', consent: true },
  { name: '渡辺かりん', affiliation: '岡山市役所', category: '自治体関係者', intro: '地元のラーメン屋に詳しいです', hobby: '新店のラーメン屋巡り', consent: true },
  // 運動6人
  { name: '中村そうた', affiliation: '理学部', category: '学生', intro: '朝のランニングを続けています', hobby: '走った後の朝カフェ', consent: true },
  { name: '小林りお', affiliation: '工学部', category: '大学院学生', intro: '週3でジムに通っています', hobby: '筋トレ', consent: true },
  { name: '加藤かいと', affiliation: '環境生命科学研究科', category: '准教授', intro: '休みは登山に出かけます', hobby: '登山', consent: true },
  { name: '吉田ほのか', affiliation: '教育学部', category: '講師', intro: 'マラソンと登山が趣味です', hobby: '週末の山歩き', consent: true },
  { name: '山本だいき', affiliation: '文学部', category: '学生', intro: '', hobby: '朝ヨガ', consent: true },
  { name: '松本ゆな', affiliation: '附属図書館', category: '事務職員', intro: '', hobby: '', consent: true },
  // コーヒー・カフェ4人
  { name: '井上しょうた', affiliation: '経済学部', category: '学生', intro: 'カフェ巡りが好きです', hobby: 'コーヒーの飲み比べ', consent: true },
  { name: '木村あかり', affiliation: '入試課', category: '大学職員', intro: '入試課で入試広報を担当しています', hobby: 'カフェ開拓', consent: true },
  { name: '林ゆうき', affiliation: '〇〇商事株式会社', category: '会社員', intro: '', hobby: '', consent: true },
  { name: '清水めい', affiliation: '農学部', category: '学生', intro: '', hobby: '', consent: true },
  // ゲーム4人
  { name: '森ひなた', affiliation: '工学部', category: '学生', intro: '友達とゲームをします', hobby: '夜更かしゲーム', consent: true },
  { name: '池田りく', affiliation: '理学部', category: '大学院学生', intro: '', hobby: 'ゲーム実況を見る', consent: true },
  { name: '橋本ここな', affiliation: '〇〇システムズ株式会社', category: '会社員', intro: '休みはゲーム三昧です', hobby: '新作ゲームの発売待ち', consent: true },
  { name: '石川れお', affiliation: '附属図書館', category: '大学職員', intro: '家族でゲームをします', hobby: 'ボードゲーム', consent: true },
  // AIを使った作業4人
  { name: '山下さら', affiliation: '工学部', category: '学生', intro: '生成AIで課題を効率化しています', hobby: 'AIに頼りがち', consent: true },
  { name: '小川たくみ', affiliation: '医歯薬学総合研究科', category: '助教', intro: '腸内細菌叢と宿主の代謝を研究しています', hobby: 'ChatGPTの活用研究', consent: true },
  { name: '前田みお', affiliation: '〇〇電機株式会社', category: '会社員', intro: '仕事で生成AIを使っています', hobby: 'AIツールの試し使い', consent: true },
  { name: '岡田しゅん', affiliation: '文学部', category: '学生', intro: 'AIで音楽を作っています', hobby: '生成AI作曲', consent: true },
  // 旅行・キャンプ4人
  { name: '長谷川りん', affiliation: '法学部', category: '学生', intro: '', hobby: '青春18きっぷの旅', consent: true },
  { name: '藤田こうき', affiliation: '教育学部', category: '教授', intro: 'キャンプ道具を集めています', hobby: '登山もする週末キャンプ', consent: true },
  { name: '後藤ななみ', affiliation: '岡山県庁', category: '行政関係者', intro: '岡山の観光地を巡っています', hobby: '旅に出たい', consent: true },
  { name: '村上ゆいと', affiliation: '〇〇建設株式会社', category: '会社員', intro: '釣りとキャンプが好きです', hobby: '週末アウトドア', consent: true },
  // 動物と暮らす3人
  { name: '近藤あんな', affiliation: '環境生命科学研究科', category: '大学院学生', intro: '猫と暮らしています', hobby: '猫の写真を撮る', consent: true },
  { name: '坂本そら', affiliation: '農学部', category: '准教授', intro: '犬の散歩が日課です', hobby: '早朝散歩と朝活', consent: true },
  { name: '大野つむぎ', affiliation: '学生支援課', category: '事務職員', intro: '実家で犬を飼っています', hobby: '動物の動画を見る', consent: true },
  // 畑・料理3人
  { name: '田村かえで', affiliation: '教育学部', category: '学生', intro: '自炊をがんばっています', hobby: '弁当づくり', consent: true },
  { name: '金子はるき', affiliation: '岡山市役所', category: '自治体関係者', intro: '', hobby: '家庭菜園', consent: true },
  { name: '斎藤ゆずき', affiliation: '農学部', category: '教授', intro: '発酵食品の機能性成分を分析しています', hobby: 'ぬか漬けづくり', consent: true },
  // 朝型・夜型3人
  { name: '佐々木あやと', affiliation: '理学部', category: '学生', intro: '朝活をしています', hobby: '早起きして散歩', consent: true },
  { name: '山口ことね', affiliation: '〇〇銀行', category: '会社員', intro: '夜型を自認しています', hobby: '夜更かし読書', consent: true },
  { name: '松田いぶき', affiliation: '経済学部', category: '学生', intro: '朝型に変えたいです', hobby: '朝ごはんづくり', consent: true },
  // 1人だけの話題（2人とも掲載不同意。回答はxlsxにあるが取り込み時に空にする）
  { name: '井口せな', affiliation: '文学部', category: '大学院学生', intro: '休日はカメラを持って出かけます', hobby: '写真を撮りがち', consent: false },
  { name: '宮本のあ', affiliation: '教育学部', category: '教員', intro: 'ギターを練習しています', hobby: 'ライブに行く', consent: false },
];

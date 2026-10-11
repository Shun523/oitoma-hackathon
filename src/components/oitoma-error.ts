// src/components/oitoma-error.ts
// おいとま・通信のエラーを画面の文言に置き換える（docs/UI.md「エラー文の置き換え」）。
// ブラウザには理由文だけが届くため、文面で判定する。src/lib は触らない。
export function toOitomaNotice(message: string): { title: string; body: string } {
  if (
    message.includes('おいとまに接続できません') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('fetch failed')
  ) {
    return {
      title: 'おいとまに接続できません',
      body: '学内ネットワークかOU-VPNにつないでいるか確かめてください。',
    };
  }
  if (message.includes('キー') || /（401）|（403）/.test(message)) {
    return {
      title: 'おいとまのキーが使えません',
      body: 'おいとまの「APIキー発行」でキーを作り直し、.env.local に入れてください。',
    };
  }
  if (message.includes('混み合っています') || /（429）|（5\d\d）/.test(message)) {
    return {
      title: 'おいとまが混み合っています',
      body: '数分待ってから「続きから作る」を押してください。',
    };
  }
  return {
    title: 'うまくいきませんでした',
    body: 'もう一度試してください。続くときは、画面の写真を機能の担当者に送ってください。',
  };
}

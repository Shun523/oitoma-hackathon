# 実装中の小さな判断（1行ずつ）

- 段階0: vitest 5 が @types/node ^22以上を要求するため、雛形既定の ^20 から ^22 に上げた。
- 段階0: AGENTS.md の参照先は実在ファイルに合わせ docs/spec.md（小文字）とし、docs/SPEC.md（仕様書の表記）は作らなかった。
- 段階0: 雛形の .gitignore（.env*）では .env.example が無視されるため、!.env.example を足してひな形だけコミットできるようにした。

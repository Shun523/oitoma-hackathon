// ブラウザ内の生成を1つに絞り、置き換え・中止後の古い応答を採用しない。
export function createOperationManager() {
  let active: AbortController | null = null;
  return {
    begin(): AbortController | null {
      if (active) return null;
      active = new AbortController();
      return active;
    },
    isCurrent(controller: AbortController): boolean {
      return active === controller && !controller.signal.aborted;
    },
    finish(controller: AbortController): boolean {
      if (active !== controller) return false;
      active = null;
      return true;
    },
    cancel(): void {
      active?.abort();
      active = null;
    },
  };
}

export const generationOperation = createOperationManager();

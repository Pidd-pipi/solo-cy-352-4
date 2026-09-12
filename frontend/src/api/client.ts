import { API_BASE_URL } from "../constants/app";

/**
 * 只负责取回接口原始数据，不做类型断言；
 * 原始数据一律经 state/dashboard.ts 的 normalizeOverview 转换后再用于展示。
 */
export async function fetchOverview(): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/overview`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Overview request failed: ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

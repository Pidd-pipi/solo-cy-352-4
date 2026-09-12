import { fallbackOverview } from "../data/workbench";
import type { FeatureItem, KpiItem, OperationRecord, OverviewResponse } from "../types";

/**
 * 运营总览统一转换入口：接口成功与接口失败（本地降级）的数据都经
 * normalizeOverview 转换为展示模型，字段契约见 types/index.ts。
 * 每个字段独立校验：接口提供的合法值保留，缺失、类型不符或空白
 * （空字符串/纯空白）的字段回退到本地样例同位置的字段；
 * 接口完全失败时得到完整本地数据。
 */

type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  // 空白字符串（空串/纯空白）不是有效展示内容，同样回退；含有效文本的字符串原样保留
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toFeature(raw: RawObject, fallback: FeatureItem): FeatureItem {
  return {
    id: asNumber(raw.id, fallback.id),
    title: asString(raw.title, fallback.title),
    description: asString(raw.description, fallback.description),
    status: asString(raw.status, fallback.status),
    metric: asString(raw.metric, fallback.metric),
  };
}

function toKpi(raw: RawObject, fallback: KpiItem): KpiItem {
  return {
    label: asString(raw.label, fallback.label),
    value: asString(raw.value, fallback.value),
    trend: asString(raw.trend, fallback.trend),
    tone: asString(raw.tone, fallback.tone),
  };
}

function toRecord(raw: RawObject, fallback: OperationRecord): OperationRecord {
  return {
    key: asString(raw.key, fallback.key),
    name: asString(raw.name, fallback.name),
    owner: asString(raw.owner, fallback.owner),
    status: asString(raw.status, fallback.status),
    metric: asString(raw.metric, fallback.metric),
    priority: asString(raw.priority, fallback.priority),
  };
}

function toList<T>(value: unknown, convert: (raw: RawObject, fallback: T) => T, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.map((item, index) => {
    // 同位置本地样例作为该项的字段级兜底；超出样例长度时沿用最后一项，避免出现空白
    const basis = fallback[index] ?? fallback[fallback.length - 1];
    return isObject(item) ? convert(item, basis) : basis;
  });
}

export function normalizeOverview(raw: unknown): OverviewResponse {
  const source = isObject(raw) ? raw : {};
  return {
    appName: asString(source.appName, fallbackOverview.appName),
    appCode: asString(source.appCode, fallbackOverview.appCode),
    description: asString(source.description, fallbackOverview.description),
    features: toList(source.features, toFeature, fallbackOverview.features),
    kpis: toList(source.kpis, toKpi, fallbackOverview.kpis),
    records: toList(source.records, toRecord, fallbackOverview.records),
  };
}

export function createFallbackOverview(): OverviewResponse {
  return normalizeOverview(fallbackOverview);
}

import { fallbackOverview } from "../data/workbench";
import type { FeatureItem, KpiItem, OperationRecord, OverviewResponse } from "../types";

/**
 * 运营总览统一转换入口：接口成功与接口失败（本地降级）的数据都经
 * normalizeOverview 转换为展示模型，字段契约见 types/index.ts。
 * 原始数据缺失或类型不符的字段，用本地降级数据兜底。
 */

type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toFeature(raw: RawObject): FeatureItem {
  return {
    id: asNumber(raw.id, 0),
    title: asString(raw.title, ""),
    description: asString(raw.description, ""),
    status: asString(raw.status, ""),
    metric: asString(raw.metric, ""),
  };
}

function toKpi(raw: RawObject): KpiItem {
  return {
    label: asString(raw.label, ""),
    value: asString(raw.value, ""),
    trend: asString(raw.trend, ""),
    tone: asString(raw.tone, ""),
  };
}

function toRecord(raw: RawObject): OperationRecord {
  return {
    key: asString(raw.key, ""),
    name: asString(raw.name, ""),
    owner: asString(raw.owner, ""),
    status: asString(raw.status, ""),
    metric: asString(raw.metric, ""),
    priority: asString(raw.priority, ""),
  };
}

function toList<T>(value: unknown, convert: (raw: RawObject) => T, fallback: T[]): T[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter(isObject).map(convert);
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

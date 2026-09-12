/**
 * 运营总览字段契约：接口 payload 与页面展示模型共用同一份定义。
 * 字段调整只需改这里、state/dashboard.ts 的转换入口和 data/workbench.ts 的降级数据。
 */

export interface FeatureItem {
  id: number;
  title: string;
  description: string;
  status: string;
  metric: string;
}

export interface KpiItem {
  label: string;
  value: string;
  trend: string;
  tone: string;
}

export interface OperationRecord {
  key: string;
  name: string;
  owner: string;
  status: string;
  metric: string;
  priority: string;
}

export interface OverviewResponse {
  appName: string;
  appCode: string;
  description: string;
  features: FeatureItem[];
  kpis: KpiItem[];
  records: OperationRecord[];
}

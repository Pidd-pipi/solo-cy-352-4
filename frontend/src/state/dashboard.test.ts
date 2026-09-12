import { describe, expect, it } from "vitest";
import { fallbackOverview } from "../data/workbench";
import type { FeatureItem, KpiItem, OperationRecord, OverviewResponse } from "../types";
import { createFallbackOverview, normalizeOverview } from "./dashboard";

/**
 * 运营总览数据转换的契约测试（npm test 独立运行）。
 *
 * 覆盖：接口字段完整、部分字段缺失、字段类型错误、垃圾列表项、
 * 列表超出样例长度、接口整体失败。
 * 每条字段断言失败时，错误信息直接指出被破坏的字段契约路径
 * （如 features[0].title），并给出期望值与实际值。
 */

/** 字段级断言：失败信息包含契约路径、期望值与实际值。 */
function expectField<T>(actual: T, expected: T, path: string): void {
  expect(
    actual,
    `字段契约被破坏 [${path}]：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`,
  ).toEqual(expected);
}

function expectFeatureItem(actual: FeatureItem, expected: FeatureItem, path: string): void {
  expectField(actual.id, expected.id, `${path}.id`);
  expectField(actual.title, expected.title, `${path}.title`);
  expectField(actual.description, expected.description, `${path}.description`);
  expectField(actual.status, expected.status, `${path}.status`);
  expectField(actual.metric, expected.metric, `${path}.metric`);
}

function expectKpiItem(actual: KpiItem, expected: KpiItem, path: string): void {
  expectField(actual.label, expected.label, `${path}.label`);
  expectField(actual.value, expected.value, `${path}.value`);
  expectField(actual.trend, expected.trend, `${path}.trend`);
  expectField(actual.tone, expected.tone, `${path}.tone`);
}

function expectRecordItem(actual: OperationRecord, expected: OperationRecord, path: string): void {
  expectField(actual.key, expected.key, `${path}.key`);
  expectField(actual.name, expected.name, `${path}.name`);
  expectField(actual.owner, expected.owner, `${path}.owner`);
  expectField(actual.status, expected.status, `${path}.status`);
  expectField(actual.metric, expected.metric, `${path}.metric`);
  expectField(actual.priority, expected.priority, `${path}.priority`);
}

/** 逐字段校验整个总览：列表长度即页面展示条目数，先断言条目不丢失，再逐项逐字段断言。 */
function expectOverview(actual: OverviewResponse, expected: OverviewResponse): void {
  expectField(actual.appName, expected.appName, "appName");
  expectField(actual.appCode, expected.appCode, "appCode");
  expectField(actual.description, expected.description, "description");

  expectField(actual.features.length, expected.features.length, "features 页面展示条目数");
  actual.features.forEach((item, index) => expectFeatureItem(item, expected.features[index], `features[${index}]`));

  expectField(actual.kpis.length, expected.kpis.length, "kpis 页面展示条目数");
  actual.kpis.forEach((item, index) => expectKpiItem(item, expected.kpis[index], `kpis[${index}]`));

  expectField(actual.records.length, expected.records.length, "records 页面展示条目数");
  actual.records.forEach((item, index) => expectRecordItem(item, expected.records[index], `records[${index}]`));
}

describe("运营总览数据转换", () => {
  describe("接口字段完整", () => {
    it("接口提供的合法值全部保留，页面展示条目数与接口一致", () => {
      const apiPayload: OverviewResponse = {
        appName: "接口名称",
        appCode: "api-code",
        description: "接口提供的简介",
        features: [
          { id: 101, title: "接口功能一", description: "接口简介一", status: "接口状态一", metric: "接口指标一" },
          { id: 102, title: "接口功能二", description: "接口简介二", status: "接口状态二", metric: "接口指标二" },
        ],
        kpis: [
          { label: "接口指标一", value: "999", trend: "+99%", tone: "warm" },
          { label: "接口指标二", value: "111", trend: "-1%", tone: "cool" },
        ],
        records: [
          { key: "api-1", name: "接口任务一", owner: "接口负责人", status: "接口状态", metric: "接口指标", priority: "接口优先级" },
          { key: "api-2", name: "接口任务二", owner: "接口负责人二", status: "接口状态二", metric: "接口指标二", priority: "接口优先级二" },
        ],
      };

      // 每个字段都是接口值（不被本地样例覆盖），条目数跟随接口（2/2/2，不被补齐也不截断）
      expectOverview(normalizeOverview(apiPayload), apiPayload);
    });

    it("本地降级数据经同一转换原样往返（降级内容不被转换破坏）", () => {
      expectOverview(createFallbackOverview(), fallbackOverview);
    });
  });

  describe("部分字段缺失", () => {
    it("合法值保留，缺失字段独立回退到本地样例同位置字段", () => {
      const result = normalizeOverview({
        appName: "接口新名称",
        // appCode、description 缺失
        features: [
          { id: 1, title: "接口标题" }, // 缺 description/status/metric
          { description: "接口简介", metric: "99%" }, // 缺 id/title/status
        ],
        kpis: [{ label: "接口指标", value: "777" }], // 缺 trend/tone
        records: [{ key: "k1", name: "接口任务", owner: "新负责人" }], // 缺 status/metric/priority
      });

      expectOverview(result, {
        appName: "接口新名称",
        appCode: fallbackOverview.appCode,
        description: fallbackOverview.description,
        features: [
          {
            id: 1,
            title: "接口标题",
            description: fallbackOverview.features[0].description,
            status: fallbackOverview.features[0].status,
            metric: fallbackOverview.features[0].metric,
          },
          {
            id: fallbackOverview.features[1].id,
            title: fallbackOverview.features[1].title,
            description: "接口简介",
            status: fallbackOverview.features[1].status,
            metric: "99%",
          },
        ],
        kpis: [
          {
            label: "接口指标",
            value: "777",
            trend: fallbackOverview.kpis[0].trend,
            tone: fallbackOverview.kpis[0].tone,
          },
        ],
        records: [
          {
            key: "k1",
            name: "接口任务",
            owner: "新负责人",
            status: fallbackOverview.records[0].status,
            metric: fallbackOverview.records[0].metric,
            priority: fallbackOverview.records[0].priority,
          },
        ],
      });
    });
  });

  describe("字段类型错误", () => {
    it("类型不符的字段独立回退，同项其他合法字段保留", () => {
      const result = normalizeOverview({
        appName: 123,
        appCode: null,
        description: ["数组"],
        features: [{ id: "1", title: 999, description: "合法简介", status: null, metric: {} }],
        kpis: [{ label: {}, value: 0, trend: true, tone: "warm" }],
        records: [{ key: 1, name: "合法任务名", owner: undefined, status: [], metric: 5, priority: "高" }],
      });

      expectOverview(result, {
        appName: fallbackOverview.appName,
        appCode: fallbackOverview.appCode,
        description: fallbackOverview.description,
        features: [
          {
            id: fallbackOverview.features[0].id,
            title: fallbackOverview.features[0].title,
            description: "合法简介",
            status: fallbackOverview.features[0].status,
            metric: fallbackOverview.features[0].metric,
          },
        ],
        kpis: [
          {
            label: fallbackOverview.kpis[0].label,
            value: fallbackOverview.kpis[0].value,
            trend: fallbackOverview.kpis[0].trend,
            tone: "warm",
          },
        ],
        records: [
          {
            key: fallbackOverview.records[0].key,
            name: "合法任务名",
            owner: fallbackOverview.records[0].owner,
            status: fallbackOverview.records[0].status,
            metric: fallbackOverview.records[0].metric,
            priority: "高",
          },
        ],
      });
    });

    it("整个区块类型错误时，该区块整体回退本地样例，其余区块不受影响", () => {
      const result = normalizeOverview({
        features: "不是数组",
        kpis: null,
        records: 7,
      });

      expectOverview(result, fallbackOverview);
    });
  });

  describe("垃圾列表项", () => {
    it("非对象项整项替换为同位置本地样例，页面展示条目不丢失", () => {
      const validFeature: FeatureItem = {
        id: 3,
        title: "合法功能",
        description: "合法简介",
        status: "合法状态",
        metric: "合法指标",
      };
      const result = normalizeOverview({
        features: ["垃圾", null, validFeature],
        kpis: [42],
        records: [[]],
      });

      expectOverview(result, {
        appName: fallbackOverview.appName,
        appCode: fallbackOverview.appCode,
        description: fallbackOverview.description,
        // 条目数保持接口给出的 3/1/1，垃圾位被同位置样例填上，不出现空白也不丢行
        features: [fallbackOverview.features[0], fallbackOverview.features[1], validFeature],
        kpis: [fallbackOverview.kpis[0]],
        records: [fallbackOverview.records[0]],
      });
    });
  });

  describe("列表超出样例长度", () => {
    it("样例长度内的项正常转换，超出项沿用最后一个样例字段兜底", () => {
      const extraFeature = { title: "接口第六条" };
      const result = normalizeOverview({
        features: [...fallbackOverview.features, extraFeature],
      });

      expectOverview(result, {
        appName: fallbackOverview.appName,
        appCode: fallbackOverview.appCode,
        description: fallbackOverview.description,
        // 条目数跟随接口（5+1），超出样例的第 6 项除接口字段外沿用最后一个样例
        features: [
          ...fallbackOverview.features,
          {
            id: fallbackOverview.features[4].id,
            title: "接口第六条",
            description: fallbackOverview.features[4].description,
            status: fallbackOverview.features[4].status,
            metric: fallbackOverview.features[4].metric,
          },
        ],
        kpis: fallbackOverview.kpis,
        records: fallbackOverview.records,
      });
    });
  });

  describe("接口整体失败", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["数字", 42],
      ["字符串", "oops"],
      ["空对象", {}],
      ["空数组", []],
      ["布尔", true],
    ])("输入为 %s 时，页面展示完整本地降级数据", (_label, garbage) => {
      expectOverview(normalizeOverview(garbage), fallbackOverview);
    });
  });
});

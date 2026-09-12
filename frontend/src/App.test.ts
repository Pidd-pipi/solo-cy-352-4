// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
// 深导入仅页面用到的组件，避免全量引入 Element Plus 的模块图
import ElButton from "element-plus/es/components/button/index";
import { ElTable } from "element-plus/es/components/table/index";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import { REQUEST_MESSAGES } from "./constants/messages";
import { fallbackOverview } from "./data/workbench";
import { createFallbackOverview, normalizeOverview } from "./state/dashboard";
import type { OverviewResponse } from "./types";

/**
 * 运营总览页组件级渲染测试（npm test 独立运行，fetch 全部 mock，无需后端）。
 *
 * 挂载真实 App.vue 与真实 Element Plus，覆盖：接口字段完整、接口失败、
 * 部分字段空白、错误类型、垃圾列表项。
 * 每个场景断言：指标卡片/功能项/任务行的数量与 normalizeOverview 转换结果一致，
 * 各页面区域可见文本不为空，且内容等于转换结果。
 * 断言失败时错误信息指出具体页面区域（如 "指标卡片 #2 数值"）。
 */

// Element Plus 在 jsdom 中需要的浏览器 API 桩（整个文件只需设置一次）
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
}));

const SUCCESS_NOTICE = "后端服务已联通，当前展示实时接口数据。";

function mockFetchSuccess(payload: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload })),
  );
}

function mockFetchFailure(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("network down");
    }),
  );
}

const mountedWrappers: VueWrapper[] = [];

async function mountPage(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const wrapper = mount(App, { attachTo: host, global: { plugins: [ElButton, ElTable] } });
  mountedWrappers.push(wrapper);
  // 等 onMounted 中的 fetch 与后续渲染全部完成
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
  return host;
}

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
});

/** 区域存在且可见文本非空。 */
function expectRegionText(el: Element | null, region: string): void {
  expect(el, `页面区域 [${region}] 未渲染`).not.toBeNull();
  expect(el?.textContent?.trim() ?? "", `页面区域 [${region}] 出现空内容`).not.toBe("");
}

/** 区域文本与转换结果一致。 */
function expectRegionValue(el: Element | null, expected: string, region: string): void {
  expectRegionText(el, region);
  expect(el?.textContent, `页面区域 [${region}] 与转换结果不一致`).toBe(expected);
}

/** 逐区域校验整页：数量与转换结果一致，可见文本无空条目。 */
function expectPage(root: HTMLElement, expected: OverviewResponse, notice: string): void {
  // 概览区
  expectRegionValue(root.querySelector(".hero-panel h2"), expected.appName, "概览区 标题");
  expectRegionValue(root.querySelector(".hero-panel p"), expected.description, "概览区 简介");
  expectRegionValue(root.querySelector(".hero-panel .pill"), notice, "提示条");

  // 指标卡片区
  const cards = [...root.querySelectorAll<HTMLElement>(".metric-card")];
  expect(cards.length, `页面区域 [指标卡片] 数量应与转换结果一致（${expected.kpis.length}）`).toBe(
    expected.kpis.length,
  );
  cards.forEach((card, index) => {
    const region = `指标卡片 #${index + 1}`;
    expectRegionValue(card.querySelector("span"), expected.kpis[index].label, `${region} 标签`);
    expectRegionValue(card.querySelector(".metric-value"), expected.kpis[index].value, `${region} 数值`);
    expectRegionValue(card.querySelector("small"), expected.kpis[index].trend, `${region} 趋势`);
  });

  // 功能项区
  const panels = [...root.querySelectorAll<HTMLElement>(".feature-panel")];
  expect(panels.length, `页面区域 [功能项] 数量应与转换结果一致（${expected.features.length}）`).toBe(
    expected.features.length,
  );
  panels.forEach((panel, index) => {
    const region = `功能项 #${index + 1}`;
    expectRegionValue(panel.querySelector(".pill"), expected.features[index].metric, `${region} 指标`);
    expectRegionValue(panel.querySelector("strong"), expected.features[index].title, `${region} 标题`);
    expectRegionValue(panel.querySelector("p"), expected.features[index].description, `${region} 简介`);
  });

  // 任务行区
  const rows = [...root.querySelectorAll<HTMLElement>(".el-table__row")];
  expect(rows.length, `页面区域 [任务行] 数量应与转换结果一致（${expected.records.length}）`).toBe(
    expected.records.length,
  );
  const columns = ["模块", "负责人", "状态", "指标"] as const;
  rows.forEach((row, index) => {
    const cells = [...row.querySelectorAll<HTMLElement>(".el-table__cell")];
    const record = expected.records[index];
    const values = [record.name, record.owner, record.status, record.metric];
    cells.forEach((cell, columnIndex) => {
      expectRegionValue(cell, values[columnIndex], `任务行 #${index + 1} ${columns[columnIndex]}`);
    });
  });
}

describe("运营总览页渲染", () => {
  it("接口字段完整：各区域数量与接口一致，展示实时数据提示", async () => {
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
      ],
    };
    mockFetchSuccess(apiPayload);

    const host = await mountPage();

    expectPage(host, normalizeOverview(apiPayload), SUCCESS_NOTICE);
  });

  it("接口失败：展示完整本地降级数据与降级提示", async () => {
    mockFetchFailure();

    const host = await mountPage();

    expectPage(host, createFallbackOverview(), REQUEST_MESSAGES.overviewFallback);
  });

  it("部分字段空白：空白字段回退本地样例，有效文本保留，无空条目", async () => {
    const blankPayload = {
      appName: "",
      appCode: "lpboardgame",
      description: "   ",
      features: [
        { id: 1, title: "", description: "接口有效简介一", status: "  ", metric: "" },
        { id: 2, title: "   ", description: "", status: "排期中", metric: "31 单" },
      ],
      kpis: [
        { label: "", value: "118", trend: "", tone: "primary" },
        { label: "  ", value: "", trend: "  ", tone: "" },
      ],
      records: [
        { key: "", name: "", owner: "  ", status: "", metric: "", priority: "" },
        { key: "k2", name: "接口任务名", owner: "", status: "巡检中", metric: "", priority: "高" },
      ],
    };
    mockFetchSuccess(blankPayload);

    const host = await mountPage();

    expectPage(host, normalizeOverview(blankPayload), SUCCESS_NOTICE);
  });

  it("错误类型：类型不符字段回退本地样例，合法字段保留，无空条目", async () => {
    const wrongTypePayload = {
      appName: 123,
      appCode: null,
      description: ["数组"],
      features: [{ id: "1", title: 999, description: "合法简介", status: null, metric: {} }],
      kpis: [{ label: {}, value: 0, trend: true, tone: "warm" }],
      records: [{ key: 1, name: "合法任务名", owner: undefined, status: [], metric: 5, priority: "高" }],
    };
    mockFetchSuccess(wrongTypePayload);

    const host = await mountPage();

    expectPage(host, normalizeOverview(wrongTypePayload), SUCCESS_NOTICE);
  });

  it("垃圾列表项：整项替换为本地样例，页面展示条目不丢失", async () => {
    const garbagePayload = {
      features: [
        "垃圾",
        null,
        { id: 3, title: "合法功能", description: "合法简介", status: "合法状态", metric: "合法指标" },
      ],
      kpis: [42],
      records: [[]],
    };
    mockFetchSuccess(garbagePayload);

    const host = await mountPage();

    expectPage(host, normalizeOverview(garbagePayload), SUCCESS_NOTICE);
    // 垃圾位被同位置样例填上：条目数保持接口给出的 3/1/1
    const expected = normalizeOverview(garbagePayload);
    expect(expected.features).toEqual([
      fallbackOverview.features[0],
      fallbackOverview.features[1],
      { id: 3, title: "合法功能", description: "合法简介", status: "合法状态", metric: "合法指标" },
    ]);
  });
});

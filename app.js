const STAGES = [
  {
    id: "round32",
    name: "1/16决赛",
    subtitle: "Round of 32",
    status: "published",
    file: "./data/round-of-32.json",
    poster: "./assets/round-of-32-predictions.png",
    placeholderCount: 16,
  },
  {
    id: "round16",
    name: "1/8决赛",
    subtitle: "Round of 16",
    status: "locked",
    placeholderCount: 8,
  },
  {
    id: "quarterfinal",
    name: "1/4决赛",
    subtitle: "Quarterfinals",
    status: "locked",
    placeholderCount: 4,
  },
  {
    id: "semifinal",
    name: "半决赛",
    subtitle: "Semifinals",
    status: "locked",
    placeholderCount: 2,
  },
  {
    id: "thirdPlace",
    name: "三四名决赛",
    subtitle: "Third-place Match",
    status: "locked",
    placeholderCount: 1,
  },
  {
    id: "final",
    name: "决赛",
    subtitle: "Final",
    status: "locked",
    placeholderCount: 1,
  },
];

const state = {
  activeStageId: "round32",
  confidence: "全部",
  search: "",
  dataByStage: new Map(),
};

const els = {
  stageTabs: document.querySelector("#stageTabs"),
  stageSummary: document.querySelector("#stageSummary"),
  matchBoard: document.querySelector("#matchBoard"),
  teamSearch: document.querySelector("#teamSearch"),
  globalStatus: document.querySelector("#globalStatus"),
  publishedCount: document.querySelector("#publishedCount"),
  segments: Array.from(document.querySelectorAll(".segment")),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentStage() {
  return STAGES.find((stage) => stage.id === state.activeStageId) ?? STAGES[0];
}

function confidenceClass(confidence) {
  if (confidence === "高") return "high";
  if (confidence === "低") return "low";
  return "mid";
}

function toDateText(value) {
  return escapeHtml(value || "待定");
}

function renderTabs() {
  const published = STAGES.filter((stage) => stage.status === "published").length;
  els.publishedCount.textContent = `${published}/${STAGES.length}`;
  els.globalStatus.textContent = `${STAGES.find((stage) => stage.status === "published")?.name ?? "暂无阶段"}已发布`;

  els.stageTabs.innerHTML = STAGES.map((stage) => {
    const isActive = stage.id === state.activeStageId;
    const isLocked = stage.status !== "published";
    const badge = isLocked ? "待公布" : "已发布";
    const count = isLocked ? `${stage.placeholderCount} 场占位` : "15 场预测";
    return `
      <button class="stage-tab ${isActive ? "is-active" : ""} ${isLocked ? "is-locked" : ""}" type="button" data-stage="${stage.id}">
        <span>
          <span class="stage-name">${escapeHtml(stage.name)}</span>
          <span class="stage-meta">${escapeHtml(stage.subtitle)} · ${escapeHtml(count)}</span>
        </span>
        <span class="badge ${isLocked ? "is-locked" : "is-live"}">${badge}</span>
      </button>
    `;
  }).join("");

  els.stageTabs.querySelectorAll(".stage-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeStageId = button.dataset.stage;
      state.search = "";
      state.confidence = "全部";
      els.teamSearch.value = "";
      els.segments.forEach((segment) => segment.classList.toggle("is-active", segment.dataset.filter === "全部"));
      render();
    });
  });
}

async function loadStage(stage) {
  if (stage.status !== "published" || !stage.file) return null;
  if (state.dataByStage.has(stage.id)) return state.dataByStage.get(stage.id);
  const response = await fetch(stage.file);
  if (!response.ok) throw new Error(`Cannot load ${stage.file}`);
  const data = await response.json();
  state.dataByStage.set(stage.id, data);
  return data;
}

function buildSummary(stage, data) {
  if (stage.status !== "published") {
    return `
      <section class="placeholder-hero">
        <div>
          <p class="summary-kicker">${escapeHtml(stage.subtitle)}</p>
          <h2 class="placeholder-title">${escapeHtml(stage.name)}预测待公布</h2>
        </div>
        <p class="placeholder-copy">该阶段会在对阵确定后发布。当前先保留灰色占位，后续部署新内容时会替换为完整比赛卡片、胜负方向、晋级倾向、参考比分和关键理由。</p>
      </section>
    `;
  }

  const predictions = data.predictions ?? [];
  const high = predictions.filter((item) => item.confidence === "高").length;
  const low = predictions.filter((item) => item.confidence === "低").length;
  const drawLike = predictions.filter((item) => item.directionPick.includes("平")).length;
  const sourceDate = data.createdAt?.replace("T", " ").replace("+08:00", " Asia/Shanghai") ?? "待定";

  return `
    <section class="summary-block">
      <p class="summary-kicker">${escapeHtml(stage.subtitle)} · 已发布</p>
      <h2 class="summary-title">${escapeHtml(stage.name)}预测结果</h2>
      <p class="summary-copy">当前公布剩余 ${predictions.length} 场 1/16 决赛预测。胜负方向是核心判断，参考比分只用于辅助理解比赛走势；淘汰赛晋级倾向单独列出。</p>
      <div class="metric-row">
        <div class="metric"><strong>${predictions.length}</strong><span>已发布场次</span></div>
        <div class="metric"><strong>${high}</strong><span>高信心方向</span></div>
        <div class="metric"><strong>${low}</strong><span>低信心方向</span></div>
        <div class="metric"><strong>${drawLike}</strong><span>90分钟平局倾向</span></div>
      </div>
      <p class="summary-copy">更新时间：${escapeHtml(sourceDate)}</p>
    </section>
    <section class="poster-block">
      <h2 class="poster-title">预测长图</h2>
      <a class="poster-frame" href="${escapeHtml(stage.poster)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(stage.poster)}" alt="1/16决赛预测长图预览" />
      </a>
      <a class="poster-link" href="${escapeHtml(stage.poster)}" target="_blank" rel="noreferrer">打开完整图片</a>
    </section>
  `;
}

function matchText(item) {
  const players = (item.playersToWatch ?? [])
    .map((player) => `${player.team} ${player.player} ${player.reason}`)
    .join(" ");
  return [
    item.teamA?.name,
    item.teamB?.name,
    item.venue,
    item.directionPick,
    item.advancePick,
    item.predictedScore,
    item.analysis,
    players,
    ...(item.keyFactors ?? []),
  ].join(" ").toLowerCase();
}

function filterPredictions(predictions) {
  const query = state.search.trim().toLowerCase();
  return predictions.filter((item) => {
    const confidenceOk = state.confidence === "全部" || item.confidence === state.confidence;
    const queryOk = !query || matchText(item).includes(query);
    return confidenceOk && queryOk;
  });
}

function renderPublishedMatches(data) {
  const predictions = filterPredictions(data.predictions ?? []);
  if (!predictions.length) {
    return `<div class="empty-state">没有匹配的预测结果</div>`;
  }

  return predictions.map((item) => {
    const teamA = item.teamA ?? {};
    const teamB = item.teamB ?? {};
    const directionIsDraw = item.directionPick.includes("平");
    const advanceIsDraw = item.advancePick.includes("90分钟");
    const factors = (item.keyFactors ?? []).map((factor) => `<span class="factor">${escapeHtml(factor)}</span>`).join("");
    const players = (item.playersToWatch ?? []).map((player) => `
      <span><strong>${escapeHtml(player.player)}</strong> ${escapeHtml(player.reason)}</span>
    `).join("");

    return `
      <article class="match-card" data-confidence="${escapeHtml(item.confidence)}">
        <div class="match-top">
          <span>${toDateText(item.timeAsiaShanghai)}</span>
          <span>${escapeHtml(item.venue)}</span>
        </div>
        <div class="match-teams">
          <div class="team-row">
            <strong>${escapeHtml(teamA.name)}</strong>
            <span class="prob">${escapeHtml(teamA.winProb)}%</span>
          </div>
          <div class="team-row">
            <strong>${escapeHtml(teamB.name)}</strong>
            <span class="prob">${escapeHtml(teamB.winProb)}%</span>
          </div>
        </div>
        <div class="decision-panel">
          <div class="primary-decision ${directionIsDraw ? "draw" : ""}">
            <span>胜负重点</span>
            <strong>${escapeHtml(item.directionPick)}</strong>
          </div>
          <div class="decision-side">
            <div class="secondary-decision ${advanceIsDraw ? "draw" : ""}">
              <span>晋级倾向</span><strong>${escapeHtml(item.advancePick)}</strong>
            </div>
            <div class="score-reference">
              <span>参考比分</span><strong>${escapeHtml(item.predictedScore)}</strong>
              <em>${escapeHtml(item.scoreScope || "90分钟")}</em>
            </div>
          </div>
        </div>
        <div class="prob-bars">
          ${probBar(teamA.name, teamA.winProb, "team-a")}
          ${probBar("平", item.draw, "draw")}
          ${probBar(teamB.name, teamB.winProb, "team-b")}
        </div>
        <div class="factor-list">${factors}</div>
        <p class="analysis">${escapeHtml(item.analysis)}</p>
        <div class="watch-list">${players}</div>
      </article>
    `;
  }).join("");
}

function probBar(label, value, extraClass) {
  const safeValue = Number(value) || 0;
  return `
    <div class="bar ${extraClass}">
      <span>${escapeHtml(label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${safeValue}%"></div></div>
      <strong>${safeValue}%</strong>
    </div>
  `;
}

function renderPlaceholderMatches(stage) {
  const slots = Array.from({ length: stage.placeholderCount }, (_, index) => index + 1);
  return `
    <section class="placeholder-hero">
      <div>
        <p class="summary-kicker">${escapeHtml(stage.subtitle)}</p>
        <h2 class="placeholder-title">${escapeHtml(stage.name)}占位</h2>
      </div>
      <p class="placeholder-copy">该阶段目前仅展示占位槽。发布新阶段时，补充对应预测数据后这些灰色占位会变成正式比赛卡片。</p>
      <div class="slot-grid">
        ${slots.map((slot) => `
          <div class="slot">
            <div class="slot-head"><span>Match ${slot}</span><span>待公布</span></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function render() {
  renderTabs();
  const stage = currentStage();

  if (stage.status !== "published") {
    els.stageSummary.innerHTML = buildSummary(stage, null);
    els.matchBoard.innerHTML = renderPlaceholderMatches(stage);
    return;
  }

  els.stageSummary.innerHTML = `
    <section class="summary-block">
      <p class="summary-kicker">${escapeHtml(stage.subtitle)}</p>
      <h2 class="summary-title">加载中</h2>
    </section>
  `;
  els.matchBoard.innerHTML = "";

  try {
    const data = await loadStage(stage);
    els.stageSummary.innerHTML = buildSummary(stage, data);
    els.matchBoard.innerHTML = renderPublishedMatches(data);
  } catch (error) {
    els.stageSummary.innerHTML = "";
    els.matchBoard.innerHTML = `<div class="empty-state">预测数据加载失败</div>`;
    console.error(error);
  }
}

els.teamSearch.addEventListener("input", (event) => {
  state.search = event.target.value;
  render();
});

els.segments.forEach((segment) => {
  segment.addEventListener("click", () => {
    state.confidence = segment.dataset.filter;
    els.segments.forEach((item) => item.classList.toggle("is-active", item === segment));
    render();
  });
});

render();

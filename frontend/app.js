const API_BASE_URL = (
  window.APP_CONFIG?.API_BASE_URL
  || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const state = {
  records: [],
  summary: null,
  conversations: [],
  currentConversationId: null,
};

const statusLabels = {
  NORMAL: "정상",
  PARTIAL_LOAD: "부분 부하",
  ABNORMAL: "비정상",
  MAINTENANCE: "정비",
};

const statusClasses = {
  NORMAL: "status-normal",
  PARTIAL_LOAD: "status-warning",
  ABNORMAL: "status-abnormal",
  MAINTENANCE: "status-maintenance",
};

let toastTimer;
let resizeTimer;

const elements = {};

function getElements() {
  elements.apiStatus = document.querySelector("#api-status");
  elements.themeToggle = document.querySelector("#theme-toggle");

  elements.heroPeriod = document.querySelector("#hero-period");
  elements.summaryPeriod = document.querySelector("#summary-period");
  elements.summaryCount = document.querySelector("#summary-count");
  elements.summarySteam = document.querySelector("#summary-steam");
  elements.summaryPurity = document.querySelector("#summary-purity");
  elements.summaryTrend = document.querySelector("#summary-trend");
  elements.summaryChange = document.querySelector("#summary-change");
  elements.anomalyCount = document.querySelector("#anomaly-count");
  elements.offspecCount = document.querySelector("#offspec-count");
  elements.maintenanceEffect = document.querySelector(
    "#maintenance-effect"
  );
  elements.maximumIntensity = document.querySelector(
    "#maximum-intensity"
  );
  elements.refreshSummaryButton = document.querySelector(
    "#refresh-summary-button"
  );
  elements.exportButton = document.querySelector("#export-button");
  elements.trendChart = document.querySelector("#trend-chart");

  elements.dataForm = document.querySelector("#data-form");
  elements.dataFormTitle = document.querySelector("#data-form-title");
  elements.dataId = document.querySelector("#data-id");
  elements.date = document.querySelector("#date");
  elements.operatingStatus = document.querySelector(
    "#operating-status"
  );
  elements.feedFlow = document.querySelector("#feed-flow");
  elements.steamFlow = document.querySelector("#steam-flow");
  elements.distillateFlow = document.querySelector(
    "#distillate-flow"
  );
  elements.steamIntensity = document.querySelector(
    "#steam-intensity"
  );
  elements.refluxRatio = document.querySelector("#reflux-ratio");
  elements.productPurity = document.querySelector(
    "#product-purity"
  );
  elements.topTemperature = document.querySelector(
    "#top-temperature"
  );
  elements.bottomTemperature = document.querySelector(
    "#bottom-temperature"
  );
  elements.memo = document.querySelector("#memo");
  elements.cancelEditButton = document.querySelector(
    "#cancel-edit-button"
  );
  elements.saveDataButton = document.querySelector(
    "#save-data-button"
  );
  elements.dataCountLabel = document.querySelector(
    "#data-count-label"
  );
  elements.dataTableBody = document.querySelector(
    "#data-table-body"
  );

  elements.conversationList = document.querySelector(
    "#conversation-list"
  );
  elements.refreshConversationsButton = document.querySelector(
    "#refresh-conversations-button"
  );
  elements.newConversationButton = document.querySelector(
    "#new-conversation-button"
  );
  elements.currentConversationLabel = document.querySelector(
    "#current-conversation-label"
  );

  elements.chatMessages = document.querySelector("#chat-messages");
  elements.chatLoading = document.querySelector("#chat-loading");
  elements.chatForm = document.querySelector("#chat-form");
  elements.chatInput = document.querySelector("#chat-input");
  elements.sendChatButton = document.querySelector(
    "#send-chat-button"
  );

  elements.toast = document.querySelector("#toast");
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    }
  );

  const contentType = response.headers.get("content-type") || "";
  let responseData = null;

  if (contentType.includes("application/json")) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    let message = `요청에 실패했습니다. (${response.status})`;

    if (typeof responseData?.detail === "string") {
      message = responseData.detail;
    } else if (Array.isArray(responseData?.detail)) {
      message = responseData.detail
        .map((error) => error.msg)
        .join(", ");
    } else if (
      typeof responseData === "string"
      && responseData.trim()
    ) {
      message = responseData;
    }

    throw new Error(message);
  }

  return responseData;
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => {
      const characters = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };

      return characters[character];
    }
  );
}

function formatNumber(value, digits = 3) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toLocaleString(
    "ko-KR",
    {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }
  );
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "ko-KR",
    {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function showToast(message, type = "success") {
  window.clearTimeout(toastTimer);

  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;

  toastTimer = window.setTimeout(
    () => {
      elements.toast.classList.add("hidden");
    },
    3200
  );
}

async function checkApiConnection() {
  elements.apiStatus.textContent = "API 연결 중";
  elements.apiStatus.className = "status-badge";

  const slowTimer = window.setTimeout(
    () => {
      elements.apiStatus.textContent = "서버 준비 중";
    },
    3000
  );

  try {
    await apiRequest("/health");

    window.clearTimeout(slowTimer);
    elements.apiStatus.textContent = "API 연결됨";
    elements.apiStatus.className = "status-badge connected";
  } catch (error) {
    window.clearTimeout(slowTimer);
    elements.apiStatus.textContent = "API 연결 실패";
    elements.apiStatus.className = "status-badge disconnected";

    showToast(
      `백엔드 연결 실패: ${error.message}`,
      "error"
    );
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem("distillmate-theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }

  updateThemeButton();
}

function updateThemeButton() {
  const darkMode = document.body.classList.contains("dark-mode");

  elements.themeToggle.textContent = darkMode ? "☀️" : "🌙";
  elements.themeToggle.title = darkMode
    ? "라이트 모드 전환"
    : "다크 모드 전환";
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");

  const darkMode = document.body.classList.contains("dark-mode");

  localStorage.setItem(
    "distillmate-theme",
    darkMode ? "dark" : "light"
  );

  updateThemeButton();
  drawTrendChart();
}

async function loadSummary() {
  const summary = await apiRequest("/api/data/summary");
  state.summary = summary;

  elements.heroPeriod.textContent = summary.period;
  elements.summaryPeriod.textContent = summary.period;
  elements.summaryCount.textContent = summary.count.toLocaleString(
    "ko-KR"
  );
  elements.summarySteam.textContent = formatNumber(
    summary.metrics.average_steam_intensity,
    3
  );
  elements.summaryPurity.textContent = formatNumber(
    summary.metrics.average_product_purity,
    2
  );
  elements.summaryTrend.textContent = summary.trend.status;

  const trendChange = Number(summary.trend.change_percent);
  const trendPrefix = trendChange > 0 ? "+" : "";

  elements.summaryChange.textContent =
    `이전 7일 대비 ${trendPrefix}${formatNumber(
      trendChange,
      2
    )}%`;

  elements.summaryTrend.classList.remove(
    "positive-text",
    "negative-text"
  );

  elements.summaryChange.classList.remove(
    "positive-text",
    "negative-text"
  );

  if (trendChange > 0) {
    elements.summaryTrend.classList.add("negative-text");
    elements.summaryChange.classList.add("negative-text");
  } else if (trendChange < 0) {
    elements.summaryTrend.classList.add("positive-text");
    elements.summaryChange.classList.add("positive-text");
  }

  elements.anomalyCount.textContent =
    `${summary.anomaly_count}회`;

  elements.offspecCount.textContent =
    `${summary.metrics.off_spec_count}회`;

  elements.maximumIntensity.textContent =
    `${formatNumber(
      summary.metrics.max_steam_intensity,
      3
    )} kg/kg`;

  const maintenanceChange = Number(
    summary.maintenance_effect.change_percent
  );

  elements.maintenanceEffect.classList.remove(
    "positive-text",
    "negative-text"
  );

  if (Number.isFinite(maintenanceChange)) {
    const improved = maintenanceChange < 0;
    const description = improved ? "개선" : "악화";

    elements.maintenanceEffect.textContent =
      `${formatNumber(
        Math.abs(maintenanceChange),
        2
      )}% ${description}`;

    elements.maintenanceEffect.classList.add(
      improved ? "positive-text" : "negative-text"
    );
  } else {
    elements.maintenanceEffect.textContent = "계산 불가";
  }

  drawTrendChart();
}

async function refreshDashboard() {
  elements.refreshSummaryButton.disabled = true;
  elements.refreshSummaryButton.textContent = "불러오는 중";

  try {
    await Promise.all([
      loadData(),
      loadSummary(),
    ]);

    showToast("공정 요약을 새로고침했습니다.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.refreshSummaryButton.disabled = false;
    elements.refreshSummaryButton.textContent = "요약 새로고침";
  }
}

async function loadData() {
  const records = await apiRequest("/api/data");

  state.records = [...records].sort(
    (first, second) =>
      new Date(second.date) - new Date(first.date)
  );

  renderDataTable();
  drawTrendChart();
}

function renderDataTable() {
  elements.dataCountLabel.textContent =
    `${state.records.length.toLocaleString("ko-KR")}개`;

  if (state.records.length === 0) {
    elements.dataTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">
          저장된 운전 데이터가 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  elements.dataTableBody.innerHTML = state.records
    .map((record) => {
      const status = record.operating_status;
      const statusLabel = statusLabels[status] || status;
      const statusClass =
        statusClasses[status] || "status-normal";

      return `
        <tr>
          <td>${escapeHtml(record.date)}</td>

          <td>
            <strong>${formatNumber(record.value, 3)}</strong>
          </td>

          <td>
            ${formatNumber(record.product_purity_pct, 2)}%
          </td>

          <td>
            <span class="status-chip ${statusClass}">
              ${escapeHtml(statusLabel)}
            </span>
          </td>

          <td
            class="memo-cell"
            title="${escapeHtml(record.memo)}"
          >
            ${escapeHtml(record.memo)}
          </td>

          <td>
            <div class="table-actions">
              <button
                class="table-action-button"
                type="button"
                data-action="edit"
                data-id="${escapeHtml(record.id)}"
              >
                수정
              </button>

              <button
                class="table-action-button delete"
                type="button"
                data-action="delete"
                data-id="${escapeHtml(record.id)}"
              >
                삭제
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function calculateSteamIntensity() {
  const steamFlow = Number(elements.steamFlow.value);
  const distillateFlow = Number(
    elements.distillateFlow.value
  );

  if (
    Number.isFinite(steamFlow)
    && Number.isFinite(distillateFlow)
    && steamFlow > 0
    && distillateFlow > 0
  ) {
    elements.steamIntensity.value = (
      steamFlow / distillateFlow
    ).toFixed(3);
  } else {
    elements.steamIntensity.value = "";
  }
}

function buildDataPayload() {
  calculateSteamIntensity();

  const value = Number(elements.steamIntensity.value);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      "스팀 유량과 유출액 유량을 확인해주세요."
    );
  }

  return {
    date: elements.date.value,
    value,
    memo: elements.memo.value.trim(),
    feed_flow_kg_h: Number(elements.feedFlow.value),
    steam_flow_kg_h: Number(elements.steamFlow.value),
    distillate_flow_kg_h: Number(
      elements.distillateFlow.value
    ),
    reflux_ratio: Number(elements.refluxRatio.value),
    product_purity_pct: Number(
      elements.productPurity.value
    ),
    top_temperature_c: Number(
      elements.topTemperature.value
    ),
    bottom_temperature_c: Number(
      elements.bottomTemperature.value
    ),
    operating_status: elements.operatingStatus.value,
  };
}

async function saveData(event) {
  event.preventDefault();

  const editingId = elements.dataId.value;
  const payload = buildDataPayload();

  elements.saveDataButton.disabled = true;
  elements.saveDataButton.textContent = editingId
    ? "수정 중"
    : "저장 중";

  try {
    if (editingId) {
      await apiRequest(
        `/api/data/${encodeURIComponent(editingId)}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      showToast("운전 데이터를 수정했습니다.");
    } else {
      await apiRequest(
        "/api/data",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      showToast("새 운전 데이터를 저장했습니다.");
    }

    resetDataForm();

    await Promise.all([
      loadData(),
      loadSummary(),
    ]);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.saveDataButton.disabled = false;
    elements.saveDataButton.textContent =
      elements.dataId.value ? "데이터 수정" : "데이터 저장";
  }
}

function startEditingData(dataId) {
  const record = state.records.find(
    (item) => item.id === dataId
  );

  if (!record) {
    showToast("수정할 데이터를 찾을 수 없습니다.", "error");
    return;
  }

  elements.dataId.value = record.id;
  elements.date.value = record.date;
  elements.operatingStatus.value = record.operating_status;
  elements.feedFlow.value = record.feed_flow_kg_h;
  elements.steamFlow.value = record.steam_flow_kg_h;
  elements.distillateFlow.value = record.distillate_flow_kg_h;
  elements.steamIntensity.value = Number(
    record.value
  ).toFixed(3);
  elements.refluxRatio.value = record.reflux_ratio;
  elements.productPurity.value = record.product_purity_pct;
  elements.topTemperature.value = record.top_temperature_c;
  elements.bottomTemperature.value =
    record.bottom_temperature_c;
  elements.memo.value = record.memo;

  elements.dataFormTitle.textContent = "운전 데이터 수정";
  elements.saveDataButton.textContent = "데이터 수정";
  elements.cancelEditButton.classList.remove("hidden");

  document.querySelector(".form-panel").scrollIntoView(
    {
      behavior: "smooth",
      block: "start",
    }
  );
}

function resetDataForm() {
  elements.dataForm.reset();
  elements.dataId.value = "";
  elements.date.value = getTodayString();
  elements.steamIntensity.value = "";
  elements.dataFormTitle.textContent = "새 운전 데이터";
  elements.saveDataButton.textContent = "데이터 저장";
  elements.cancelEditButton.classList.add("hidden");
}

async function deleteData(dataId) {
  const record = state.records.find(
    (item) => item.id === dataId
  );

  const recordName = record?.date || "선택한 데이터";

  if (
    !window.confirm(
      `${recordName} 운전 데이터를 삭제할까요?`
    )
  ) {
    return;
  }

  try {
    await apiRequest(
      `/api/data/${encodeURIComponent(dataId)}`,
      {
        method: "DELETE",
      }
    );

    if (elements.dataId.value === dataId) {
      resetDataForm();
    }

    await Promise.all([
      loadData(),
      loadSummary(),
    ]);

    showToast("운전 데이터를 삭제했습니다.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function handleDataTableClick(event) {
  const button = event.target.closest(
    "button[data-action]"
  );

  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const dataId = button.dataset.id;

  if (action === "edit") {
    startEditingData(dataId);
  }

  if (action === "delete") {
    deleteData(dataId);
  }
}

function drawTrendChart() {
  const canvas = elements.trendChart;

  if (!canvas || state.records.length === 0) {
    return;
  }

  const rectangle = canvas.getBoundingClientRect();

  if (rectangle.width < 10 || rectangle.height < 10) {
    return;
  }

  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    2
  );

  canvas.width = Math.round(rectangle.width * pixelRatio);
  canvas.height = Math.round(rectangle.height * pixelRatio);

  const context = canvas.getContext("2d");
  context.scale(pixelRatio, pixelRatio);

  const width = rectangle.width;
  const height = rectangle.height;

  const padding = {
    top: 24,
    right: 20,
    bottom: 38,
    left: 56,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const records = [...state.records].sort(
    (first, second) =>
      new Date(first.date) - new Date(second.date)
  );

  const values = records.map(
    (record) => Number(record.value)
  );

  let minimumValue = Math.min(...values);
  let maximumValue = Math.max(...values);
  let valueRange = maximumValue - minimumValue;

  if (valueRange === 0) {
    valueRange = 0.2;
  }

  minimumValue -= valueRange * 0.12;
  maximumValue += valueRange * 0.12;
  valueRange = maximumValue - minimumValue;

  const styles = getComputedStyle(document.body);
  const primaryColor = styles
    .getPropertyValue("--primary")
    .trim();
  const borderColor = styles
    .getPropertyValue("--border")
    .trim();
  const secondaryText = styles
    .getPropertyValue("--text-secondary")
    .trim();
  const dangerColor = styles
    .getPropertyValue("--danger")
    .trim();

  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;
  context.font =
    '10px Pretendard, "Noto Sans KR", sans-serif';
  context.textBaseline = "middle";

  const horizontalLines = 4;

  for (let index = 0; index <= horizontalLines; index += 1) {
    const ratio = index / horizontalLines;
    const y = padding.top + chartHeight * ratio;
    const labelValue =
      maximumValue - valueRange * ratio;

    context.beginPath();
    context.strokeStyle = borderColor;
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();

    context.fillStyle = secondaryText;
    context.textAlign = "right";
    context.fillText(
      labelValue.toFixed(2),
      padding.left - 9,
      y
    );
  }

  const getX = (index) => {
    if (records.length === 1) {
      return padding.left + chartWidth / 2;
    }

    return (
      padding.left
      + (index / (records.length - 1)) * chartWidth
    );
  };

  const getY = (value) =>
    padding.top
    + ((maximumValue - value) / valueRange) * chartHeight;

  const labelIndexes = new Set([
    0,
    Math.floor((records.length - 1) * 0.25),
    Math.floor((records.length - 1) * 0.5),
    Math.floor((records.length - 1) * 0.75),
    records.length - 1,
  ]);

  context.fillStyle = secondaryText;
  context.textAlign = "center";
  context.textBaseline = "top";

  labelIndexes.forEach((index) => {
    const date = records[index]?.date;

    if (!date) {
      return;
    }

    context.fillText(
      date.slice(5),
      getX(index),
      height - padding.bottom + 12
    );
  });

  const points = records.map(
    (record, index) => ({
      x: getX(index),
      y: getY(Number(record.value)),
      record,
    })
  );

  const gradient = context.createLinearGradient(
    0,
    padding.top,
    0,
    padding.top + chartHeight
  );

  gradient.addColorStop(0, `${primaryColor}42`);
  gradient.addColorStop(1, `${primaryColor}00`);

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  points.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });

  context.lineTo(
    points[points.length - 1].x,
    padding.top + chartHeight
  );
  context.lineTo(
    points[0].x,
    padding.top + chartHeight
  );
  context.closePath();
  context.fillStyle = gradient;
  context.fill();

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  points.slice(1).forEach((point) => {
    context.lineTo(point.x, point.y);
  });

  context.strokeStyle = primaryColor;
  context.lineWidth = 2.2;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();

  if (state.summary) {
    const average = Number(
      state.summary.metrics.average_steam_intensity
    );

    if (Number.isFinite(average)) {
      const averageY = getY(average);

      context.save();
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(padding.left, averageY);
      context.lineTo(width - padding.right, averageY);
      context.strokeStyle = secondaryText;
      context.lineWidth = 1;
      context.stroke();
      context.restore();
    }
  }

  points.forEach((point) => {
    if (point.record.operating_status !== "ABNORMAL") {
      return;
    }

    context.beginPath();
    context.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
    context.fillStyle = dangerColor;
    context.fill();
  });
}

function convertToCsvValue(value) {
  const text = String(value ?? "");

  if (
    text.includes(",")
    || text.includes('"')
    || text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function exportDataAsCsv() {
  if (state.records.length === 0) {
    showToast("내보낼 데이터가 없습니다.", "error");
    return;
  }

  const headers = [
    "date",
    "value",
    "memo",
    "feed_flow_kg_h",
    "steam_flow_kg_h",
    "distillate_flow_kg_h",
    "reflux_ratio",
    "product_purity_pct",
    "top_temperature_c",
    "bottom_temperature_c",
    "operating_status",
  ];

  const rows = [...state.records]
    .sort(
      (first, second) =>
        new Date(first.date) - new Date(second.date)
    )
    .map((record) =>
      headers.map((header) => record[header])
    );

  const csvText = "\uFEFF"
    + [headers, ...rows]
      .map((row) =>
        row.map(convertToCsvValue).join(",")
      )
      .join("\r\n");

  const blob = new Blob(
    [csvText],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `distillmate_data_${getTodayString()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("CSV 파일을 다운로드했습니다.");
}

async function loadConversations() {
  const conversations = await apiRequest(
    "/api/conversations"
  );

  state.conversations = [...conversations].sort(
    (first, second) =>
      new Date(second.updated_at) - new Date(first.updated_at)
  );

  renderConversationList();
}

function renderConversationList() {
  if (state.conversations.length === 0) {
    elements.conversationList.innerHTML = `
      <p class="empty-message">
        아직 저장된 대화가 없습니다.
      </p>
    `;
    return;
  }

  elements.conversationList.innerHTML = state.conversations
    .map((conversation) => {
      const active =
        conversation.id === state.currentConversationId
          ? "active"
          : "";

      return `
        <div
          class="conversation-item ${active}"
          role="button"
          tabindex="0"
          data-action="load-conversation"
          data-id="${escapeHtml(conversation.id)}"
        >
          <span class="conversation-title">
            ${escapeHtml(conversation.title)}
          </span>

          <span class="conversation-date">
            ${escapeHtml(
              formatDateTime(conversation.updated_at)
            )}
          </span>

          <button
            class="conversation-delete"
            type="button"
            data-action="delete-conversation"
            data-id="${escapeHtml(conversation.id)}"
            aria-label="대화 삭제"
            title="대화 삭제"
          >
            ×
          </button>
        </div>
      `;
    })
    .join("");
}

function clearChatMessages() {
  elements.chatMessages.innerHTML = "";
}

function appendChatMessage(role, content) {
  const messageElement = document.createElement("div");
  const authorElement = document.createElement("span");
  const contentElement = document.createElement("p");

  messageElement.className =
    `message ${
      role === "user"
        ? "user-message"
        : "assistant-message"
    }`;

  authorElement.className = "message-author";
  authorElement.textContent =
    role === "user" ? "나" : "DistillMate AI";

  contentElement.textContent = content;

  messageElement.appendChild(authorElement);
  messageElement.appendChild(contentElement);
  elements.chatMessages.appendChild(messageElement);

  scrollChatToBottom();
}

function showWelcomeMessage() {
  clearChatMessages();

  appendChatMessage(
    "assistant",
    "안녕하세요. 증류탑 운전 데이터를 바탕으로 "
      + "에너지 효율, 제품 순도, 이상 운전과 "
      + "정비 효과를 분석해 드릴게요."
  );
}

function scrollChatToBottom() {
  elements.chatMessages.scrollTop =
    elements.chatMessages.scrollHeight;
}

function startNewConversation() {
  state.currentConversationId = null;
  elements.currentConversationLabel.textContent = "새 대화";
  elements.chatInput.value = "";

  showWelcomeMessage();
  renderConversationList();
  elements.chatInput.focus();
}

async function loadConversation(conversationId) {
  try {
    const conversation = await apiRequest(
      `/api/conversations/${
        encodeURIComponent(conversationId)
      }`
    );

    state.currentConversationId = conversation.id;
    elements.currentConversationLabel.textContent =
      conversation.title;

    clearChatMessages();

    if (conversation.messages.length === 0) {
      showWelcomeMessage();
    } else {
      conversation.messages.forEach((message) => {
        appendChatMessage(
          message.role,
          message.content
        );
      });
    }

    renderConversationList();
    scrollChatToBottom();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteConversation(conversationId) {
  if (!window.confirm("이 대화 기록을 삭제할까요?")) {
    return;
  }

  try {
    await apiRequest(
      `/api/conversations/${
        encodeURIComponent(conversationId)
      }`,
      {
        method: "DELETE",
      }
    );

    if (state.currentConversationId === conversationId) {
      startNewConversation();
    }

    await loadConversations();
    showToast("대화 기록을 삭제했습니다.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function handleConversationListClick(event) {
  const deleteButton = event.target.closest(
    '[data-action="delete-conversation"]'
  );

  if (deleteButton) {
    event.stopPropagation();
    deleteConversation(deleteButton.dataset.id);
    return;
  }

  const conversationItem = event.target.closest(
    '[data-action="load-conversation"]'
  );

  if (conversationItem) {
    loadConversation(conversationItem.dataset.id);
  }
}

async function refreshConversations() {
  elements.refreshConversationsButton.disabled = true;

  try {
    await loadConversations();
    showToast("대화 목록을 새로고침했습니다.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.refreshConversationsButton.disabled = false;
  }
}

function setChatLoading(loading) {
  elements.chatLoading.classList.toggle("hidden", !loading);
  elements.sendChatButton.disabled = loading;
  elements.chatInput.disabled = loading;
  elements.sendChatButton.textContent = loading
    ? "분석 중"
    : "전송";

  if (loading) {
    scrollChatToBottom();
  }
}

async function sendChatMessage(event) {
  event.preventDefault();

  const message = elements.chatInput.value.trim();

  if (!message) {
    return;
  }

  appendChatMessage("user", message);
  elements.chatInput.value = "";
  setChatLoading(true);

  try {
    const response = await apiRequest(
      "/api/chat",
      {
        method: "POST",
        body: JSON.stringify({
          message,
          conversation_id: state.currentConversationId,
        }),
      }
    );

    state.currentConversationId =
      response.conversation_id;

    appendChatMessage("assistant", response.answer);

    elements.currentConversationLabel.textContent =
      message.length > 24
        ? `${message.slice(0, 24)}…`
        : message;

    await loadConversations();
  } catch (error) {
    appendChatMessage(
      "assistant",
      `답변을 생성하지 못했습니다. ${error.message}`
    );

    showToast(error.message, "error");
  } finally {
    setChatLoading(false);
    elements.chatInput.focus();
  }
}

function handleSuggestionClick(event) {
  const button = event.target.closest(".suggestion-button");

  if (!button) {
    return;
  }

  elements.chatInput.value = button.dataset.question;
  elements.chatForm.requestSubmit();
}

function bindEvents() {
  elements.themeToggle.addEventListener(
    "click",
    toggleTheme
  );

  elements.refreshSummaryButton.addEventListener(
    "click",
    refreshDashboard
  );

  elements.exportButton.addEventListener(
    "click",
    exportDataAsCsv
  );

  elements.steamFlow.addEventListener(
    "input",
    calculateSteamIntensity
  );

  elements.distillateFlow.addEventListener(
    "input",
    calculateSteamIntensity
  );

  elements.dataForm.addEventListener(
    "submit",
    saveData
  );

  elements.cancelEditButton.addEventListener(
    "click",
    resetDataForm
  );

  elements.dataTableBody.addEventListener(
    "click",
    handleDataTableClick
  );

  elements.newConversationButton.addEventListener(
    "click",
    startNewConversation
  );

  elements.refreshConversationsButton.addEventListener(
    "click",
    refreshConversations
  );

  elements.conversationList.addEventListener(
    "click",
    handleConversationListClick
  );

  elements.chatForm.addEventListener(
    "submit",
    sendChatMessage
  );

  elements.chatInput.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter"
        && !event.shiftKey
      ) {
        event.preventDefault();
        elements.chatForm.requestSubmit();
      }
    }
  );

  document
    .querySelector(".suggestion-list")
    .addEventListener(
      "click",
      handleSuggestionClick
    );

  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);

      resizeTimer = window.setTimeout(
        drawTrendChart,
        150
      );
    }
  );
}

async function initializeApp() {
  getElements();
  initializeTheme();
  bindEvents();
  resetDataForm();
  showWelcomeMessage();

  checkApiConnection();

  const results = await Promise.allSettled([
    loadData(),
    loadSummary(),
    loadConversations(),
  ]);

  const failedResult = results.find(
    (result) => result.status === "rejected"
  );

  if (failedResult) {
    showToast(
      failedResult.reason?.message
        || "일부 데이터를 불러오지 못했습니다.",
      "error"
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
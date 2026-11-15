let allLogs = [];
let allAid = [];

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFieldValue(field) {
  if (!field) return "";
  if (typeof field === "object" && field.value !== undefined) {
    return String(field.value);
  }
  if (Array.isArray(field) && field.length > 0) {
    return typeof field[0] === "object" ? String(field[0].value || "") : String(field[0]);
  }
  return String(field);
}

function extractCleanDomain(url) {
  if (!url || url === "#") return "";
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./i, "");
  } catch (e) {
    return "";
  }
}

function populateSelect(selectId, values) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const uniqueValues = [...new Set(values.filter((v) => v && v.trim() !== ""))].sort();
  const firstOption = select.options[0] ? select.options[0].outerHTML : `<option value="ALL">All</option>`;

  select.innerHTML =
    firstOption +
    uniqueValues
      .map((val) => `<option value="${escapeHTML(val)}">${escapeHTML(val)}</option>`)
      .join("");
}

function renderLogs() {
  const container = document.getElementById("war-log-list");
  if (!container) return;

  const query = (document.getElementById("log-search")?.value || "").toLowerCase().trim();
  const topicFilter = document.getElementById("log-topic-filter")?.value || "ALL";

  const sortedLogs = [...allLogs].sort((a, b) => {
    const dateA = a.Date || a.Published_Date || "";
    const dateB = b.Date || b.Published_Date || "";
    return String(dateB).localeCompare(String(dateA));
  });

  const filtered = sortedLogs.filter((item) => {
    const topic = getFieldValue(item.Region_Topic);
    const matchesTopic = topicFilter === "ALL" || topic === topicFilter;

    const headline = item.Headline || item.Title || "";
    const source = item.Source_Name || "";
    const summary = item.Summary || "";
    const text = `${headline} ${summary} ${topic} ${source}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);

    return matchesTopic && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="status-msg">No matching news dispatches found.</p>`;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const date = escapeHTML(item.Date || item.Published_Date || "");
      const topic = escapeHTML(getFieldValue(item.Region_Topic));
      const source = escapeHTML(item.Source_Name || "Primary Source");
      const headline = escapeHTML(item.Headline || item.Title || "News Dispatch");
      const summary = escapeHTML(item.Summary || "");
      const url = escapeHTML(item.Source_URL || "#");

      return `
        <article class="log-card">
          <div class="log-meta">
            ${date ? `<span class="log-date">${date}</span>` : ""}
            ${topic ? `<span class="badge">${topic}</span>` : ""}
            <span class="log-source">Source: <strong>${source}</strong></span>
          </div>
          <h3>${headline}</h3>
          <p>${summary}</p>
          <a class="log-link" href="${url}" target="_blank" rel="noopener noreferrer">Read original dispatch &rarr;</a>
        </article>
      `;
    })
    .join("");
}

function renderAid() {
  const container = document.getElementById("aid-directory-grid");
  if (!container) return;

  const query = (document.getElementById("aid-search")?.value || "").toLowerCase().trim();
  const countryFilter = document.getElementById("aid-country-filter")?.value || "ALL";
  const entityFilter = document.getElementById("aid-entity-filter")?.value || "ALL";
  const categoryFilter = document.getElementById("aid-category-filter")?.value || "ALL";

  const filtered = allAid.filter((item) => {
    const country = getFieldValue(item.Country_Region);
    const entity = getFieldValue(item.Entity_Type);
    const category = getFieldValue(item.Category);

    const matchesCountry = countryFilter === "ALL" || country === countryFilter;
    const matchesEntity = entityFilter === "ALL" || entity === entityFilter;
    const matchesCategory = categoryFilter === "ALL" || category === categoryFilter;

    const programName = item.Program_Name || item.Name || "";
    const summary = item.Summary || item.Description || "";
    const text = `${programName} ${summary} ${country} ${category}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);

    return matchesCountry && matchesEntity && matchesCategory && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="status-msg">No matching aid programs found.</p>`;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const name = escapeHTML(item.Program_Name || item.Name || "Aid Program");
      const country = escapeHTML(getFieldValue(item.Country_Region));
      const entity = escapeHTML(getFieldValue(item.Entity_Type));
      const category = escapeHTML(getFieldValue(item.Category));
      const summary = escapeHTML(item.Summary || item.Description || "");
      const rawUrl = item.Official_URL || item.Website_URL || "#";
      const url = escapeHTML(rawUrl);
      const cleanDomain = escapeHTML(extractCleanDomain(rawUrl));

      return `
        <article class="aid-card">
          <div>
            <div class="aid-tags">
              ${country ? `<span class="badge">${country}</span>` : ""}
              ${entity ? `<span class="badge">${entity}</span>` : ""}
              ${category ? `<span class="badge">${category}</span>` : ""}
            </div>
            <h3>${name}</h3>
            <p>${summary}</p>
          </div>
          <div class="card-footer-trust">
            ${cleanDomain ? `
              <div class="verified-domain-wrapper">
                <span class="verified-domain-badge" title="Manually verified official destination">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  <span>Verified Domain: <strong>${cleanDomain}</strong></span>
                </span>
              </div>
            ` : ""}
            <a class="aid-btn" href="${url}" target="_blank" rel="noopener noreferrer">Official Program Portal &nearr;</a>
          </div>
        </article>
      `;
    })
    .join("");
}

async function init() {
  try {
    const response = await fetch("/api/data");
    if (!response.ok) throw new Error("Unable to load data feed.");

    const data = await response.json();
    allLogs = data.logs || [];
    allAid = data.aid || [];

    populateSelect("log-topic-filter", allLogs.map((i) => getFieldValue(i.Region_Topic)));
    populateSelect("aid-country-filter", allAid.map((i) => getFieldValue(i.Country_Region)));
    populateSelect("aid-entity-filter", allAid.map((i) => getFieldValue(i.Entity_Type)));
    populateSelect("aid-category-filter", allAid.map((i) => getFieldValue(i.Category)));

    renderLogs();
    renderAid();
  } catch (err) {
    console.error("AidFrontUA Feed Error:", err);
    const logList = document.getElementById("war-log-list");
    const aidGrid = document.getElementById("aid-directory-grid");
    if (logList) {
      logList.innerHTML = `<p class="status-msg">Feed temporarily unavailable. Please verify API connection.</p>`;
    }
    if (aidGrid) {
      aidGrid.innerHTML = `<p class="status-msg">Directory temporarily unavailable. Please verify API connection.</p>`;
    }
  }
}

document.getElementById("log-topic-filter")?.addEventListener("change", renderLogs);
document.getElementById("log-search")?.addEventListener("input", renderLogs);
document.getElementById("aid-search")?.addEventListener("input", renderAid);
document.getElementById("aid-country-filter")?.addEventListener("change", renderAid);
document.getElementById("aid-entity-filter")?.addEventListener("change", renderAid);
document.getElementById("aid-category-filter")?.addEventListener("change", renderAid);

init();

document.getElementById("year").textContent = new Date().getFullYear();

let allLogs = [];
let allAid = [];

// Extrai o texto de campos Single Select ou Text do Baserow
function getFieldValue(field) {
  if (!field) return "";
  if (typeof field === "object" && field.value) return field.value;
  return String(field);
}

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function populateSelect(selectId, values) {
  const select = document.getElementById(selectId);
  const unique = [...new Set(values.filter(Boolean))].sort();
  unique.forEach((val) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
}

function renderLogs() {
  const container = document.getElementById("war-log-list");
  const topicFilter = document.getElementById("log-topic-filter").value;
  const query = document.getElementById("log-search").value.toLowerCase().trim();

  const filtered = allLogs.filter((item) => {
    const topic = getFieldValue(item.Region_Topic);
    const matchesTopic = topicFilter === "ALL" || topic === topicFilter;
    const text = `${item.Headline || ""} ${item.Summary || ""} ${item.Source_Name || ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    return matchesTopic && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="status-msg">No matching dispatches found.</p>`;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const date = escapeHTML(item.Date || "");
      const topic = escapeHTML(getFieldValue(item.Region_Topic));
      const headline = escapeHTML(item.Headline || "Untitled Dispatch");
      const summary = escapeHTML(item.Summary || "");
      const source = escapeHTML(item.Source_Name || "Primary Source");
      const url = escapeHTML(item.Source_URL || "#");

      return `
        <article class="log-item">
          <div class="log-meta">
            <time datetime="${date}">${date}</time>
            ${topic ? `<span class="badge">${topic}</span>` : ""}
            <span>Source: <strong>${source}</strong></span>
          </div>
          <h3><a href="${url}" target="_blank" rel="noopener noreferrer">${headline}</a></h3>
          ${summary ? `<p class="log-summary">${summary}</p>` : ""}
          <a class="source-link" href="${url}" target="_blank" rel="noopener noreferrer">Read original dispatch &rarr;</a>
        </article>
      `;
    })
    .join("");
}

function renderAid() {
  const container = document.getElementById("aid-directory-grid");
  const query = document.getElementById("aid-search").value.toLowerCase().trim();
  const countryFilter = document.getElementById("aid-country-filter").value;
  const entityFilter = document.getElementById("aid-entity-filter").value;
  const categoryFilter = document.getElementById("aid-category-filter").value;

  const filtered = allAid.filter((item) => {
    const country = getFieldValue(item.Country_Region);
    const entity = getFieldValue(item.Entity_Type);
    const category = getFieldValue(item.Category);

    const matchesCountry = countryFilter === "ALL" || country === countryFilter;
    const matchesEntity = entityFilter === "ALL" || entity === entityFilter;
    const matchesCategory = categoryFilter === "ALL" || category === categoryFilter;

    const text = `${item.Program_Name || ""} ${item.Summary || ""} ${country} ${category}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);

    return matchesCountry && matchesEntity && matchesCategory && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p class="status-msg">No matching aid programs found.</p>`;
    return;
  }

  container.innerHTML = filtered
    .map((item) => {
      const name = escapeHTML(item.Program_Name || "Aid Program");
      const country = escapeHTML(getFieldValue(item.Country_Region));
      const entity = escapeHTML(getFieldValue(item.Entity_Type));
      const category = escapeHTML(getFieldValue(item.Category));
      const summary = escapeHTML(item.Summary || "");
      const url = escapeHTML(item.Official_URL || "#");

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
          <a class="aid-btn" href="${url}" target="_blank" rel="noopener noreferrer">Official Program Portal &nearr;</a>
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
    document.getElementById("war-log-list").innerHTML =
      `<p class="status-msg">Feed temporarily unavailable. Please verify API connection.</p>`;
    document.getElementById("aid-directory-grid").innerHTML =
      `<p class="status-msg">Directory temporarily unavailable. Please verify API connection.</p>`;
  }
}

document.getElementById("log-topic-filter").addEventListener("change", renderLogs);
document.getElementById("log-search").addEventListener("input", renderLogs);
document.getElementById("aid-search").addEventListener("input", renderAid);
document.getElementById("aid-country-filter").addEventListener("change", renderAid);
document.getElementById("aid-entity-filter").addEventListener("change", renderAid);
document.getElementById("aid-category-filter").addEventListener("change", renderAid);

init();

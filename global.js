
// =================================
// RESOURCES IN MORE THAN ONE CATEGORY
// =================================
// A card is written once, in its main category on all-resources.html.
// data-also-in="planning community" adds a copy to those categories too.
// Copies keep the same data-resource-id, so bookmarks and Compare treat
// them as one resource. This runs first so the code below wires up copies.

document.querySelectorAll(".resource-card[data-also-in]").forEach(card => {
  card.dataset.alsoIn.split(/\s+/).filter(Boolean).forEach(category => {
    const grid = document.querySelector(`.resource-category[data-category="${category}"] .resource-grid`);
    if (!grid) return;
    const copy = card.cloneNode(true);
    copy.removeAttribute("data-also-in");
    // Element ids must stay unique on the page.
    copy.querySelectorAll("[id]").forEach(el => { el.id += "--" + category; });
    const labelledBy = copy.getAttribute("aria-labelledby");
    if (labelledBy) copy.setAttribute("aria-labelledby", labelledBy + "--" + category);
    grid.appendChild(copy);
  });
});


// =================================
// SAVED RESOURCES (bookmarks)
// =================================
// Saved resource IDs live in localStorage so they survive refreshes and
// page changes. Other features (e.g. "My Resources") can read them with
// StudentHelpGuide.getSavedResources() and listen for the
// "savedresourceschange" event on document.

const SAVED_KEY = "studentHelpGuide.savedResources";

function readSavedResources() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === "string") : [];
  } catch (err) {
    return []; // storage blocked or corrupted: start empty
  }
}

function writeSavedResources(ids) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch (err) {
    // Storage unavailable (private mode, blocked): state still works for this visit.
  }
}

let savedResources = new Set(readSavedResources());

// IDs checked with "Compare". In-memory only for now; no comparison page yet.
const compareSelection = new Set();

// Card bookmarks take their ID from the card; standalone Save buttons
// (e.g. on a resource's detail page) name it with data-save-resource.
const BOOKMARK_SELECTOR = ".resource-card .bookmark-btn, [data-save-resource]";

function bookmarkId(button) {
  return button.dataset.saveResource || button.closest(".resource-card").dataset.resourceId;
}

function showBookmarkState(button, saved) {
  button.setAttribute("aria-pressed", String(saved));
  const label = button.querySelector(".save-btn__label");
  if (label) label.textContent = saved ? "Saved" : "Save";
}

function syncBookmarkButtons() {
  document.querySelectorAll(BOOKMARK_SELECTOR).forEach(button => {
    showBookmarkState(button, savedResources.has(bookmarkId(button)));
  });
}

function setSaved(id, saved) {
  if (saved) savedResources.add(id);
  else savedResources.delete(id);
  writeSavedResources([...savedResources]);
  document.dispatchEvent(new CustomEvent("savedresourceschange", {
    detail: { ids: [...savedResources] }
  }));
}

document.querySelectorAll(BOOKMARK_SELECTOR).forEach(button => {
  button.addEventListener("click", () => {
    const saved = button.getAttribute("aria-pressed") !== "true";
    setSaved(bookmarkId(button), saved);
    syncBookmarkButtons(); // updates every copy of this resource on the page
  });
});

// Keep bookmarks in sync if they change in another tab.
window.addEventListener("storage", event => {
  if (event.key !== SAVED_KEY) return;
  savedResources = new Set(readSavedResources());
  syncBookmarkButtons();
});

syncBookmarkButtons();


// =================================
// COMPARE CHECKBOXES
// =================================

document.querySelectorAll(".compare-check__input").forEach(input => {
  input.checked = false;
  input.addEventListener("change", () => {
    if (input.checked) compareSelection.add(input.value);
    else compareSelection.delete(input.value);
    // Keep copies of the same resource in other categories in step.
    document.querySelectorAll(".compare-check__input").forEach(other => {
      if (other.value === input.value) other.checked = input.checked;
    });
  });
});


// =================================
// PLACEHOLDER LINKS
// =================================
// "See next steps" / "See 10 tools" links use href="#" until their pages
// exist. Stop them from jumping to the top of the page.

document.querySelectorAll("[data-placeholder-link]").forEach(link => {
  link.addEventListener("click", event => event.preventDefault());
});


// =================================
// EMAIL TEMPLATES
// =================================
// An email template is split into parts:
//   [data-email-part="subject"]  the subject line
//   [data-email-part="body"]     the message; each <p> is one paragraph
//   [data-email-part="closing"]  the sign-off; <br> starts a new line
//
// <a data-email-open="some-id" data-email-to="name@andrew.cmu.edu">
//   opens the student's email app with the recipient, subject and message
//   filled in. Leave data-email-to empty to let the student fill in "To".
// <button data-copy-target="some-id">
//   copies the message (body and closing) and reports the result in the
//   nearest .detail-email__status (if any).

// Text of an element with <br> as line breaks and tidy spacing.
function emailText(el) {
  if (!el) return "";
  const clone = el.cloneNode(true);
  clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  return clone.textContent
    .split("\n")
    .map(line => line.replace(/ /g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function emailParts(template) {
  const body = template.querySelector('[data-email-part="body"]');
  const paragraphs = body
    ? [...body.querySelectorAll("p")].map(emailText).filter(Boolean)
    : [emailText(template)];
  const closing = emailText(template.querySelector('[data-email-part="closing"]'));
  return {
    subject: emailText(template.querySelector('[data-email-part="subject"]')),
    message: [...paragraphs, closing].filter(Boolean).join("\n\n"),
  };
}

document.querySelectorAll("[data-email-open]").forEach(link => {
  const template = document.getElementById(link.dataset.emailOpen);
  if (!template) return;
  const { subject, message } = emailParts(template);
  const to = link.dataset.emailTo || "";
  const query = [];
  if (subject) query.push("subject=" + encodeURIComponent(subject));
  // Email links expect CRLF line breaks.
  if (message) query.push("body=" + encodeURIComponent(message.replace(/\n/g, "\r\n")));
  link.href = "mailto:" + to + (query.length ? "?" + query.join("&") : "");
});

document.querySelectorAll("[data-copy-target]").forEach(button => {
  button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.copyTarget);
    const status = button.closest(".detail-email")?.querySelector(".detail-email__status");
    if (!source) return;
    const text = emailParts(source).message;

    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (err) {
      // Fallback for browsers without the async clipboard API.
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
      area.remove();
    }

    if (status) {
      status.textContent = copied
        ? "Copied the message. Paste it into a new email, add the subject and fill in the parts in brackets."
        : "Couldn't copy automatically. Select the text above and copy it.";
    }
  });
});


// Public helpers for future features (e.g. My Resources, comparison page).
window.StudentHelpGuide = {
  getSavedResources: () => [...savedResources],
  getCompareSelection: () => [...compareSelection]
};


// =================================
// TOOLS PAGE FILTERS (assistive-technology.html)
// =================================
// Buttons use data-tool-filter; cards list their filters in data-tools.
// assistive-technology.html?filter=timers (etc.) opens on one filter.

const toolButtons = document.querySelectorAll("[data-tool-filter]");
const toolCards = document.querySelectorAll(".resource-card[data-tools]");

if (toolButtons.length && toolCards.length) {
  const toolFilters = [...toolButtons].map(button => button.dataset.toolFilter);
  const fromUrl = new URLSearchParams(window.location.search).get("filter");
  let selectedTool = toolFilters.includes(fromUrl) ? fromUrl : "all";
  const toolStatus = document.getElementById("tool-status");

  function updateTools() {
    toolButtons.forEach(button => {
      const active = button.dataset.toolFilter === selectedTool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    let visible = 0;
    toolCards.forEach(card => {
      const show = selectedTool === "all" || card.dataset.tools.split(" ").includes(selectedTool);
      card.hidden = !show;
      if (show) visible++;
    });
    if (toolStatus) toolStatus.textContent = visible ? "" : "No tools match this filter.";
  }

  toolButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedTool = button.dataset.toolFilter;
      const url = new URL(window.location.href);
      if (selectedTool === "all") url.searchParams.delete("filter");
      else url.searchParams.set("filter", selectedTool);
      window.history.replaceState(null, "", url);
      updateTools();
    });
  });

  updateTools();
}


// =================================
// RESOURCE CATEGORY + FORMAT FILTERS
// =================================
// all-resources.html?category=classes (etc.) opens on one category.

const categoryTabs = document.querySelectorAll(".browse-tab");
const filterButtons = document.querySelectorAll(".filter-btn");
const resourceSections = document.querySelectorAll(".resource-category");
const resourceStatus = document.getElementById("resource-status");

if (categoryTabs.length && resourceSections.length) {

  const validCategories = [
    "all", "classes", "planning", "feelings",
    "health", "career", "community"
  ];

  function categoryFromUrl() {
    const category = new URLSearchParams(window.location.search).get("category");
    return validCategories.includes(category) ? category : "all";
  }

  let selectedCategory = categoryFromUrl();
  let selectedFilter = "all";

  function updateResources() {

    // Update category buttons
    categoryTabs.forEach(tab => {
      const active = tab.dataset.category === selectedCategory;

      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    // Update format buttons
    filterButtons.forEach(button => {
      const active = button.dataset.filter === selectedFilter;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    let totalVisible = 0;

    // Filter sections and cards
    resourceSections.forEach(section => {

      const matchesCategory =
        selectedCategory === "all" ||
        section.dataset.category === selectedCategory;

      let visibleCards = 0;

      section.querySelectorAll(".resource-card").forEach(card => {
        const formats = (card.dataset.formats || "").split(" ");

        const matchesFilter =
          selectedFilter === "all" ||
          formats.includes(selectedFilter);

        card.hidden = !matchesFilter;

        if (matchesFilter) visibleCards++;
      });

      // "Try on your own" strips aren't a format, so only show them unfiltered.
      section.querySelectorAll(".resource-tools").forEach(tools => {
        tools.hidden = selectedFilter !== "all";
      });

      section.hidden = !matchesCategory || visibleCards === 0;

      if (!section.hidden) totalVisible += visibleCards;
    });

    if (resourceStatus) {
      resourceStatus.textContent = totalVisible === 0
        ? "No matching resources. Try another format, or choose All Categories."
        : "";
    }
  }

  // Clicking a category (keeps the current format filter)
  categoryTabs.forEach(tab => {
    tab.addEventListener("click", () => {

      if (tab.dataset.category === selectedCategory) return;
      selectedCategory = tab.dataset.category;

      // Update URL without reloading the page
      const url = new URL(window.location.href);

      if (selectedCategory === "all") {
        url.searchParams.delete("category");
      } else {
        url.searchParams.set("category", selectedCategory);
      }

      window.history.pushState({ category: selectedCategory }, "", url);

      updateResources();
    });
  });

  // Clicking a format filter
  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedFilter = button.dataset.filter;
      updateResources();
    });
  });

  // Support browser back/forward navigation
  window.addEventListener("popstate", () => {
    selectedCategory = categoryFromUrl();
    updateResources();
  });

  updateResources();
}
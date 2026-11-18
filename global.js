
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
    showBookmarkState(button, saved);
    setSaved(bookmarkId(button), saved);
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
// COPY BUTTONS
// =================================
// <button data-copy-target="some-id"> copies the text of #some-id and
// reports the result in the nearest .detail-email__status (if any).

document.querySelectorAll("[data-copy-target]").forEach(button => {
  button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.copyTarget);
    const status = button.closest(".detail-email")?.querySelector(".detail-email__status");
    if (!source) return;
    const text = source.textContent.replace(/ /g, " ").replace(/\s+/g, " ").trim();

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
        ? "Copied. Paste it into a new email and fill in the parts in brackets."
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
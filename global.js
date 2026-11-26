
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
// page changes. my-resources.js reads them with
// StudentHelpGuide.getSavedResources() and listens for the
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

// listen on document so cards added later also work
document.addEventListener("click", event => {
  const button = event.target.closest(BOOKMARK_SELECTOR);
  if (!button) return;
  const saved = button.getAttribute("aria-pressed") !== "true";
  setSaved(bookmarkId(button), saved);
  syncBookmarkButtons(); // updates every copy of this resource on the page
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

function syncCompareChecks() {
  document.querySelectorAll(".compare-check__input").forEach(input => {
    input.checked = compareSelection.has(input.value);
  });
}

document.addEventListener("change", event => {
  const input = event.target.closest(".compare-check__input");
  if (!input) return;
  if (input.checked) compareSelection.add(input.value);
  else compareSelection.delete(input.value);
  syncCompareChecks(); // keep copies of the same resource in other categories in step
});

syncCompareChecks();


// =================================
// PLACEHOLDER LINKS
// =================================
// "See next steps" / "See 10 tools" links use href="#" until their pages
// exist. Stop them from jumping to the top of the page.

document.addEventListener("click", event => {
  if (event.target.closest("[data-placeholder-link]")) event.preventDefault();
});


// =================================
// PHONE LINKS
// =================================
// On a phone, a tel: link can start the call right away. Ask first so a
// stray tap doesn't call an office (or 911).

function formatPhone(digits) {
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

document.addEventListener("click", event => {
  const link = event.target.closest('a[href^="tel:"]');
  if (!link) return;
  const number = formatPhone(link.getAttribute("href").slice(4).replace(/\D/g, ""));
  if (!window.confirm(`Call ${number}?`)) event.preventDefault();
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


// syncCards() refreshes Save / Compare state after adding cards to the page.
window.StudentHelpGuide = {
  getSavedResources: () => [...savedResources],
  getCompareSelection: () => [...compareSelection],
  syncCards: () => {
    syncBookmarkButtons();
    syncCompareChecks();
  }
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
// TOPIC TABS + FORMAT FILTER (all-resources.html)
// =================================
// ?category=planning opens scrolled to a topic, ?format=group opens on one format.

const categoryTabs = document.querySelectorAll(".browse-tab");
const filterButtons = document.querySelectorAll(".filter-btn");
const resourceSections = document.querySelectorAll(".resource-category");
const resourceStatus = document.getElementById("resource-status");
const tabBar = document.querySelector(".browse-tabs");
const resourceTop = document.querySelector(".resource-section");

if (categoryTabs.length && resourceSections.length) {

  const formats = [...filterButtons].map(button => button.dataset.filter);
  const params = new URLSearchParams(window.location.search);
  let selectedFilter = formats.includes(params.get("format")) ? params.get("format") : "all";

  function sectionFor(category) {
    return document.querySelector(`.resource-category[data-category="${category}"]`);
  }

  function setUrlParam(name, value) {
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete(name);
    else url.searchParams.set(name, value);
    window.history.replaceState(null, "", url);
  }

  // ----- format filter -----

  function updateFormatFilter() {
    filterButtons.forEach(button => {
      const active = button.dataset.filter === selectedFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    let totalVisible = 0;

    resourceSections.forEach(section => {
      let visibleCards = 0;

      section.querySelectorAll(".resource-card").forEach(card => {
        const cardFormats = (card.dataset.formats || "").split(" ");
        const show = selectedFilter === "all" || cardFormats.includes(selectedFilter);
        card.hidden = !show;
        if (show) visibleCards++;
      });

      // "Try on your own" strips aren't a format, so only show them unfiltered.
      section.querySelectorAll(".resource-tools").forEach(tools => {
        tools.hidden = selectedFilter !== "all";
      });

      section.hidden = visibleCards === 0;
      totalVisible += visibleCards;
    });

    // a topic with nothing left can't be jumped to
    categoryTabs.forEach(tab => {
      const section = sectionFor(tab.dataset.category);
      tab.disabled = Boolean(section && section.hidden);
    });

    if (resourceStatus) {
      if (selectedFilter === "all") resourceStatus.textContent = "";
      else if (totalVisible === 0) resourceStatus.textContent = "No matching resources. Try another format, or choose Everything.";
      else resourceStatus.textContent = `Showing ${totalVisible} ${totalVisible === 1 ? "resource" : "resources"}.`;
    }

    updateActiveTab();
  }

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedFilter = button.dataset.filter;
      setUrlParam("format", selectedFilter);
      updateFormatFilter();
    });
  });

  // ----- jump to a topic -----

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Distance from the top of the screen where a section counts as "being read".
  function readingLine() {
    return (tabBar ? tabBar.offsetHeight : 0) + 24;
  }

  function scrollToCategory(category, smooth) {
    const target = category === "all" ? resourceTop : sectionFor(category);
    if (!target) return;
    const offset = category === "all" ? (tabBar ? tabBar.offsetHeight : 0) : readingLine() - 8;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: smooth && !reduceMotion.matches ? "smooth" : "auto" });
  }

  // focus the topic heading after a jump
  function focusCategory(category) {
    const section = sectionFor(category);
    const heading = section && section.querySelector("h2");
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  // last tab clicked, used at the bottom of the page
  let clickedCategory = null;

  categoryTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const category = tab.dataset.category;
      clickedCategory = category;
      setUrlParam("category", category);
      scrollToCategory(category, true);
      focusCategory(category);
    });
  });

  // ----- active tab while scrolling -----

  function updateActiveTab() {
    const visibleSections = [...resourceSections].filter(section => !section.hidden);
    let current = "all";
    visibleSections.forEach(section => {
      if (section.getBoundingClientRect().top <= readingLine()) current = section.dataset.category;
    });

    // last topic can't reach the top, so use it at the bottom unless a visible topic was just clicked
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom && window.scrollY > 0 && visibleSections.length) {
      const clicked = clickedCategory && sectionFor(clickedCategory);
      const clickedOnScreen = clicked && !clicked.hidden && clicked.getBoundingClientRect().top < window.innerHeight;
      current = clickedOnScreen ? clickedCategory : visibleSections[visibleSections.length - 1].dataset.category;
    }

    categoryTabs.forEach(tab => {
      const active = tab.dataset.category === current;
      const changed = active && !tab.classList.contains("active");
      tab.classList.toggle("active", active);
      if (active) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
      if (changed) keepTabInView(tab);
    });
  }

  // keep the active tab visible in the sideways-scrolling tab row
  function keepTabInView(tab) {
    const row = tab.parentElement;
    const tabBox = tab.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    if (tabBox.left < rowBox.left) row.scrollLeft -= rowBox.left - tabBox.left + 16;
    else if (tabBox.right > rowBox.right) row.scrollLeft += tabBox.right - rowBox.right + 16;
  }

  let scrollQueued = false;
  window.addEventListener("scroll", () => {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(() => {
      scrollQueued = false;
      updateActiveTab();
    });
  });
  window.addEventListener("resize", updateActiveTab);

  updateFormatFilter();

  // jump to the ?category= topic, except on Back / reload
  const navigation = performance.getEntriesByType("navigation")[0];
  const returning = navigation && (navigation.type === "back_forward" || navigation.type === "reload");
  const startSection = sectionFor(params.get("category"));

  if (startSection && !startSection.hidden && !returning) {
    const startCategory = startSection.dataset.category;
    scrollToCategory(startCategory, false);
    const jumpedTo = window.scrollY;
    // jump again after images load, unless the reader has scrolled
    window.addEventListener("load", () => {
      if (window.scrollY === jumpedTo) scrollToCategory(startCategory, false);
    }, { once: true });
  }
}

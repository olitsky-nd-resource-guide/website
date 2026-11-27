// =================================
// MY RESOURCES (my-resources.html)
// =================================
// Shows the saved cards, newest first.
//
// Markup hooks:
//   [data-saved-list]      heading + grid, shown once something is saved
//   [data-saved-results]   a .resource-grid the saved cards go in
//   [data-saved-count]     "(3)" after the heading
//   [data-saved-status]    live region for loading and errors
//   [data-saved-more]      "Find more to save" tile, moved to the end of the grid
//   [data-saved-empty]     shown when nothing is saved
//
// Un-saving a card here leaves it on the page until the next visit, so a
// mis-click can be undone and focus doesn't jump.

(function () {
  const results = document.querySelector("[data-saved-results]");
  if (!results) return;

  const list = document.querySelector("[data-saved-list]");
  const count = document.querySelector("[data-saved-count]");
  const status = document.querySelector("[data-saved-status]");
  const more = document.querySelector("[data-saved-more]");
  const empty = document.querySelector("[data-saved-empty]");
  let shown = [];

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function showEmpty() {
    if (list) list.hidden = true;
    if (empty) empty.hidden = false;
  }

  function updateCount() {
    const saved = new Set(window.StudentHelpGuide.getSavedResources());
    const kept = shown.filter(resource => saved.has(resource.id)).length;
    if (count) count.textContent = `(${kept})`;
  }

  // saved IDs are in the order they were saved
  const savedIds = window.StudentHelpGuide.getSavedResources().reverse();
  if (!savedIds.length) {
    showEmpty();
    return;
  }

  if (list) list.hidden = false;
  setStatus("Loading your saved resources...");

  window.StudentHelpGuide.loadResources()
    .then(({ resources }) => {
      // skip IDs for resources that have since been taken off the site
      shown = savedIds
        .map(id => resources.find(resource => resource.id === id))
        .filter(Boolean);
      if (!shown.length) {
        showEmpty();
        return;
      }
      window.StudentHelpGuide.renderCards(results, shown);
      if (more) {
        results.append(more);
        more.hidden = false;
      }
      setStatus("");
      updateCount();
      document.addEventListener("savedresourceschange", updateCount);
    })
    .catch(() => {
      setStatus("Sorry, your saved resources couldn't load. Try refreshing the page.");
    });
})();

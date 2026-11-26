// =================================
// MY RESOURCES (my-resources.html)
// =================================
// Shows the saved cards, newest first.
//
// Markup hooks:
//   [data-saved-results]   a .resource-grid the saved cards go in
//   [data-saved-status]    live region for the count
//   [data-saved-empty]     shown when nothing is saved
//
// Un-saving a card here leaves it on the page until the next visit, so a
// mis-click can be undone and focus doesn't jump.

(function () {
  const results = document.querySelector("[data-saved-results]");
  if (!results) return;

  const status = document.querySelector("[data-saved-status]");
  const empty = document.querySelector("[data-saved-empty]");
  let shown = [];

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function showEmpty() {
    results.replaceChildren();
    if (empty) empty.hidden = false;
    setStatus("");
  }

  function countText(count) {
    return `${count} saved ${count === 1 ? "resource" : "resources"}.`;
  }

  function updateCount() {
    const saved = new Set(window.StudentHelpGuide.getSavedResources());
    const count = shown.filter(resource => saved.has(resource.id)).length;
    const removed = shown.length - count;
    setStatus(removed
      ? `${countText(count)} Removed ones stay here until you leave this page.`
      : countText(count));
  }

  // saved IDs are in the order they were saved
  const savedIds = window.StudentHelpGuide.getSavedResources().reverse();
  if (!savedIds.length) {
    showEmpty();
    return;
  }

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
      updateCount();
      document.addEventListener("savedresourceschange", updateCount);
    })
    .catch(() => {
      setStatus("Sorry, your saved resources couldn't load. Try refreshing the page.");
    });
})();

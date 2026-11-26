// =================================
// RESOURCE CARDS
// =================================
// Loads the resource cards from all-resources.html so other pages can show them.
//
//   StudentHelpGuide.loadResources()  -> Promise of { resources, categories }
//     resources:  [{ id, title, provider, description, keywords, formats, categories, card }]
//     keywords comes from data-keywords on the card: everyday words for search, not shown
//     categories: [{ id, name, description, url, count }]
//   StudentHelpGuide.renderCards(container, resources)
//     puts copies of the cards in container (use a .resource-grid)

(function () {
  // relative to this file so it works from pages in subfolders
  const siteRoot = new URL("../", document.currentScript.src);
  const allResourcesUrl = new URL("all-resources.html", siteRoot);

  let loading = null;
  let sprite = null;

  function text(el) {
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function words(value) {
    return (value || "").split(/\s+/).filter(Boolean);
  }

  function readCategories(doc) {
    return [...doc.querySelectorAll(".resource-category")].map(section => {
      const url = new URL(allResourcesUrl);
      url.searchParams.set("category", section.dataset.category);
      return {
        id: section.dataset.category,
        name: text(section.querySelector("h2")),
        description: text(section.querySelector(".resource-category__heading p")),
        url: url.href,
        count: 0
      };
    });
  }

  function readResources(doc, categories) {
    return [...doc.querySelectorAll(".resource-category .resource-card")].map(card => {
      // main section first, then any data-also-in copies
      const home = card.closest(".resource-category").dataset.category;
      const cardCategories = [home, ...words(card.dataset.alsoIn)];
      cardCategories.forEach(id => {
        const category = categories.find(c => c.id === id);
        if (category) category.count++;
      });

      return {
        id: card.dataset.resourceId,
        title: text(card.querySelector(".resource-card__title")),
        provider: text(card.querySelector(".resource-card__provider")),
        description: text(card.querySelector(".resource-card__desc")),
        keywords: card.dataset.keywords || "",
        formats: words(card.dataset.formats),
        categories: cardCategories,
        card
      };
    });
  }

  function loadResources() {
    if (!loading) {
      loading = fetch(allResourcesUrl)
        .then(response => {
          if (!response.ok) throw new Error("Couldn't load " + allResourcesUrl);
          return response.text();
        })
        .then(html => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          sprite = doc.querySelector(".icon-sprite");
          const categories = readCategories(doc);
          const resources = readResources(doc, categories);
          return { resources, categories };
        });
    }
    return loading;
  }

  // Card icons point at <symbol>s in the sprite on all-resources.html
  function addMissingIcons() {
    if (!sprite) return;
    let pageSprite = document.querySelector(".icon-sprite");
    if (!pageSprite) {
      pageSprite = document.importNode(sprite, false);
      document.body.prepend(pageSprite);
    }
    sprite.querySelectorAll("symbol").forEach(symbol => {
      if (!document.getElementById(symbol.id)) pageSprite.appendChild(document.importNode(symbol, true));
    });
  }

  // Links in the cards are written relative to all-resources.html.
  function fixLinks(card) {
    card.querySelectorAll("a[href]").forEach(link => {
      const href = link.getAttribute("href");
      if (!href.startsWith("#")) link.href = new URL(href, allResourcesUrl).href;
    });
    card.querySelectorAll("img[src]").forEach(img => {
      img.src = new URL(img.getAttribute("src"), allResourcesUrl).href;
    });
  }

  function renderCards(container, resources) {
    addMissingIcons();
    container.replaceChildren(...resources.map(resource => {
      const card = document.importNode(resource.card, true);
      card.removeAttribute("data-also-in");
      card.hidden = false;
      fixLinks(card);
      return card;
    }));
    if (window.StudentHelpGuide.syncCards) window.StudentHelpGuide.syncCards();
  }

  window.StudentHelpGuide = window.StudentHelpGuide || {};
  window.StudentHelpGuide.loadResources = loadResources;
  window.StudentHelpGuide.renderCards = renderCards;
  window.StudentHelpGuide.allResourcesUrl = allResourcesUrl.href;
})();

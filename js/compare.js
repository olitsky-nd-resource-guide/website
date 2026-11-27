// =================================
// COMPARE (compare.html)
// =================================
// Shows the resources ticked with "Compare" (see COMPARE in global.js) side
// by side. Every row comes from the card or the resource's own page; a page
// that doesn't say something shows "Not listed".
//
// Markup hooks:
//   [data-compare-back] [data-compare-back-label]  link back to where they were picked
//   [data-compare-status]   live region for loading and errors
//   [data-compare-wrap]     scroll region around [data-compare-table]
//   [data-compare-closing]  shown with the table (phone hint, closing line)
//   [data-compare-empty]    shown when there aren't 2 resources to compare

(function () {
  const table = document.querySelector("[data-compare-table]");
  if (!table) return;

  const status = document.querySelector("[data-compare-status]");
  const wrap = document.querySelector("[data-compare-wrap]");
  const afterLoad = document.querySelectorAll("[data-compare-closing]");
  const empty = document.querySelector("[data-compare-empty]");
  const { items, from } = window.StudentHelpGuide.getCompare();

  const KINDS = {
    "one-on-one": { label: "One-on-one", color: "red" },
    "group": { label: "Group", color: "blue" },
    "self-guided": { label: "On your own", color: "blue" }
  };

  // Back to the page they were picked on, if it's one of ours.
  const back = document.querySelector("[data-compare-back]");
  if (back && from && from.href && new URL(from.href).origin === window.location.origin) {
    back.href = from.href;
    if (from.label) back.querySelector("[data-compare-back-label]").textContent = "Back to " + from.label;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function notListed() {
    return el("span", "compare-table__none", "Not listed");
  }

  function fact(details, label) {
    const found = details.facts.find(item => item.label === label);
    return found ? found.value : "";
  }

  function arrowLink(text, href, external) {
    const link = el("a", "btn-primary-arrow btn-primary-arrow--sm");
    link.href = href;
    if (external) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    const label = el("span", "btn-primary-arrow__text", text);
    if (external) label.append(el("span", "sr-only", " (opens in a new tab)"));
    link.append(label);
    link.insertAdjacentHTML("beforeend", '<span class="btn-primary-arrow__icon" aria-hidden="true"><svg focusable="false"><use href="#icon-arrow"/></svg></span>');
    return link;
  }

  function headerCell(resource) {
    const th = el("th");
    th.scope = "col";
    const kind = Object.keys(KINDS).find(format => resource.formats.includes(format));
    if (kind) th.append(el("span", `mini-card__eyebrow mini-card__eyebrow--${KINDS[kind].color}`, KINDS[kind].label));
    const title = el("a", "compare-table__title", resource.title);
    title.href = new URL(resource.card.querySelector(".next-steps-link").getAttribute("href"), window.StudentHelpGuide.allResourcesUrl).href;
    th.append(title, el("span", "compare-table__provider", resource.provider));
    return th;
  }

  // Facts other than Format and Where, like "How long" or "Pay back"
  function otherFacts(details) {
    const rest = details.facts.filter(item => item.label !== "Format" && item.label !== "Where");
    if (!rest.length) return notListed();
    const list = el("ul", "compare-table__facts");
    rest.forEach(item => {
      const li = el("li");
      li.append(el("strong", "", item.label + ": "), item.value);
      list.append(li);
    });
    return list;
  }

  function nextStep(resource, details) {
    const cell = el("div", "compare-table__next");
    if (details.action) cell.append(arrowLink(details.action.text, details.action.href, details.action.external));
    const more = el("a", "compare-table__more", "See all the steps");
    more.href = details.url || window.StudentHelpGuide.allResourcesUrl;
    more.append(el("span", "sr-only", ": " + resource.title));
    cell.append(more);
    return cell;
  }

  const ROWS = [
    ["What it is", resource => resource.description],
    ["Format", (resource, details) => fact(details, "Format")],
    ["Where", (resource, details) => fact(details, "Where")],
    ["Good to know", (resource, details) => otherFacts(details)],
    ["How you sign up", (resource, details) => details.firstStep],
    ["Before you start", (resource, details) => details.before],
    ["Next step", nextStep]
  ];

  function buildTable(resources, allDetails) {
    const caption = el("caption", "sr-only", "Comparing " + resources.map(resource => resource.title).join(", "));
    const headRow = el("tr");
    headRow.append(el("td"), ...resources.map(headerCell));
    const head = el("thead");
    head.append(headRow);

    const body = el("tbody");
    ROWS.forEach(([label, value]) => {
      const row = el("tr");
      const th = el("th", "", label);
      th.scope = "row";
      row.append(th);
      resources.forEach((resource, i) => {
        const cell = el("td");
        const content = value(resource, allDetails[i]);
        cell.append(content || notListed());
        row.append(cell);
      });
      body.append(row);
    });

    table.replaceChildren(caption, head, body);
  }

  function showEmpty(message) {
    status.textContent = message;
    empty.hidden = false;
  }

  if (items.length < 2) {
    showEmpty("Nothing to compare yet.");
    return;
  }

  window.StudentHelpGuide.loadResources()
    .then(({ resources }) => {
      // skip picks that have since been taken off the site
      const picked = items
        .map(item => resources.find(resource => resource.id === item.id))
        .filter(Boolean);
      if (picked.length < 2) {
        showEmpty("Some of your picks are no longer in the guide, so there's nothing to compare.");
        return;
      }
      return Promise.all(picked.map(window.StudentHelpGuide.loadDetails)).then(allDetails => {
        buildTable(picked, allDetails);
        status.textContent = "";
        wrap.hidden = false;
        afterLoad.forEach(node => { node.hidden = false; });
      });
    })
    .catch(() => {
      status.textContent = "Sorry, the comparison couldn't load. Try refreshing the page.";
    });
})();

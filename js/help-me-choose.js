// =================================
// HELP ME CHOOSE (help-me-choose.html)
// =================================
// Two questions, then up to 3 suggested resources.
//
// Markup hooks:
//   [data-choose-step="1|2|3"]       one block per screen, only one is shown
//   [data-choose-answer="need"]      buttons in step 1, value in data-value
//                                    (a category id, or "unsure")
//   [data-choose-answer="format"]    buttons in step 2, value in data-value
//                                    ("one-on-one", "group", "self-guided" or "unsure")
//   [data-choose-progress="1|2|3"]   stepper items, current one gets aria-current="step",
//                                    earlier ones get .is-done
//   [data-choose-back]               goes back one screen
//   [data-choose-restart]            back to the first question
//   [data-choose-results]            container the suggestion cards go in
//   [data-choose-status]             live region for the result message
//
// Answers are kept in history state only, not the URL or localStorage.

(function () {
  const steps = document.querySelectorAll("[data-choose-step]");
  if (!steps.length) return;

  const MAX_SUGGESTIONS = 3;
  const MIX_ORDER = ["one-on-one", "group", "self-guided"];

  const results = document.querySelector("[data-choose-results]");
  const status = document.querySelector("[data-choose-status]");

  let state = window.history.state && window.history.state.step
    ? window.history.state
    : { step: 1, need: null, format: null };

  // ----- picking suggestions -----

  // "Not sure yet": one card from each topic in turn
  function takeTurns(resources, categories) {
    const queues = categories.map(category =>
      resources.filter(resource => resource.categories[0] === category.id));
    const mixed = [];
    while (queues.some(queue => queue.length)) {
      queues.forEach(queue => { if (queue.length) mixed.push(queue.shift()); });
    }
    return mixed;
  }

  function hasFormat(resource, format) {
    return resource.formats.includes(format);
  }

  // Cards that live in this topic first, then ones also listed under it.
  function inTopic(resources, need) {
    const main = resources.filter(resource => resource.categories[0] === need);
    const also = resources.filter(resource => resource.categories.slice(1).includes(need));
    return [...main, ...also];
  }

  // "Show me a mix": one of each kind first, then fill with whatever is next
  function mixOf(pool) {
    const picks = [];
    MIX_ORDER.forEach(kind => {
      const match = pool.find(resource => hasFormat(resource, kind) && !picks.includes(resource));
      if (match) picks.push(match);
    });
    pool.forEach(resource => { if (!picks.includes(resource)) picks.push(resource); });
    return picks.slice(0, MAX_SUGGESTIONS);
  }

  // exact is false when nothing matched the format and a topic mix is shown instead
  function pickSuggestions({ resources, categories }, need, format) {
    const pool = need === "unsure" ? takeTurns(resources, categories) : inTopic(resources, need);
    if (format === "unsure") return { picks: mixOf(pool), exact: true };

    const picks = pool.filter(resource => hasFormat(resource, format)).slice(0, MAX_SUGGESTIONS);
    if (picks.length) return { picks, exact: true };
    return { picks: mixOf(pool), exact: false };
  }

  // ----- suggestion cards -----

  const FORMAT_TAGS = {
    "one-on-one": { label: "One-on-one", art: "art-one-on-one", tint: "red" },
    "group": { label: "Group", art: "art-group", tint: "navy" },
    "self-guided": { label: "On your own", art: "art-self-guided", tint: "red" }
  };

  // The kind of help they asked for if this resource offers it, else its first kind.
  function formatTag(resource, format) {
    const kind = hasFormat(resource, format)
      ? format
      : MIX_ORDER.find(format => hasFormat(resource, format));
    return FORMAT_TAGS[kind] || null;
  }

  // The card's link, with its href made absolute (cards are written relative
  // to all-resources.html).
  function cardLink(resource) {
    const link = resource.card.querySelector(".next-steps-link").cloneNode(true);
    link.href = new URL(link.getAttribute("href"), window.StudentHelpGuide.allResourcesUrl).href;
    return link;
  }

  // Title of step 1 on the resource's own page, or "" when it has no page here
  // (official-site links) or the page has no steps.
  function firstStep(link) {
    if (link.target === "_blank" || new URL(link.href).origin !== location.origin) {
      return Promise.resolve("");
    }
    return fetch(link.href)
      .then(response => (response.ok ? response.text() : ""))
      .then(html => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const title = doc.querySelector(".detail-step__title");
        if (!title) return "";
        title.querySelectorAll(".detail-step__num, .sr-only").forEach(el => el.remove());
        return title.textContent.replace(/\s+/g, " ").trim();
      })
      .catch(() => "");
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function icon(id, className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (className) svg.setAttribute("class", className);
    return svg;
  }

  function suggestionCard(resource, format, link, step) {
    const card = el("article", "choose-card");
    const titleId = "choose-title-" + resource.id;
    card.setAttribute("aria-labelledby", titleId);

    const tag = formatTag(resource, format);
    const art = el("div", "choose-card__art" + (tag && tag.tint === "red" ? " choose-card__art--red" : ""));
    if (tag) art.append(el("span", "choose-card__tag", tag.label));
    art.append(icon(tag ? tag.art : "art-mix"));

    const body = el("div", "choose-card__body");
    const title = el("h2", "choose-card__title", resource.title);
    title.id = titleId;
    body.append(title);
    if (resource.provider) body.append(el("p", "choose-card__provider", resource.provider));

    const why = el("p", "choose-card__why");
    why.append(el("strong", "", "Why it might help."), " " + resource.description);
    body.append(why);

    if (step) {
      const first = el("p", "choose-card__first");
      first.append(icon("icon-flag"), el("strong", "", "First step."), " " + step);
      body.append(first);
    }

    const save = el("button", "save-btn save-btn--dark");
    save.type = "button";
    save.dataset.saveResource = resource.id;
    save.setAttribute("aria-pressed", "false");
    save.append(icon("icon-bookmark"), el("span", "save-btn__label", "Save"));
    save.append(el("span", "sr-only", " " + resource.title));

    const actions = el("div", "choose-card__actions");
    actions.append(link, save);
    body.append(actions);

    card.append(art, body);
    return card;
  }

  // Each visit to step 3 bumps this, so a slow earlier load can't replace newer cards.
  let latestRun = 0;

  function showSuggestions() {
    if (!results) return;
    const run = ++latestRun;
    const { need, format } = state;
    results.replaceChildren();
    if (status) status.textContent = "Finding suggestions...";

    window.StudentHelpGuide.loadResources()
      .then(data => {
        const { picks, exact } = pickSuggestions(data, need, format);
        const links = picks.map(cardLink);
        return Promise.all(links.map(firstStep)).then(steps => {
          if (run !== latestRun) return;
          results.replaceChildren(...picks.map((resource, i) => suggestionCard(resource, format, links[i], steps[i])));
          window.StudentHelpGuide.syncCards();
          if (status) {
            status.textContent = exact
              ? `${picks.length} ${picks.length === 1 ? "suggestion" : "suggestions"} for you.`
              : "Nothing here matched that kind of help, so these are other options for the same need.";
          }
        });
      })
      .catch(() => {
        if (run === latestRun && status) status.textContent = "Sorry, the suggestions couldn't load. Try refreshing the page, or browse all resources.";
      });
  }

  // ----- screens -----

  function render(moveFocus) {
    steps.forEach(step => {
      step.hidden = Number(step.dataset.chooseStep) !== state.step;
    });

    document.querySelectorAll("[data-choose-progress]").forEach(item => {
      const n = Number(item.dataset.chooseProgress);
      if (n === state.step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      item.classList.toggle("is-done", n < state.step);
    });

    // mark the answer picked earlier
    document.querySelectorAll("[data-choose-answer]").forEach(button => {
      button.setAttribute("aria-pressed", String(state[button.dataset.chooseAnswer] === button.dataset.value));
    });

    document.querySelectorAll("[data-choose-back]").forEach(button => {
      button.hidden = state.step === 1;
    });

    if (state.step === 3) showSuggestions();

    // focus the new question
    if (moveFocus) {
      const heading = document.querySelector(`[data-choose-step="${state.step}"] h1, [data-choose-step="${state.step}"] h2`);
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }

  function goTo(nextState) {
    state = nextState;
    window.history.pushState(state, "");
    render(true);
  }

  document.querySelectorAll("[data-choose-answer]").forEach(button => {
    button.addEventListener("click", () => {
      const question = button.dataset.chooseAnswer;
      goTo({ ...state, [question]: button.dataset.value, step: state.step + 1 });
    });
  });

  document.querySelectorAll("[data-choose-back]").forEach(button => {
    button.addEventListener("click", () => window.history.back());
  });

  document.querySelectorAll("[data-choose-restart]").forEach(button => {
    button.addEventListener("click", () => goTo({ step: 1, need: null, format: null }));
  });

  window.addEventListener("popstate", event => {
    state = event.state && event.state.step ? event.state : { step: 1, need: null, format: null };
    render(true);
  });

  window.history.replaceState(state, "");
  render(false);
})();

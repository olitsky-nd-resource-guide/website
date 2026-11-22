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
//   [data-choose-progress="1|2|3"]   stepper items, current one gets aria-current="step"
//   [data-choose-back]               goes back one screen
//   [data-choose-restart]            back to the first question
//   [data-choose-results]            a .resource-grid the suggestions go in
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

  function showSuggestions() {
    if (!results) return;
    results.replaceChildren();
    if (status) status.textContent = "Finding suggestions...";

    window.StudentHelpGuide.loadResources()
      .then(data => {
        const { picks, exact } = pickSuggestions(data, state.need, state.format);
        window.StudentHelpGuide.renderCards(results, picks);
        if (status) {
          status.textContent = exact
            ? `${picks.length} ${picks.length === 1 ? "suggestion" : "suggestions"} for you.`
            : "Nothing here matched that kind of help, so these are other options for the same need.";
        }
      })
      .catch(() => {
        if (status) status.textContent = "Sorry, the suggestions couldn't load. Try refreshing the page, or browse all resources.";
      });
  }

  // ----- screens -----

  function render(moveFocus) {
    steps.forEach(step => {
      step.hidden = Number(step.dataset.chooseStep) !== state.step;
    });

    document.querySelectorAll("[data-choose-progress]").forEach(item => {
      if (Number(item.dataset.chooseProgress) === state.step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
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

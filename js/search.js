// =================================
// SEARCH RESULTS (search.html?q=...)
// =================================
// Scores cards by the words typed, plus everyday words for each topic.
//
// Markup hooks:
//   [data-search-input]        search box, filled in with the current search
//   [data-search-topic]        "Closest topic" box, hidden when there isn't one
//     [data-search-topic-name] [data-search-topic-desc] [data-search-topic-link]
//   [data-search-status]       live region for the result message
//   [data-search-results]      a .resource-grid the matches go in

(function () {
  const results = document.querySelector("[data-search-results]");
  if (!results) return;

  const MAX_RESULTS = 3;

  // Everyday words for each topic. Partial words match ("procrastinat").
  const TOPIC_WORDS = {
    classes: ["class", "course", "study", "studying", "exam", "test", "quiz", "homework", "assignment",
      "tutor", "writing", "essay", "paper", "presentation", "grade", "lecture", "professor", "behind",
      "accommodat", "notes", "reading", "english", "language"],
    planning: ["procrastinat", "putting", "put", "focus", "distract", "deadline", "plan", "schedule",
      "time", "routine", "start", "organiz", "motivat", "late", "forget", "habit", "productiv"],
    feelings: ["stress", "anxious", "anxiety", "worry", "worried", "sad", "depress", "lonely", "talk",
      "counsel", "therap", "overwhelm", "panic", "mental", "feel", "upset", "cry", "sleep", "calm"],
    health: ["sick", "ill", "doctor", "nurse", "health", "food", "hungry", "grocer", "meal", "eat",
      "money", "rent", "pay", "loan", "cost", "afford", "insurance", "prescript", "medic", "diet",
      "nutrition"],
    career: ["job", "intern", "career", "resume", "interview", "work", "employ", "hire", "hiring",
      "workplace", "boss", "networking"],
    community: ["friend", "meet", "people", "belong", "club", "community", "connect", "social",
      "event", "mentor", "housing", "roommate"]
  };

  // Words that don't help tell resources apart.
  const STOPWORDS = new Set(("a an and are as at be but by can do for from get have help how i i'm im " +
    "in into is it its keep me my need of on or so some something that the thing things this to " +
    "too up want what with would you your about really just off out go going got").split(" "));

  // ----- matching -----

  function toWords(value) {
    return value.toLowerCase().replace(/[^a-z0-9']+/g, " ").split(" ").filter(Boolean);
  }

  function queryTerms(query) {
    return toWords(query).filter(word => word.length > 1 && !STOPWORDS.has(word));
  }

  // "deadlines" matches "deadline", "studying" matches "study"
  function sameWord(term, word) {
    if (term.length < 3 || word.length < 3) return term === word;
    return word.startsWith(term) || term.startsWith(word);
  }

  function mentions(fieldWords, term) {
    return fieldWords.some(word => sameWord(term, word));
  }

  function topicScores(terms) {
    const scores = {};
    Object.entries(TOPIC_WORDS).forEach(([topic, topicWords]) => {
      scores[topic] = terms.filter(term => topicWords.some(word => sameWord(term, word))).length;
    });
    return scores;
  }

  function scoreResource(resource, terms, topics) {
    const title = toWords(resource.title);
    const provider = toWords(resource.provider);
    const description = toWords(resource.description);
    const keywords = toWords(resource.keywords);

    let score = 0;
    terms.forEach(term => {
      if (mentions(title, term)) score += 3;
      if (mentions(provider, term)) score += 2;
      if (mentions(description, term)) score += 1;
      if (mentions(keywords, term)) score += 2;
    });
    // the card's main topic counts more than topics it is also listed under
    resource.categories.forEach((category, index) => {
      score += (index === 0 ? 2 : 1) * (topics[category] || 0);
    });
    return score;
  }

  function search(data, query) {
    const terms = queryTerms(query);
    const topics = topicScores(terms);

    const matches = data.resources
      .map((resource, order) => ({ resource, order, score: scoreResource(resource, terms, topics) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, MAX_RESULTS)
      .map(match => match.resource);

    // closest topic: most keyword hits, else the best match's topic
    const bestTopic = Object.keys(topics).sort((a, b) => topics[b] - topics[a])[0];
    const topicId = topics[bestTopic] > 0 ? bestTopic : matches[0] && matches[0].categories[0];
    const topic = data.categories.find(category => category.id === topicId) || null;

    return { matches, topic };
  }

  // ----- page -----

  const query = (new URLSearchParams(window.location.search).get("q") || "").trim();
  const input = document.querySelector("[data-search-input]");
  const status = document.querySelector("[data-search-status]");
  const topicBox = document.querySelector("[data-search-topic]");

  if (input) input.value = query;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function showTopic(topic) {
    if (!topicBox) return;
    topicBox.hidden = !topic;
    if (!topic) return;
    topicBox.querySelector("[data-search-topic-name]").textContent = topic.name;
    topicBox.querySelector("[data-search-topic-desc]").textContent = topic.description;
    const link = topicBox.querySelector("[data-search-topic-link]");
    link.href = topic.url;
    link.textContent = `See all ${topic.count} options`;
  }

  if (!query) {
    setStatus("Type what you need help with, in your own words.");
    return;
  }

  setStatus("Searching...");

  window.StudentHelpGuide.loadResources()
    .then(data => {
      const { matches, topic } = search(data, query);
      showTopic(topic);
      window.StudentHelpGuide.renderCards(results, matches);

      if (matches.length) {
        setStatus(`${matches.length} ${matches.length === 1 ? "option matches" : "options match"} “${query}”.`);
      } else {
        setStatus(`Nothing matched “${query}”. Try different words, answer 2 quick questions, or browse all resources.`);
      }
    })
    .catch(() => {
      setStatus("Sorry, search couldn't load. Try refreshing the page, or browse all resources.");
    });
})();

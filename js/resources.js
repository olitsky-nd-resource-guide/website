/*
 * Loads data/resources.json and gives the rest of the site simple lookups. 
 *
 * Usage in any page:
 *   <script src="js/resources.js"></script>
 *   <script>
 *     ResourceData.load().then(function () {
 *       var r = ResourceData.byId("caps-initial-consultation");
 *       var list = ResourceData.byNeed("mental-health");
 *     });
 *   </script>
 *
 * Note: fetch() needs the site to be served over http(s). It works on
 * GitHub Pages and with a local server (e.g. VS Code Live Server or
 * `python3 -m http.server`), but not when opening index.html as a file.
 */
(function () {
  "use strict";

  var DATA_URL = "data/resources.json";

  var REQUIRED = [
    "id", "officialName", "provider", "kind", "summary", "whoFor",
    "needTags", "format", "steps", "contacts", "prepare",
    "sourceUrls", "lastVerified", "status"
  ];

  var all = [];

  // Light checks so content mistakes show up in the browser console.
  // The full rules live in data/resource.schema.json.
  function check(record, index) {
    var problems = [];
    REQUIRED.forEach(function (field) {
      if (record[field] === undefined) problems.push("missing " + field);
    });
    if (record.kind === "space" && !record.space) problems.push("space record needs a space object");
    if (record.status === "active" && Array.isArray(record.steps) && record.steps.length === 0) {
      problems.push("active record has no steps");
    }
    if (problems.length) {
      console.warn("resources.json item " + index + " (" + (record.id || "no id") + "): " + problems.join("; "));
    }
    return problems.length === 0;
  }

  function isExternal(url) {
    try {
      return new URL(url, window.location.href).host !== window.location.host;
    } catch (e) {
      return false;
    }
  }

  function daysSince(isoDate) {
    var then = new Date(isoDate + "T00:00:00");
    return Math.floor((Date.now() - then.getTime()) / 86400000);
  }

  window.ResourceData = {
    load: function () {
      return fetch(DATA_URL)
        .then(function (res) {
          if (!res.ok) throw new Error("Could not load " + DATA_URL + " (" + res.status + ")");
          return res.json();
        })
        .then(function (records) {
          all = records.filter(check);
          return window.ResourceData.visible();
        });
    },

    // Only records students should see (unverified and discontinued are hidden).
    visible: function () {
      return all.filter(function (r) { return r.status === "active"; });
    },

    byId: function (id) {
      return window.ResourceData.visible().find(function (r) { return r.id === id; }) || null;
    },

    byNeed: function (tag) {
      return window.ResourceData.visible().filter(function (r) { return r.needTags.indexOf(tag) !== -1; });
    },

    // Matches official names and aliases, so old names like "Neurospicy" still work.
    search: function (text) {
      var q = text.trim().toLowerCase();
      if (!q) return [];
      return window.ResourceData.visible().filter(function (r) {
        var names = [r.officialName, r.summary].concat(r.aliases || []);
        return names.some(function (n) { return n.toLowerCase().indexOf(q) !== -1; });
      });
    },

    // US3: mark links that leave the guide. US6 + audit: flag stale records.
    isExternal: isExternal,
    isStale: function (record, maxDays) {
      return daysSince(record.lastVerified) > (maxDays || 120);
    }
  };
})();

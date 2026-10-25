# Resource data (KAN-28)

Every resource and space on the site comes from one file, `data/resources.json`. Pages read it with `js/resources.js`. No build step or libraries: it's plain HTML, CSS and JavaScript, so it runs on GitHub Pages as is.

## Files

| File | What it is |
| --- | --- |
| `data/resources.json` | The content: one record per resource or space. 5 sample records to start. |
| `data/resource.schema.json` | The rules for a record: which fields exist, which are required, allowed values. |
| `js/resources.js` | Loads the JSON and gives pages `load()`, `byId()`, `byNeed()`, `search()`, `isExternal()`, `isStale()`. |

## Using it in a page

```html
<script src="js/resources.js"></script>
<script>
  ResourceData.load().then(function () {
    var caps = ResourceData.byId("caps-initial-consultation");
    var mentalHealth = ResourceData.byNeed("mental-health");
  });
</script>
```

## Adding or editing a resource

1. Copy an existing record in `resources.json` and change the values.
2. Required for every record: `id`, `officialName`, `provider`, `kind`, `summary`, `whoFor`, `needTags`, `format`, `steps`, `contacts`, `prepare`, `sourceUrls`, `lastVerified`, `status`.
3. Write `steps` as short actions in order. Put sample call or email words in `script`.
4. Set `lastVerified` to the day you checked the official page, and list that page in `sourceUrls`.
5. Not sure something is still running? Set `status` to `"unverified"`. It stays in the file but is hidden from the site. Put the question in `internalNotes`.
6. Check your edit: open the site and look for warnings in the browser console.

## Need tags

`needTags` are placeholders until the need categories are final (KAN-25): `academics`, `accommodations`, `mental-health`, `executive-functioning`, `community`, `rest-and-recharge`, `career`. Rename them in one pass once the categories are set.

## Running it locally

`fetch()` needs a web server, so opening `index.html` by double-clicking won't load the data. Use VS Code's Live Server extension, or run `python3 -m http.server` in the repo folder and open http://localhost:8000.

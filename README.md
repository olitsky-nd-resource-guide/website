# Student Help Guide

A guide to CMU support for neurodivergent students, sorted by what a student needs rather than by office. Each resource has its own page that says where to go, what to bring, and what to say.

Our team built it in Fall 2026 as a course project with Professor Andrew Begel, working with Amy Tavares and the Olitsky Career Readiness Program. The team: Amanda Cotumaccio, Nindy Aditya Dewi, Sarah Lu, Delena Pierre, and Zida Anyachebelu.

- Live site: https://olitsky-nd-resource-guide.github.io/website/
- Code: https://github.com/olitsky-nd-resource-guide/website

The site is plain HTML, CSS and JavaScript. GitHub Pages publishes whatever is on the `main` branch whenever the repository gets updated, usually within a minute or two.

## Making a small change

Small changes, such as updating a phone number, email, hours, or a sentence, can be done on GitHub in the browser:

1. Open the file (see "Where things are" below).
2. Click the pencil icon, find the text, and change it.
3. Click "Commit changes" and add a short note about what you changed.

Check the live site a couple of minutes later. If something looks broken, the file's "History" on GitHub lets you see and undo the last change.

One thing to watch for: a resource's details appear in two places. First, its own page which has everything. Second, its card, in `all-resources.html`, has the short version: the name, office, one-line description, and format. If you change a resource, remember to change the card, too.

## Where things are

| What you see | File |
| --- | --- |
| Home | `index.html` |
| Browse by need, and every resource card | `all-resources.html` |
| A resource's own page | the folder for its topic, for example `Feelings, stress and mental health pages/mindfulness-room.html` |
| Help me choose | `help-me-choose.html` |
| Search results | `search.html` |
| Compare | `compare.html` |
| My Resources | `my-resources.html` |
| Urgent help | `urgent-help.html` |
| About, Acronyms, Who you'll meet, Privacy | `about.html`, `acronyms.html`, `who-youll-meet.html`, `privacy.html` |
| Colors, spacing and layout | `styles.css` |
| Pictures | `images/` |

The header and footer are copied into every page. Changing a footer link means changing it in every file. Search the repository for the old text to find them all.

## Adding or removing a resource

To add one:

1. In its topic folder, copy the page most like it and rename the copy.
2. Replace the content: name, description, steps, contact, where, and the "Write this email" text if it has one.
3. In `all-resources.html`, copy a card in the right topic section and change its text. The card's `data-resource-id` has to match the `data-save-resource` on the page's Save button, and its "See next steps" link has to point at the new page.

To remove one, delete its card from `all-resources.html` and delete its page. Students who saved it won't see an error; it just drops off their list.

Search, Help me choose and Compare all read the cards in `all-resources.html`, so a new card shows up in all three without any other changes.

## Things that work behind the scenes

- **Saved resources (My Resources)** are kept in the student's own browser. Nothing is saved to a server, which means we don't see it, and it also doesn't transfer between devices or save in incognito/private mode. Also, clearing cache/cookies will clear the info as well.
- **Compare picks** only lasts until the browser tab is closed.
- **"Write this email"** opens the student's email app with the message already filled in. The text comes from the email box on that page.
- **Phone links** ask "Call \[number\]?" before dialing. This includes 988 and 911.
- **Emails to the Olitsky Program** all go to atavares@andrew.cmu.edu, each with a short starter message.  

## Previewing changes on your own computer

You only need this for bigger changes. Download the code, open a terminal in the folder and run:

```
python3 -m http.server
```

Then open http://localhost:8000. Opening the files by double-clicking mostly works, but search, Help me choose, Compare and My Resources need this small server to load the cards.

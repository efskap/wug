# wug
lightweight, meme-free online client for wiktionary

Because Wiktionary's mobile site is uncomfy and bl0ated to heck.

- Responsive single page application with caching, written in dependency-free vanilla ES6
- Instead of viewing all languages on one page, you can choose a language from a dropdown, or automatically via a configurable priority list.
- Does not use Wiktionary's CSS or JS, the functionality of the latter being replaced by native HTML5 widgets
  - e.g. `<datalist>` for autocomplete, and `<details>` for collapsible sections.
- A basic page weighs under 10 KB, while Wiktionary's equivalent is 200-300 KB (varies between mobile and desktop versions)

Add it to your browser's smart keywords: `https://wug.dmitry.lol/?%s`

Not yet implemented:

- Search (only autocomplete for now)
- Translation (i.e. automatic redirect to the same word in a target language)

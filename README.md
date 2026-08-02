# The Civilizational Shelf

An interactive Three.js reading companion to Predictive History's [Great Books playlist](https://www.youtube.com/playlist?list=PLREQ8S3NPaQs5tLAZSG163pHGKcwDowVA).

**Live:** [literature.dharmicdata.org](https://literature.dharmicdata.org)

The original Complete Shelf interaction now presents ten editorial volumes spanning all 13 lectures. The four Dante lectures are bound together as a special ninth volume; its final spread reveals the separate 12-part Beijing Dante seminar.

## What is included

- Canonical playlist-linked metadata for all 13 Great Books lectures.
- A public, versioned content API at `/api/catalog`.
- Searchable transcript JSON and plain-text editions for all 13 Great Books videos and all 12 Dante seminar videos.
- Four or more editorial timestamps for every Great Books lecture, linked to the correct moment inside the canonical playlist.
- A content-first model that separates lectures, shelf volumes, and special collections so the catalog can evolve without rewriting the 3D system.
- Netlify deployment and headers configured for `literature.dharmicdata.org`.

Transcripts are derived from YouTube's English automatic captions and are labeled accordingly. Names, quotations, and non-English words should be checked against the video before formal citation.

## Content management

Edit [`content/catalog.source.json`](content/catalog.source.json) to manage the public catalog. A build validates the source captions and produces:

- `/api/catalog.json` — the complete catalog
- `/api/transcripts/:id.json` — timestamped transcript paragraphs
- `/transcripts/:id.txt` — readable transcript edition

See [`docs/content-api.md`](docs/content-api.md) for the schema and endpoint contract.

## Build and verify

```bash
npm test
```

This produces `dist/`, verifies the canonical playlist ID, checks the 10-volume/13-lecture/12-seminar structure, confirms every Great Books lecture has helpful timestamps, and verifies all 25 transcripts.

The browser experience remains self-contained in [`index.html`](index.html), with the catalog loaded from the generated API at startup.

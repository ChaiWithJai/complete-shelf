# Content API

The API is static, public JSON generated at build time. It does not require a database or runtime function, so editorial changes remain reviewable in Git while Netlify can cache the result globally.

## Endpoints

### `GET /api/catalog`

Returns the complete catalog:

- `schemaVersion` — API contract version.
- `site` — publication identity and canonical URL.
- `canonicalPlaylist` — the authoritative Predictive History Great Books playlist.
- `volumes` — the ten objects rendered as books on the shelf.
- `lectures` — the 13 individual videos in canonical playlist order.
- `specialCollections` — hidden or extended collections, currently the 12-part Dante seminar.

The `.json` form, `/api/catalog.json`, is also stable and public.

### `GET /api/volumes/:id/transcript`

Returns a transcript document for a lecture ID. The canonical JSON path is `/api/transcripts/:id.json`.

Each transcript contains:

- the lecture and YouTube source identifiers;
- a machine-caption editorial notice;
- timestamped paragraphs with numeric `start`, formatted `timestamp`, and `text` fields.

Plain-text transcripts are available at `/transcripts/:id.txt`.

## Editorial model

A shelf volume and a lecture are deliberately different records. Most volumes reference one lecture through `lectureIds`; the Dante volume references four. This permits a coherent physical shelf without losing the canonical 13-video sequence.

`easterEggCollectionId` connects a shelf volume to a special collection. The interface reveals that collection only on the final spread of the Dante volume.

## Updating content

1. Update `content/catalog.source.json`.
2. Add the video's English VTT to `content/source-captions/<series>/` using the existing filename convention.
3. Run `npm test`.

The verifier rejects missing transcripts, reordered or noncanonical Great Books links, incomplete timestamps, and an incomplete Dante collection.

import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "dist", "api", "catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(catalog.schemaVersion === "1.0", "Catalog schema version is missing");
assert(catalog.volumes.length === 10, "The shelf must contain ten editorial volumes");
assert(catalog.lectures.length === 13, "The canonical Great Books playlist must contain 13 lectures");
assert(catalog.canonicalPlaylist.youtubeId === "PLREQ8S3NPaQs5tLAZSG163pHGKcwDowVA", "Canonical playlist changed unexpectedly");
assert(catalog.specialCollections.length === 1, "The Dante special collection is missing");
assert(catalog.specialCollections[0].lectures.length === 12, "The Dante seminar must contain 12 lectures");
assert(catalog.volumes.some((volume) => volume.isEasterEgg && volume.lectureIds.length === 4), "The four-part Dante shelf volume is missing");

for (const lecture of catalog.lectures) {
  assert(lecture.youtubeUrl.includes(`list=${catalog.canonicalPlaylist.youtubeId}`), `${lecture.id} is not linked through the canonical playlist`);
  assert(lecture.highlights.length >= 4, `${lecture.id} needs at least four helpful timestamps`);
  assert(lecture.questions?.length === 3, `${lecture.id} must expose the professor's three-question framework`);
  for (const question of lecture.questions) {
    assert(question.prompt?.endsWith("?"), `${lecture.id} has a malformed guiding question`);
    assert(Number.isFinite(question.start) && question.start >= 0, `${lecture.id} has an invalid question timestamp`);
  }
}

const allLectures = [
  ...catalog.lectures,
  ...catalog.specialCollections.flatMap((collection) => collection.lectures)
];
for (const lecture of allLectures) {
  const transcriptPath = path.join(root, "dist", "api", "transcripts", `${lecture.id}.json`);
  await access(transcriptPath);
  const transcript = JSON.parse(await readFile(transcriptPath, "utf8"));
  assert(transcript.paragraphs.length > 20, `${lecture.id} transcript appears incomplete`);
  assert(transcript.sourceUrl === lecture.youtubeUrl, `${lecture.id} transcript source does not match catalog`);
}

const index = await readFile(path.join(root, "dist", "index.html"), "utf8");
for (const required of ["The Civilizational Shelf", "/api/catalog.json", "easter-egg-link", "lecture-questions"]) {
  assert(index.includes(required), `Built site is missing ${required}`);
}

const founderArc = await readFile(path.join(root, "dist", "founders-arc", "index.html"), "utf8");
for (const required of ["This page was retracted", "Return to the shelf", "noindex"]) {
  assert(founderArc.includes(required), `Retracted founder route is missing ${required}`);
}
assert(!founderArc.includes("three.module.js"), "Retracted founder route must not load the 3D shelf runtime");
for (const banned of ["founder-classroom", "founder-breathwork", "founder-studio", "founder-arc-mirror", "founder-ambition"]) {
  assert(!founderArc.includes(banned), `Retracted founder route must not reference ${banned}`);
}
assert(!index.includes("founder"), "Homepage must not carry founder markup, styles, or links while the story is retracted");

console.log(`Verified ${catalog.volumes.length} volumes, ${allLectures.length} transcripts, and canonical playlist links.`);

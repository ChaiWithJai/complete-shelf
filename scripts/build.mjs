import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const apiDir = path.join(dist, "api");
const transcriptApiDir = path.join(apiDir, "transcripts");
const transcriptTextDir = path.join(dist, "transcripts");

function seconds(value) {
  const parts = value.split(":").map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function clock(value) {
  const whole = Math.max(0, Math.floor(value));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function cleanCaption(value) {
  return value
    .replace(/<\d\d:\d\d:\d\d\.\d+>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVtt(source) {
  const blocks = source.replace(/\r/g, "").split(/\n\n+/);
  const phrases = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const timingIndex = lines.findIndex((line) => line.includes(" --> "));
    if (timingIndex < 0) continue;
    const [startValue, endValue] = lines[timingIndex].split(" --> ").map((item) => item.split(" ")[0]);
    const start = seconds(startValue);
    const end = seconds(endValue);
    if (end - start > 0.08) continue;
    const text = cleanCaption(lines.slice(timingIndex + 1).join(" "));
    if (!text || phrases.at(-1)?.text === text) continue;
    phrases.push({ start, text });
  }

  const paragraphs = [];
  for (const phrase of phrases) {
    const current = paragraphs.at(-1);
    if (!current || phrase.start - current.start >= 22 || current.text.length > 420) {
      paragraphs.push({ start: phrase.start, timestamp: clock(phrase.start), text: phrase.text });
      continue;
    }
    current.text += `${/[.!?]$/.test(current.text) ? " " : " "}${phrase.text}`;
  }
  return paragraphs;
}

async function findCaption(series, episode, videoId) {
  const directory = path.join(root, "content", "source-captions", series);
  const prefix = `${String(episode).padStart(2, "0")}-${videoId}`;
  const names = await readdir(directory);
  const name = names.find((item) => item === `${prefix}.en.vtt`)
    || names.find((item) => item.startsWith(prefix) && item.endsWith(".vtt"));
  if (!name) throw new Error(`Missing English captions for ${videoId}`);
  return path.join(directory, name);
}

await rm(dist, { recursive: true, force: true });
await Promise.all([
  mkdir(transcriptApiDir, { recursive: true }),
  mkdir(transcriptTextDir, { recursive: true })
]);

const sourceCatalog = JSON.parse(await readFile(path.join(root, "content", "catalog.source.json"), "utf8"));
const allLectures = [
  ...sourceCatalog.lectures,
  ...sourceCatalog.specialCollections.flatMap((collection) => collection.lectures)
];

for (const lecture of allLectures) {
  const captionPath = await findCaption(lecture.sourceSeries, lecture.episode, lecture.youtubeId);
  const paragraphs = parseVtt(await readFile(captionPath, "utf8"));
  const transcript = {
    schemaVersion: "1.0",
    id: lecture.id,
    title: lecture.title,
    youtubeId: lecture.youtubeId,
    sourceUrl: lecture.youtubeUrl,
    source: "YouTube English automatic captions",
    editorialNotice: "Machine-generated transcript. Names, quotations, and non-English words may contain errors.",
    paragraphs
  };
  await writeFile(
    path.join(transcriptApiDir, `${lecture.id}.json`),
    `${JSON.stringify(transcript, null, 2)}\n`
  );
  const readable = [
    lecture.title,
    lecture.youtubeUrl,
    transcript.editorialNotice,
    "",
    ...paragraphs.map((paragraph) => `[${paragraph.timestamp}] ${paragraph.text}`)
  ].join("\n\n");
  await writeFile(path.join(transcriptTextDir, `${lecture.id}.txt`), `${readable}\n`);
}

const publicCatalog = {
  ...sourceCatalog,
  generatedAt: new Date().toISOString(),
  lectures: sourceCatalog.lectures.map((lecture) => ({
    ...lecture,
    transcriptApiUrl: `/api/transcripts/${lecture.id}.json`,
    transcriptTextUrl: `/transcripts/${lecture.id}.txt`
  })),
  specialCollections: sourceCatalog.specialCollections.map((collection) => ({
    ...collection,
    lectures: collection.lectures.map((lecture) => ({
      ...lecture,
      transcriptApiUrl: `/api/transcripts/${lecture.id}.json`,
      transcriptTextUrl: `/transcripts/${lecture.id}.txt`
    }))
  }))
};

await writeFile(path.join(apiDir, "catalog.json"), `${JSON.stringify(publicCatalog, null, 2)}\n`);
await cp(path.join(root, "index.html"), path.join(dist, "index.html"));
await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
await cp(path.join(root, "_redirects"), path.join(dist, "_redirects"));

console.log(`Built ${publicCatalog.volumes.length} shelf volumes and ${allLectures.length} transcripts.`);

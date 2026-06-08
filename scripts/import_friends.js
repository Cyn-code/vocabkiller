#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const REPO = 'edersoncorbari/friends-scripts';
const TREE_URL = `https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO}/master/`;
const OUTPUT_ROOT = path.join(__dirname, '../public/data/friends');
const EPISODES_DIR = path.join(OUTPUT_ROOT, 'episodes');
const INDEX_FILE = path.join(OUTPUT_ROOT, 'index.json');
const WARNINGS_FILE = path.join(OUTPUT_ROOT, 'parse-warnings.json');
const WINDOWS_1252_ENTITY_MAP = {
  128: '€',
  130: '‚',
  131: 'ƒ',
  132: '„',
  133: '…',
  134: '†',
  135: '‡',
  136: 'ˆ',
  137: '‰',
  138: 'Š',
  139: '‹',
  140: 'Œ',
  142: 'Ž',
  145: '‘',
  146: '’',
  147: '“',
  148: '”',
  149: '•',
  150: '–',
  151: '—',
  152: '˜',
  153: '™',
  154: 'š',
  155: '›',
  156: 'œ',
  158: 'ž',
  159: 'Ÿ'
};

function ensureOk(response, context) {
  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status} ${response.statusText}`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'VocabKiller-Friends-Importer'
    }
  });
  ensureOk(response, `Request to ${url}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'VocabKiller-Friends-Importer'
    }
  });
  ensureOk(response, `Request to ${url}`);
  return response.text();
}

function decodeEntities(text) {
  if (!text) {
    return '';
  }

  return text
    .replace(/&#(\d+);/g, (_, code) => {
      const numericCode = Number(code);
      return WINDOWS_1252_ENTITY_MAP[numericCode] || String.fromCharCode(numericCode);
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtmlToLines(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  content = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '\n');

  const decoded = decodeEntities(content)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return decoded
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function extractTitle(html, fallback) {
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = heading || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const raw = title
    ? decodeEntities(title[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()
    : fallback;

  return raw
    .replace(/^Friends\s*[:\-]\s*/i, '')
    .replace(/^Friends\s+/i, '')
    .replace(/^\d{4}(?:-\d{4})?\s*-\s*/i, '')
    .replace(/^\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*-\s*/i, '')
    .replace(/^The One Where Monica Gets a New Roomate/i, 'The One Where Monica Gets a New Roommate')
    .trim();
}

function parsePathMeta(sourcePath, title) {
  const filename = path.basename(sourcePath, '.html').toLowerCase();
  let season = 0;
  let episodeCode = filename.toUpperCase();
  let id = `friends-${filename.replace(/[^a-z0-9]+/g, '-')}`;

  let match = filename.match(/^(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  if (match) {
    season = Number(match[1]);
    episodeCode = `S${match[1]}E${match[2]}-${match[4]}`;
    id = `s${match[1]}e${match[2]}-${match[4]}`;
    return { id, season, episodeCode, title };
  }

  match = filename.match(/^(\d{2})(\d{2})uncut$/);
  if (match) {
    season = Number(match[1]);
    episodeCode = `S${match[1]}E${match[2]} Uncut`;
    id = `s${match[1]}e${match[2]}-uncut`;
    return { id, season, episodeCode, title };
  }

  match = filename.match(/^(\d{2})(\d{2})$/);
  if (match) {
    season = Number(match[1]);
    episodeCode = `S${match[1]}E${match[2]}`;
    id = `s${match[1]}e${match[2]}`;
  }

  return { id, season, episodeCode, title };
}

function compareEpisodePaths(left, right) {
  const leftMeta = parsePathMeta(left, '');
  const rightMeta = parsePathMeta(right, '');

  if (leftMeta.season !== rightMeta.season) {
    return leftMeta.season - rightMeta.season;
  }

  return left.localeCompare(right, 'en');
}

function isSceneText(text) {
  return (
    /^\[(scene|cut to|time lapse|later|commercial break|opening credits|opening titles|closing credits|the next day|scene continued)/i.test(text) ||
    /^(opening credits|opening titles|closing credits|ending credits|commercial break|end)$/i.test(text) ||
    /^\[.*(scene|cut to|time lapse|commercial break).*\]$/i.test(text)
  );
}

function isActionText(text) {
  return /^\(.*\)$/.test(text) || /^\[.*\]$/.test(text);
}

function isMetadataLine(text) {
  return (
    /^(written by|teleplay by|story by|directed by|transcribed by|additional transcribing by|hosted by|minor additions|minor adjustments|originally written by|with help from|final checking by|transcriber['’]s note|note:|additional note)/i.test(text) ||
    /^friends$/i.test(text) ||
    /^\d{4}(?:-\d{4})?\s+-/i.test(text)
  );
}

function isDialogueCandidate(text) {
  return /^([A-Z][A-Za-z0-9 .,'"&()\/-]{0,80}|[A-Z]{2,}(?:[ A-Z0-9.'&()\/-]{0,80})?):\s*\S/.test(text);
}

function slugifySpeakerLabel(label) {
  return label
    .toLowerCase()
    .replace(/\(v\.o\.\)/g, ' voice over')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitSpeakerLabel(label) {
  const safeLabel = label
    .replace(/,\s*Sr\./gi, ' Sr.')
    .replace(/,\s*Jr\./gi, ' Jr.')
    .replace(/\s*&\s*/g, ' and ');

  if (!/,|\sand\s/i.test(safeLabel)) {
    return [safeLabel.trim()];
  }

  return safeLabel
    .split(/\s*,\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitInlineSceneMarkers(text) {
  const markerPattern = /(.*?)((?:\[(?:Scene|Cut to|Time Lapse|Commercial Break|Opening Credits|Opening Titles|Closing Credits)[^\]]*\]))(.*)/i;
  const match = text.match(markerPattern);

  if (!match) {
    return [text];
  }

  const segments = [];
  if (match[1].trim()) {
    segments.push(match[1].trim());
  }
  if (match[2].trim()) {
    segments.push(match[2].trim());
  }
  if (match[3].trim()) {
    segments.push(...splitInlineSceneMarkers(match[3].trim()));
  }
  return segments;
}

function splitInlineDialogueSegments(label, text) {
  const boundaryPattern = /([.!?]["']?)\s+([A-Z][A-Za-z0-9 .,'"&()\/-]{0,80}|[A-Z]{2,}(?:[ A-Z0-9.'&()\/-]{0,80})?):\s*/g;
  const segments = [];
  let cursor = 0;
  let activeLabel = label;
  let match;

  while ((match = boundaryPattern.exec(text)) !== null) {
    const segmentText = text.slice(cursor, match.index + match[1].length).trim();
    if (segmentText) {
      segments.push({ label: activeLabel, text: segmentText });
    }
    activeLabel = match[2].trim();
    cursor = match.index + match[0].length;
  }

  const trailing = text.slice(cursor).trim();
  if (trailing) {
    segments.push({ label: activeLabel, text: trailing });
  }

  return segments;
}

function parseDialogueLine(text) {
  const match = text.match(/^([A-Z][A-Za-z0-9 .,'"&()\/-]{0,80}|[A-Z]{2,}(?:[ A-Z0-9.'&()\/-]{0,80})?):\s*(.+)$/);
  if (!match) {
    return null;
  }

  const label = match[1].trim().replace(/\s+/g, ' ');
  const segments = splitInlineDialogueSegments(label, match[2].trim());
  return segments.flatMap((segment) =>
    splitInlineSceneMarkers(segment.text).map((part) => ({ label: segment.label, text: part }))
  );
}

function normalizeSpeaker(label) {
  const speakerParts = splitSpeakerLabel(label);
  return {
    speakerLabel: label.replace(/\s+/g, ' ').trim(),
    speakerIds: speakerParts.map(slugifySpeakerLabel)
  };
}

function lineToDisplayText(line) {
  if (!line) {
    return '';
  }
  if (line.type === 'dialogue') {
    return `${line.speakerLabel}: ${line.text}`;
  }
  return line.text;
}

function parseTranscriptLines(rawLines, episodeMeta, warnings) {
  const normalized = [];
  let started = false;

  rawLines.forEach((rawLine, rawIndex) => {
    const fragments = splitInlineSceneMarkers(rawLine);

    fragments.forEach((fragment) => {
      const line = fragment.trim();
      if (!line) {
        return;
      }

      if (!started) {
        if (/^friends(?:\s|:|-)/i.test(line)) {
          return;
        }
        if (isMetadataLine(line)) {
          return;
        }
        if (isSceneText(line) || isActionText(line) || isDialogueCandidate(line)) {
          started = true;
        } else {
          return;
        }
      }

      if (isMetadataLine(line)) {
        return;
      }

      if (isSceneText(line)) {
        normalized.push({ type: 'scene', text: line });
        return;
      }

      if (isActionText(line)) {
        normalized.push({ type: 'action', text: line });
        return;
      }

      const dialogueSegments = parseDialogueLine(line);
      if (dialogueSegments) {
        dialogueSegments.forEach((segment) => {
          if (isSceneText(segment.text)) {
            normalized.push({ type: 'scene', text: segment.text });
            return;
          }

          const speaker = normalizeSpeaker(segment.label);
          normalized.push({
            type: 'dialogue',
            speakerLabel: speaker.speakerLabel,
            speakerIds: speaker.speakerIds,
            text: segment.text
          });
        });
        return;
      }

      warnings.push({
        episodeId: episodeMeta.id,
        sourcePath: episodeMeta.sourcePath,
        lineNumber: rawIndex + 1,
        reason: 'Unparsed fragment downgraded to action',
        raw: line
      });
      normalized.push({ type: 'action', text: line });
    });
  });

  return normalized;
}

function buildCharacterIndex(lines) {
  const characterMap = new Map();

  lines.forEach((line, index) => {
    if (line.type !== 'dialogue') {
      return;
    }

    const speakerParts = splitSpeakerLabel(line.speakerLabel);
    line.speakerIds.forEach((speakerId, speakerIndex) => {
      if (!speakerId) {
        return;
      }

      if (!characterMap.has(speakerId)) {
        characterMap.set(speakerId, {
          id: speakerId,
          label: speakerParts[speakerIndex] || line.speakerLabel,
          lineCount: 0,
          firstLineIndex: index
        });
      }

      characterMap.get(speakerId).lineCount += 1;
    });
  });

  return Array.from(characterMap.values()).sort((left, right) => left.firstLineIndex - right.firstLineIndex);
}

function buildPreview(lines) {
  const previewLines = lines
    .filter((line) => line.type === 'dialogue')
    .slice(0, 3)
    .map(lineToDisplayText);

  return previewLines.join(' ');
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function run() {
  const tree = await fetchJson(TREE_URL);
  const episodePaths = tree.tree
    .map((entry) => entry.path)
    .filter((entryPath) => entryPath.startsWith('season/') && entryPath.endsWith('.html') && entryPath !== 'season/index.html')
    .sort(compareEpisodePaths);

  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(EPISODES_DIR, { recursive: true });

  const warnings = [];
  const seasonBuckets = new Map();

  for (const sourcePath of episodePaths) {
    const sourceUrl = `${RAW_BASE_URL}${sourcePath}`;
    const html = await fetchText(sourceUrl);
    const title = extractTitle(html, sourcePath);
    const meta = {
      ...parsePathMeta(sourcePath, title),
      sourcePath,
      sourceUrl
    };

    const rawLines = stripHtmlToLines(html);
    const lines = parseTranscriptLines(rawLines, meta, warnings);
    const characters = buildCharacterIndex(lines);
    const previewText = buildPreview(lines);

    const episodePayload = {
      id: meta.id,
      season: meta.season,
      episodeCode: meta.episodeCode,
      title: meta.title,
      sourcePath: meta.sourcePath,
      sourceUrl: meta.sourceUrl,
      characters,
      lines
    };

    await writeJson(path.join(EPISODES_DIR, `${meta.id}.json`), episodePayload);

    if (!seasonBuckets.has(meta.season)) {
      seasonBuckets.set(meta.season, []);
    }

    seasonBuckets.get(meta.season).push({
      id: meta.id,
      season: meta.season,
      episodeCode: meta.episodeCode,
      title: meta.title,
      sourcePath: meta.sourcePath,
      speakerCount: characters.length,
      lineCount: lines.length,
      previewText
    });
  }

  const seasons = Array.from(seasonBuckets.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([season, episodes]) => ({
      season,
      episodes
    }));

  await writeJson(INDEX_FILE, {
    generatedAt: new Date().toISOString(),
    sourceRepo: REPO,
    seasonCount: seasons.filter((season) => season.season > 0).length,
    episodeCount: episodePaths.length,
    seasons
  });

  await writeJson(WARNINGS_FILE, {
    generatedAt: new Date().toISOString(),
    warningCount: warnings.length,
    warnings
  });

  console.log(`Imported ${episodePaths.length} Friends transcript files into ${OUTPUT_ROOT}`);
  console.log(`Parse warnings: ${warnings.length}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

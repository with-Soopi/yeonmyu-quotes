// ============================================================
// 오늘의 연뮤 문장 — Scriptable 위젯
// 매일 자정에 바뀌는 연극/뮤지컬 대사 위젯
// ============================================================

// ▼ 여기에 GitHub raw URL을 붙여넣으세요.
//   예: https://raw.githubusercontent.com/<아이디>/<저장소>/main/quotes.json
const JSON_URL = "";

// 대사 폰트: 기본 시스템 폰트(산세리프). 세리프 느낌을 원하면
// 아래를 "georgia"로 바꿔보세요. (iOS 내장 세리프 폰트)
const QUOTE_FONT = "system"; // "system" 또는 "georgia"

const CACHE_FILE = "yeonmyu-quotes-cache.json";

// ── 데이터 로드 (실패 시 캐시 사용) ──────────────────────────
async function loadQuotes() {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
  try {
    if (!JSON_URL) throw new Error("JSON_URL이 비어 있음");
    const req = new Request(JSON_URL);
    req.timeoutInterval = 10;
    const quotes = await req.loadJSON();
    if (!Array.isArray(quotes) || quotes.length === 0) {
      throw new Error("빈 데이터");
    }
    fm.writeString(cachePath, JSON.stringify(quotes)); // 성공 시 캐시 갱신
    return { quotes, fromCache: false };
  } catch (e) {
    if (fm.fileExists(cachePath)) {
      return { quotes: JSON.parse(fm.readString(cachePath)), fromCache: true };
    }
    return { quotes: null, fromCache: false };
  }
}

// ── 날짜 기반 시드 → 오늘의 대사 선택 ────────────────────────
// 같은 날에는 항상 같은 대사가 나온다.
function todaysQuote(quotes) {
  const now = new Date();
  const dateKey =
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  // 간단한 정수 해시 (mulberry32 한 스텝)
  let t = (dateKey + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const seed = (t ^ (t >>> 14)) >>> 0;
  return quotes[seed % quotes.length];
}

function quoteFont(size, weight) {
  if (QUOTE_FONT === "georgia") return new Font("Georgia", size);
  if (weight === "medium") return Font.mediumSystemFont(size);
  return Font.systemFont(size);
}

// ── 위젯 구성 ────────────────────────────────────────────────
function buildWidget(quote, family, fromCache) {
  const w = new ListWidget();
  w.backgroundColor = new Color(quote.color || "#1C1C2E");
  const fg = new Color(quote.textColor || "#FAF6EF");
  const fgDim = new Color((quote.textColor || "#FAF6EF") + "", 0.72);

  const isSmall = family === "small";
  const isLarge = family === "large";
  w.setPadding(isSmall ? 14 : 18, isSmall ? 14 : 18, isSmall ? 12 : 16, isSmall ? 14 : 18);

  // 대사 본문
  let text = quote.text;
  if (isSmall) {
    // 소형: 줄바꿈을 공백으로 합치고 짧게 자름
    const flat = text.replace(/\n+/g, " ");
    text = flat.length > 42 ? flat.slice(0, 42).trim() + "…" : flat;
  }

  const quoteSize = isSmall ? 14 : isLarge ? 21 : 16;
  const body = w.addText(text);
  body.font = quoteFont(quoteSize, "medium");
  body.textColor = fg;
  body.minimumScaleFactor = 0.7;
  body.lineLimit = isSmall ? 4 : isLarge ? 10 : 6;

  w.addSpacer();

  // 하단: 작품명 (+ 중/대형은 장르, 대형은 무드 태그)
  if (isLarge && quote.moods && quote.moods.length > 0) {
    const moods = w.addText(quote.moods.map((m) => "#" + m).join("  "));
    moods.font = Font.systemFont(11);
    moods.textColor = fgDim;
    w.addSpacer(6);
  }

  const footer = w.addStack();
  footer.centerAlignContent();
  const workLabel = isSmall
    ? quote.work
    : `${quote.genre} 〈${quote.work}〉`;
  const work = footer.addText(workLabel);
  work.font = Font.mediumSystemFont(isSmall ? 10 : 12);
  work.textColor = fgDim;
  work.lineLimit = 1;
  work.minimumScaleFactor = 0.8;

  if (!isSmall && quote.song) {
    footer.addSpacer(6);
    const song = footer.addText("· " + quote.song);
    song.font = Font.systemFont(11);
    song.textColor = fgDim;
    song.lineLimit = 1;
    song.minimumScaleFactor = 0.8;
  }

  if (fromCache) {
    footer.addSpacer();
    const off = footer.addText("⌁"); // 오프라인(캐시) 표시
    off.font = Font.systemFont(9);
    off.textColor = fgDim;
  }

  // 다음 자정 이후 새 대사로 갱신
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  w.refreshAfterDate = midnight;
  return w;
}

function buildErrorWidget() {
  const w = new ListWidget();
  w.backgroundColor = new Color("#1C1C2E");
  const t = w.addText(
    "대사를 불러올 수 없어요.\nwidget.js 상단의 JSON_URL을 확인해 주세요."
  );
  t.font = Font.systemFont(12);
  t.textColor = new Color("#FAF6EF");
  return w;
}

// ── 실행 ─────────────────────────────────────────────────────
const { quotes, fromCache } = await loadQuotes();
const family = config.widgetFamily || "medium"; // 앱에서 실행 시 중형 미리보기
const widget = quotes
  ? buildWidget(todaysQuote(quotes), family, fromCache)
  : buildErrorWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  if (family === "small") await widget.presentSmall();
  else if (family === "large") await widget.presentLarge();
  else await widget.presentMedium();
}
Script.complete();

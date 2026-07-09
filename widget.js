// ============================================================
// 오늘의 연뮤 문장 — Scriptable 위젯
// 일정 시간마다 바뀌는 연극/뮤지컬 대사 위젯
// ============================================================

// ▼ 여기에 GitHub raw URL을 붙여넣으세요.
//   예: https://raw.githubusercontent.com/<아이디>/<저장소>/main/quotes.json
const JSON_URL = "https://raw.githubusercontent.com/with-Soopi/yeonmyu-quotes/refs/heads/main/quotes.json";

// 대사 폰트: 기본 시스템 폰트(산세리프). 세리프 느낌을 원하면
// 아래를 "georgia"로 바꿔보세요. (iOS 내장 세리프 폰트)
const QUOTE_FONT = "georgia"; // "system" 또는 "georgia"

// 대사가 바뀌는 간격(시간 단위). 1 = 1시간마다, 3 = 3시간마다, 24 = 하루 한 번
const CHANGE_EVERY_HOURS = 1;

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

// ── 날짜+시간 기반 시드 → 지금 시간대의 대사 선택 ─────────────
// 같은 시간대에는 항상 같은 대사가 나온다.
function hashPick(when, count) {
  const bucket = Math.floor(when.getHours() / CHANGE_EVERY_HOURS);
  const dateKey =
    (when.getFullYear() * 10000 + (when.getMonth() + 1) * 100 + when.getDate()) *
      100 + bucket;
  // 간단한 정수 해시 (mulberry32 한 스텝)
  let t = (dateKey + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const seed = (t ^ (t >>> 14)) >>> 0;
  return seed % count;
}

function todaysQuote(quotes) {
  const now = new Date();
  let i = hashPick(now, quotes.length);
  // 직전 시간대와 같은 대사가 뽑히면 한 칸 밀어서 연속 중복 방지
  const prev = new Date(now.getTime() - CHANGE_EVERY_HOURS * 3600 * 1000);
  if (quotes.length > 1 && hashPick(prev, quotes.length) === i) {
    i = (i + 1) % quotes.length;
  }
  return quotes[i];
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

  // 다음 교체 시각 이후 새 대사로 갱신
  const next = new Date();
  next.setHours(
    (Math.floor(next.getHours() / CHANGE_EVERY_HOURS) + 1) * CHANGE_EVERY_HOURS,
    0, 0, 0
  );
  w.refreshAfterDate = next;
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

// ── 전체화면 뷰: 위젯을 탭하면 열리고, 버튼으로 문장을 넘긴다 ──
function browserHTML(quotes) {
  // </script> 등이 끼어들어도 안전하게 < 를 이스케이프
  const data = JSON.stringify(quotes).replace(/</g, "\\u003c");
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-user-select:none;
      -webkit-tap-highlight-color:transparent; }
  html,body { height:100%; }
  body { display:flex; flex-direction:column; align-items:center; justify-content:center;
    font-family: ui-serif, Georgia, serif; padding:40px 30px; text-align:center;
    transition: background-color .45s ease, color .45s ease; }
  #text { font-size:27px; line-height:1.62; white-space:pre-line; font-weight:500;
    letter-spacing:.2px; }
  #moods { margin-top:24px; font-size:14px; opacity:.7; }
  #work  { margin-top:10px; font-size:15px; opacity:.82; }
  #next  { margin-top:44px; padding:14px 28px; border:1px solid currentColor;
    border-radius:999px; background:transparent; color:inherit; font-size:16px;
    font-family:inherit; opacity:.85; transition:opacity .2s; }
  #next:active { opacity:.45; }
</style></head>
<body>
  <div id="text"></div>
  <div id="moods"></div>
  <div id="work"></div>
  <button id="next">다음 문장 →</button>
  <script>
    const QUOTES = ${data};
    let last = -1;
    function pick() {
      let i = Math.floor(Math.random() * QUOTES.length);
      if (QUOTES.length > 1) { while (i === last) i = Math.floor(Math.random() * QUOTES.length); }
      last = i;
      const q = QUOTES[i];
      document.body.style.backgroundColor = q.color || '#1C1C2E';
      document.body.style.color = q.textColor || '#FAF6EF';
      document.getElementById('text').textContent = q.text || '';
      document.getElementById('moods').textContent = (q.moods || []).map(m => '#' + m).join('  ');
      document.getElementById('work').textContent =
        (q.genre ? q.genre + ' ' : '') + '〈' + (q.work || '') + '〉' + (q.song ? ' · ' + q.song : '');
    }
    document.getElementById('next').addEventListener('click', pick);
    pick();
  </script>
</body></html>`;
}

async function presentBrowser(quotes) {
  const wv = new WebView();
  await wv.loadHTML(browserHTML(quotes));
  await wv.present(true); // 전체화면
}

// ── 실행 ─────────────────────────────────────────────────────
const { quotes, fromCache } = await loadQuotes();

if (config.runsInWidget) {
  // 홈 화면 위젯: 오늘의 대사(날짜 시드)를 보여줌
  const family = config.widgetFamily || "medium";
  const widget = quotes
    ? buildWidget(todaysQuote(quotes), family, fromCache)
    : buildErrorWidget();
  Script.setWidget(widget);
} else if (quotes) {
  // 위젯을 탭했거나 앱에서 직접 실행: 문장을 넘겨보는 전체화면 뷰
  await presentBrowser(quotes);
} else {
  await buildErrorWidget().presentMedium();
}
Script.complete();

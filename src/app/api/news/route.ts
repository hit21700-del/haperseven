// ─────────────────────────────────────────────────────────────
// /api/news?cat=<key> — 카테고리별 스포츠 뉴스 (구글 뉴스 RSS, 한국어, 30분 캐시)
//   국내축구 / 해외축구 / 국내야구 / 해외야구 / UFC
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800;

type Category = { key: string; label: string; q: string };

const CATEGORIES: Category[] = [
  { key: "epl", label: "해외축구", q: "해외축구 OR EPL OR 손흥민 OR 챔피언스리그 OR 라리가" },
  { key: "kleague", label: "국내축구", q: "K리그 OR 축구 국가대표 OR 국내축구" },
  { key: "kbo", label: "국내야구", q: "KBO OR 프로야구 OR 한국시리즈" },
  { key: "mlb", label: "해외야구", q: "MLB OR 메이저리그 OR 김하성 OR 이정후 OR 류현진" },
  { key: "ufc", label: "UFC", q: "UFC OR 종합격투기 OR 코리안좀비" },
];

// 클라이언트 탭 구성용 (쿼리는 노출하지 않음). 라우트 파일은 핸들러 외 export 를 허용하지 않아 내부 상수로 둔다.
const NEWS_CATEGORIES = CATEGORIES.map((c) => ({ key: c.key, label: c.label }));

type NewsItem = { title: string; link: string; source: string; publishedAt: string };

const unwrap = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();

const gnewsUrl = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;

function parseGoogleNews(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < 20) {
    const block = m[1];
    const pick = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      return r ? unwrap(r[1]) : "";
    };
    let title = pick("title");
    const link = pick("link");
    const pub = pick("pubDate") || pick("dc:date");
    const source = pick("source") || (title.includes(" - ") ? title.slice(title.lastIndexOf(" - ") + 3).trim() : "구글뉴스");
    // 구글뉴스 제목 끝의 " - 매체명" 제거
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, title.length - source.length - 3).trim();
    else if (title.includes(" - ")) title = title.slice(0, title.lastIndexOf(" - ")).trim();
    if (!title || !link) continue;
    const d = new Date(pub);
    items.push({ title, link, source, publishedAt: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString() });
  }
  return items;
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("cat") || CATEGORIES[0].key;
  const cat = CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
  try {
    const res = await fetch(gnewsUrl(cat.q), {
      headers: { "user-agent": "Mozilla/5.0 (HaperSeven news bot)" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error(`google-news ${res.status}`);
    const items = parseGoogleNews(await res.text()).slice(0, 10);
    return NextResponse.json(
      { cat: cat.key, categories: NEWS_CATEGORIES, items, fetchedAt: new Date().toISOString() },
      { headers: { "cache-control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ cat: cat.key, categories: NEWS_CATEGORIES, items: [], error: true });
  }
}

// ─────────────────────────────────────────────────────────────
// /api/news — 한국어 축구 뉴스 RSS 를 모아 최신순 10건 반환 (30분 캐시)
//   출처: 풋볼리스트, 인터풋볼 (공개 RSS). 실패한 출처는 건너뛴다.
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800;

const SOURCES: { name: string; url: string }[] = [
  { name: "풋볼리스트", url: "https://www.footballist.co.kr/rss/allArticle.xml" },
  { name: "인터풋볼", url: "https://www.interfootball.co.kr/rss/allArticle.xml" },
];

export type NewsItem = { title: string; link: string; source: string; publishedAt: string };

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

function parseRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < 30) {
    const block = m[1];
    const pick = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      return r ? unwrap(r[1]) : "";
    };
    const title = pick("title");
    const link = pick("link");
    const pub = pick("pubDate") || pick("dc:date");
    if (!title || !link) continue;
    const d = new Date(pub);
    items.push({ title, link, source, publishedAt: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString() });
  }
  return items;
}

export async function GET() {
  const results = await Promise.allSettled(
    SOURCES.map(async (s) => {
      const res = await fetch(s.url, {
        headers: { "user-agent": "Mozilla/5.0 (HaperSeven news bot)" },
        next: { revalidate: 1800 },
      });
      if (!res.ok) throw new Error(`${s.name} ${res.status}`);
      return parseRss(await res.text(), s.name);
    }),
  );
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const seen = new Set<string>();
  const items = all
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)))
    .slice(0, 10);
  return NextResponse.json(
    { items, sources: SOURCES.map((s) => s.name), fetchedAt: new Date().toISOString() },
    { headers: { "cache-control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
  );
}

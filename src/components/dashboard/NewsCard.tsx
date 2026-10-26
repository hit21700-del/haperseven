"use client";
import React, { useEffect, useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type NewsItem = { title: string; link: string; source: string; publishedAt: string };
type Cat = { key: string; label: string };

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "방금";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// 서버 CATEGORIES 와 순서/키 동일 (첫 응답으로도 받지만 초기 탭 렌더용)
const FALLBACK_CATS: Cat[] = [
  { key: "epl", label: "해외축구" },
  { key: "kleague", label: "국내축구" },
  { key: "kbo", label: "국내야구" },
  { key: "mlb", label: "해외야구" },
  { key: "ufc", label: "UFC" },
];

/** 카테고리별 스포츠 뉴스 (구글 뉴스 RSS, 30분 캐시) */
export function NewsCard() {
  const [cats, setCats] = useState<Cat[]>(FALLBACK_CATS);
  const [active, setActive] = useState<string>(FALLBACK_CATS[0].key);
  // 탭별 결과 캐시: undefined=로딩전/중, 배열=로드됨, "error"=실패
  const [cache, setCache] = useState<Record<string, NewsItem[] | "error">>({});

  const load = (key: string) => {
    setCache((c) => (key in c ? c : { ...c, [key]: undefined as unknown as NewsItem[] }));
    fetch(`/api/news?cat=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        if (Array.isArray(j.categories) && j.categories.length) setCats(j.categories);
        setCache((c) => ({ ...c, [key]: j.error ? "error" : (j.items ?? []) }));
      })
      .catch(() => setCache((c) => ({ ...c, [key]: "error" })));
  };

  useEffect(() => {
    load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCat = (key: string) => {
    setActive(key);
    if (!(key in cache)) load(key);
  };

  const data = cache[active];
  const items = Array.isArray(data) ? data : null;

  return (
    <Card>
      <SectionTitle icon={<Newspaper size={14} />}>스포츠 소식</SectionTitle>

      {/* 카테고리 탭 (좁으면 가로 스크롤) */}
      <div className="-mx-1 mb-2 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="뉴스 카테고리">
        {cats.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={active === c.key}
            onClick={() => selectCat(c.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              active === c.key ? "bg-brand text-brand-fg" : "bg-surface-2 text-fg-muted hover:text-fg"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {data === "error" || (items && items.length === 0) ? (
        <EmptyState compact title="소식을 불러오지 못했습니다" description="잠시 후 다시 확인해 주세요." />
      ) : !items ? (
        <ul className="animate-pulse-fast space-y-2" aria-label="불러오는 중">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-4 rounded bg-surface-3" style={{ width: `${70 + (i % 3) * 10}%` }} />
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-line-soft">
          {items.map((n) => (
            <li key={n.link}>
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 py-2 text-sm hover:text-brand"
              >
                <span className="min-w-0 flex-1 text-fg-2 group-hover:text-brand">{n.title}</span>
                <span className="shrink-0 whitespace-nowrap text-xs text-fg-muted">
                  {n.source} · {relative(n.publishedAt)}
                </span>
                <ExternalLink size={13} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-fg-muted">출처: 구글 뉴스 (Google News)</p>
    </Card>
  );
}

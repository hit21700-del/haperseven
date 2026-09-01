"use client";
import React, { useEffect, useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type NewsItem = { title: string; link: string; source: string; publishedAt: string };

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "방금";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 축구 뉴스 헤드라인 (풋볼리스트·인터풋볼 RSS, 30분 캐시) */
export function NewsCard() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/news")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => alive && setItems(j.items ?? []))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card>
      <SectionTitle icon={<Newspaper size={14} />}>축구 소식</SectionTitle>
      {failed || (items && items.length === 0) ? (
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
      <p className="mt-2 text-[11px] text-fg-muted">출처: 풋볼리스트 · 인터풋볼 (RSS)</p>
    </Card>
  );
}

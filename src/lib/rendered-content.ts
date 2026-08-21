import { eq } from 'drizzle-orm';
import { schema, type Database } from '@/db';
import { renderContent, renderContentExcerpt, renderMarkdownFiltered, type RenderedContent } from '@/lib/markdown';
import type { RequestContext } from '@/lib/context';

/**
 * 计算原文的简单 hash，用于判断文章内容是否变化。
 */
function hashSource(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36) + ':' + text.length;
}

/**
 * 计算缓存 key 的 hash：原文 hash + 当前激活的插件列表。
 * 插件启用/禁用/变更时，旧缓存自动失效，不需要手动清理。
 */
function buildCacheHash(sourceText: string, ctx?: RequestContext): string {
  const contentHash = hashSource(sourceText || '');
  const pluginIds = ctx?.pluginCtx?.activatedPlugins
    ? [...ctx.pluginCtx.activatedPlugins].sort().join(',')
    : '';
  return contentHash + '|' + pluginIds;
}

/**
 * 内存中的 pending map：防止同一篇文章被并发重复渲染。
 */
const pendingRenders = new Map<string, Promise<RenderedContent>>();

export interface GetRenderedOptions {
  /** Workers waitUntil，用于异步回填不阻塞响应 */
  waitUntil?: (p: Promise<unknown>) => void;
  /** 传入则执行 content:markdown / content:content 插件 filter */
  ctx?: RequestContext;
  /** 摘要最大长度，默认 200 */
  maxExcerptLength?: number;
}

/**
 * 获取文章渲染结果（懒渲染模式，兼容插件 filter）。
 *
 * 工作流程：
 * 1. 查预渲染表，有缓存且内容+插件列表未变 → 直接返回
 * 2. 没有缓存 → 实时渲染（传入 ctx 则执行插件 filter）
 * 3. 异步写入预渲染表（不阻塞响应）
 * 4. 下次访问命中缓存
 */
export async function getRenderedContent(
  db: Database,
  cid: number,
  sourceText: string,
  options: GetRenderedOptions = {},
): Promise<RenderedContent> {
  const { waitUntil, ctx, maxExcerptLength = 200 } = options;
  const cacheHash = buildCacheHash(sourceText, ctx);

  // 1. 查预渲染表
  const cached = await db.query.contentsRendered.findFirst({
    where: eq(schema.contentsRendered.cid, cid),
  });

  // 2. 命中且 hash 匹配 → 直接返回
  if (cached && cached.sourceHash === cacheHash && cached.renderedHtml) {
    return {
      html: cached.renderedHtml,
      plainExcerpt: cached.renderedExcerpt || '',
    };
  }

  // 3. 并发去重
  const pendingKey = `${cid}:${cacheHash}`;
  const pending = pendingRenders.get(pendingKey);
  if (pending) return pending;

  // 4. 实时渲染
  const renderPromise = (async () => {
    // 正文：传入 ctx 则执行插件 filter，否则纯渲染
    const html = ctx
      ? await renderMarkdownFiltered(ctx, sourceText || '')
      : renderContent(sourceText || '', maxExcerptLength).html;

    // 摘要：始终用纯文本渲染（插件 filter 一般不影响纯文本摘要）
    const { plainExcerpt } = renderContent(sourceText || '', maxExcerptLength);

    // 5. 异步回填预渲染表
    const writeBack = db.insert(schema.contentsRendered)
      .values({
        cid,
        renderedHtml: html,
        renderedExcerpt: plainExcerpt,
        sourceHash: cacheHash,
        renderedAt: Math.floor(Date.now() / 1000),
      })
      .onConflictDoUpdate({
        target: [schema.contentsRendered.cid],
        set: {
          renderedHtml: html,
          renderedExcerpt: plainExcerpt,
          sourceHash: cacheHash,
          renderedAt: Math.floor(Date.now() / 1000),
        },
      })
      .catch(err => console.warn('[rendered-content] 写入预渲染表失败:', err))
      .finally(() => pendingRenders.delete(pendingKey));

    if (waitUntil) {
      waitUntil(writeBack);
    } else {
      writeBack.catch(() => {});
    }

    return { html, plainExcerpt };
  })();

  pendingRenders.set(pendingKey, renderPromise);
  return renderPromise;
}

/**
 * 列表页用：获取文章摘要。
 * 优先用预渲染表的摘要，没有则实时渲染并异步回填全文。
 */
export async function getRenderedExcerpt(
  db: Database,
  cid: number,
  sourceText: string,
  moreText: string,
  permalink: string,
  options: GetRenderedOptions = {},
): Promise<string> {
  const cacheHash = buildCacheHash(sourceText, options.ctx);

  const cached = await db.query.contentsRendered.findFirst({
    where: eq(schema.contentsRendered.cid, cid),
    columns: { renderedExcerpt: true, sourceHash: true },
  });

  if (cached?.sourceHash === cacheHash && cached.renderedExcerpt) {
    return `${cached.renderedExcerpt}<p class="more"><a href="${permalink}">${moreText}</a></p>`;
  }

  // 未命中：调用全文渲染（会自动回填），然后取摘要
  const rendered = await getRenderedContent(db, cid, sourceText, options);
  return `${rendered.plainExcerpt}<p class="more"><a href="${permalink}">${moreText}</a></p>`;
}

/**
 * 文章删除时调用，删除对应的预渲染缓存。
 */
export async function invalidateRenderedContent(db: Database, cid: number): Promise<void> {
  await db.delete(schema.contentsRendered)
    .where(eq(schema.contentsRendered.cid, cid))
    .catch(() => {});
}

/**
 * 批量查询时计算 hash（包含插件列表），供 page-data.ts 使用。
 */
export function hashSourceWithPlugins(sourceText: string, ctx?: RequestContext): string {
  return buildCacheHash(sourceText, ctx);
}

export { hashSource };

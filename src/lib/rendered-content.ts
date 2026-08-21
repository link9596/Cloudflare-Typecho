import { eq } from 'drizzle-orm';
import { schema, type Database } from '@/db';
import { renderContent, renderContentExcerpt, type RenderedContent } from '@/lib/markdown';

/**
 * 计算原文的 hash，用于判断文章内容是否变化。
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
 * 内存中的 pending map：防止同一篇文章被并发重复渲染。
 * Workers 单线程， await 期间可能有多个请求交错执行。
 */
const pendingRenders = new Map<number, Promise<RenderedContent>>();

/**
 * 获取文章渲染结果。
 * 
 * 工作流程：
 * 1. 查预渲染表，有缓存且内容未变 → 直接返回
 * 2. 没有缓存 → 实时渲染
 * 3. 同时异步把渲染结果写入预渲染表
 * 4. 下次访问命中缓存
 */
export async function getRenderedContent(
  db: Database,
  cid: number,
  sourceText: string,
  waitUntil?: (p: Promise<unknown>) => void,
  maxExcerptLength = 200,
): Promise<RenderedContent> {
  const sourceHash = hashSource(sourceText || '');

  // 1. 查预渲染表
  const cached = await db.query.contentsRendered.findFirst({
    where: eq(schema.contentsRendered.cid, cid),
  });

  // 2. 命中且 hash 匹配 → 直接返回
  if (cached && cached.sourceHash === sourceHash && cached.renderedHtml) {
    return {
      html: cached.renderedHtml,
      plainExcerpt: cached.renderedExcerpt || '',
    };
  }

  // 3. 并发去重：如果这篇文章正在渲染中，复用结果
  const pending = pendingRenders.get(cid);
  if (pending) return pending;

  // 4. 实时渲染 + 异步回填
  const renderPromise = (async () => {
    const rendered = renderContent(sourceText || '', maxExcerptLength);

    // 5. 异步写入预渲染表（不阻塞响应）
    const writeBack = db.insert(schema.contentsRendered)
      .values({
        cid,
        renderedHtml: rendered.html,
        renderedExcerpt: rendered.plainExcerpt,
        sourceHash,
        renderedAt: Math.floor(Date.now() / 1000),
      })
      .onConflictDoUpdate({
        target: [schema.contentsRendered.cid],
        set: {
          renderedHtml: rendered.html,
          renderedExcerpt: rendered.plainExcerpt,
          sourceHash,
          renderedAt: Math.floor(Date.now() / 1000),
        },
      })
      .catch(err => console.warn('[rendered-content] 写入预渲染表失败:', err))
      .finally(() => pendingRenders.delete(cid));

    // 用 waitUntil 让响应返回后继续执行写操作
    if (waitUntil) {
      waitUntil(writeBack);
    } else {
      writeBack.catch(() => {});
    }

    return rendered;
  })();

  pendingRenders.set(cid, renderPromise);
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
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<string> {
  const sourceHash = hashSource(sourceText || '');

  // 查预渲染摘要
  const cached = await db.query.contentsRendered.findFirst({
    where: eq(schema.contentsRendered.cid, cid),
    columns: { renderedExcerpt: true, sourceHash: true },
  });

  if (cached?.sourceHash === sourceHash && cached.renderedExcerpt) {
    return `${cached.renderedExcerpt}<p class="more"><a href="${permalink}">${moreText}</a></p>`;
  }

  // 未命中：调用全文渲染（会自动回填），然后取摘要部分
  const rendered = await getRenderedContent(db, cid, sourceText, waitUntil);
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
 * 导出 hashSource，供其他模块（如 page-data.ts）批量查询时使用。
 */
export { hashSource };

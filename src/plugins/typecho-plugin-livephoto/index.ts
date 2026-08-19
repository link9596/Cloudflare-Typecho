import type { PluginInitContext } from 'typecho/plugin-sdk';
import { escapeHtml } from 'typecho/plugin-sdk';

const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;
const PLACEHOLDER_PREFIX = '@@LIVEPHOTO:';
const PLACEHOLDER_SUFFIX = '@@';

export default function init({ addHook, pluginId }: PluginInitContext): void {
  console.log('[LivePhoto] init called'); // 1. 确认插件加载

  addHook('content:markdown', pluginId, (markdown: string) => {
    console.log('[LivePhoto] markdown hook called, input starts with:', markdown.slice(0, 100));
    const replaced = markdown.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4';
      const data = JSON.stringify({ photo, video, ratio });
      return `${PLACEHOLDER_PREFIX}${data}${PLACEHOLDER_SUFFIX}`;
    });
    console.log('[LivePhoto] markdown replaced, contains placeholder?', replaced.includes(PLACEHOLDER_PREFIX));
    return replaced;
  });

  addHook('content:content', pluginId, (html: string) => {
    console.log('[LivePhoto] content hook called, html length:', html.length);
    console.log('[LivePhoto] html includes placeholder?', html.includes(PLACEHOLDER_PREFIX));

    // 直接用字符串替换（不依赖正则），先验证功能
    let result = html;
    while (result.includes(PLACEHOLDER_PREFIX)) {
      const startIdx = result.indexOf(PLACEHOLDER_PREFIX);
      const endIdx = result.indexOf(PLACEHOLDER_SUFFIX, startIdx + PLACEHOLDER_PREFIX.length);
      if (endIdx === -1) break;
      const fullMatch = result.substring(startIdx, endIdx + PLACEHOLDER_SUFFIX.length);
      const jsonStr = result.substring(startIdx + PLACEHOLDER_PREFIX.length, endIdx);
      try {
        const { photo, video, ratio } = JSON.parse(jsonStr);
        const style = `aspect-ratio: ${ratio};`;
        const replacement = `<div style="${escapeHtml(style)}" class="live-photo" id="live-${Date.now()}-${Math.random().toString(36).slice(2,6)}">
    <img class="live-photo-img" src="${escapeHtml(photo)}" alt="Live Photo">
    <video class="live-photo-video" playsinline muted preload="auto">
        <source src="${escapeHtml(video)}" type="video/mp4">
    </video>
</div>`;
        result = result.substring(0, startIdx) + replacement + result.substring(endIdx + PLACEHOLDER_SUFFIX.length);
        console.log('[LivePhoto] replaced one placeholder');
      } catch (e) {
        console.error('[LivePhoto] parse error:', e);
        break;
      }
    }
    console.log('[LivePhoto] content hook done, result length:', result.length);
    return result;
  });
}
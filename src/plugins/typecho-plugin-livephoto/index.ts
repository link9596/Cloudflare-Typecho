import type { PluginInitContext } from 'typecho/plugin-sdk';

// 匹配 [LivePhoto ...]
const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;

// 匹配占位符：@@@LIVEPHOTO:photo|video|ratio@@@
const PLACEHOLDER_REGEX = /@@@LIVEPHOTO:([^|]+)\|([^|]+)\|([^@]+)@@@/g;

export default function init({ addHook, pluginId }: PluginInitContext): void {
  // 第一步：将 [LivePhoto ...] 替换为纯文本占位符
  addHook('content:markdown', pluginId, (markdown: string) => {
    return markdown.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4';
      // 使用 @@@ 和 | 作为分隔符，避免被转义
      return `@@@LIVEPHOTO:${photo}|${video}|${ratio}@@@`;
    });
  });

  // 第二步：在最终 HTML 中替换占位符为真正的 LivePhoto 结构
  addHook('content:content', pluginId, (html: string) => {
    // 直接替换纯文本占位符，即使被包裹在 <p> 中也能匹配
    return html.replace(PLACEHOLDER_REGEX, (match, photo, video, ratio) => {
      // 生成唯一 ID（避免多个 LivePhoto 重复）
      const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const style = `aspect-ratio: ${ratio};`;
      return `<div style="${style}" class="live-photo" id="${id}">
    <img class="live-photo-img" src="${photo}" alt="Live Photo">
    <video class="live-photo-video" playsinline muted preload="auto">
        <source src="${video}" type="video/mp4">
    </video>
</div>`;
    });
  });
}
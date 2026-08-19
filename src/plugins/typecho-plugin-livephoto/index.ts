import type { PluginInitContext } from 'typecho/plugin-sdk';
import { escapeHtml } from 'typecho/plugin-sdk';

// 正则匹配 [LivePhoto photo="url" video="url" ratio="a/b"]
const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;

// 占位符前缀 / 后缀（避免被 sanitize 过滤）
const PLACEHOLDER_PREFIX = '@@LIVEPHOTO:';
const PLACEHOLDER_SUFFIX = '@@';

export default function init({ addHook, pluginId }: PluginInitContext): void {
  // 1. 在 Markdown 渲染前，将自定义语法替换为占位符（纯文本，不被 sanitize 影响）
  addHook('content:markdown', pluginId, (markdown: string) => {
    return markdown.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4'; // 默认比例
      const data = JSON.stringify({ photo, video, ratio });
      return `${PLACEHOLDER_PREFIX}${data}${PLACEHOLDER_SUFFIX}`;
    });
  });

  // 2. 在 HTML 渲染后（已 sanitize），将占位符替换为最终 HTML
  addHook('content:content', pluginId, (html: string) => {
    const placeholderRegex = new RegExp(
      `${PLACEHOLDER_PREFIX}([^${PLACEHOLDER_SUFFIX}]+)${PLACEHOLDER_SUFFIX}`,
      'g'
    );
    return html.replace(placeholderRegex, (match, jsonStr) => {
      try {
        const { photo, video, ratio } = JSON.parse(jsonStr);
        const style = `aspect-ratio: ${ratio};`;
        // 转义 URL 防止 XSS
        const safePhoto = escapeHtml(photo);
        const safeVideo = escapeHtml(video);
        const safeStyle = escapeHtml(style);
        return `<div style="${safeStyle}" class="live-photo" id="myLivePhoto">
    <img class="live-photo-img" src="${safePhoto}" alt="...">
    <video class="live-photo-video" playsinline muted preload="auto">
        <source src="${safeVideo}" type="video/mp4">
    </video>
</div>`;
      } catch {
        // 解析失败保留原始占位符（或可忽略）
        return match;
      }
    });
  });
}
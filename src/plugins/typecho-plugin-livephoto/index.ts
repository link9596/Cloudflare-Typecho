import type { PluginInitContext } from 'typecho/plugin-sdk';
import { escapeHtml } from 'typecho/plugin-sdk';

const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;
const PLACEHOLDER_PREFIX = '@@LIVEPHOTO:';
const PLACEHOLDER_SUFFIX = '@@';

export default function init({ addHook, pluginId }: PluginInitContext): void {
  addHook('content:markdown', pluginId, (markdown: string) => {
    return markdown.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4';
      const data = JSON.stringify({ photo, video, ratio });
      return `${PLACEHOLDER_PREFIX}${data}${PLACEHOLDER_SUFFIX}`;
    });
  });

  addHook('content:content', pluginId, (html: string) => {
    // 修正正则：非贪婪匹配任何字符直到遇到 @@
    const placeholderRegex = new RegExp(
      `${PLACEHOLDER_PREFIX}(.*?)${PLACEHOLDER_SUFFIX}`,
      'g'
    );
    return html.replace(placeholderRegex, (match, jsonStr) => {
      try {
        const { photo, video, ratio } = JSON.parse(jsonStr);
        const style = `aspect-ratio: ${ratio};`;
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
        return match; // 解析失败保留原样
      }
    });
  });
}
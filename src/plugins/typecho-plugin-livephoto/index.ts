import type { PluginInitContext } from 'typecho/plugin-sdk';
import { escapeHtml } from 'typecho/plugin-sdk';

// 匹配 [LivePhoto photo="..." video="..." ratio="..."]
const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;

// 匹配占位符：@@@LIVEPHOTO:encodedPhoto|encodedVideo|ratio@@@
const PLACEHOLDER_REGEX = /@@@LIVEPHOTO:([^|]+)\|([^|]+)\|([^@]+)@@@/g;

export default function init({ addHook, pluginId }: PluginInitContext): void {
  // 第一步：将 [LivePhoto] 替换为编码后的占位符（避免自动链接）
  addHook('content:markdown', pluginId, (markdown: string) => {
    return markdown.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4';
      // 将 :// 替换为 :/ 以破坏自动链接
      const encodedPhoto = photo.replace(/:\/\//g, ':/');
      const encodedVideo = video.replace(/:\/\//g, ':/');
      return `@@@LIVEPHOTO:${encodedPhoto}|${encodedVideo}|${ratio}@@@`;
    });
  });

  // 第二步：在最终 HTML 中恢复并替换为 LivePhoto 结构
  addHook('content:content', pluginId, (html: string) => {
    return html.replace(PLACEHOLDER_REGEX, (match, photo, video, ratio) => {
      // 恢复 :// 编码
      const decodedPhoto = photo.replace(/:\//g, '://');
      const decodedVideo = video.replace(/:\//g, '://');
      const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const style = `aspect-ratio: ${ratio};`;
      // 注意：这里不转义 URL，因为已经过编码恢复，且 URL 安全
      return `<div style="${style}" class="live-photo" id="${id}">
    <img class="live-photo-img" src="${decodedPhoto}" alt="Live Photo">
    <video class="live-photo-video" playsinline muted preload="auto">
        <source src="${decodedVideo}" type="video/mp4">
    </video>
</div>`;
    });
  });
}
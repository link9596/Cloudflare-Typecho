import type { PluginInitContext } from 'typecho/plugin-sdk';
import { escapeHtml } from 'typecho/plugin-sdk';

const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;

export default function init({ addHook, pluginId }: PluginInitContext): void {
  addHook('content:content', pluginId, (html: string) => {
    // 直接在最终 HTML 中查找并替换 [LivePhoto ...] 标记
    return html.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4';
      const style = `aspect-ratio: ${ratio};`;
      const safePhoto = escapeHtml(photo);
      const safeVideo = escapeHtml(video);
      const id = `live-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      return `<div style="${style}" class="live-photo" id="${id}">
    <img class="live-photo-img" src="${safePhoto}" alt="Live Photo">
    <video class="live-photo-video" playsinline muted preload="auto">
        <source src="${safeVideo}" type="video/mp4">
    </video>
</div>`;
    });
  });
}
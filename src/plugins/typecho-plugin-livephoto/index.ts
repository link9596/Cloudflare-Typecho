import type { PluginInitContext } from 'typecho/plugin-sdk';

// 匹配 [LivePhoto photo="..." video="..." ratio="..."]
const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;

export default function init({ addHook, pluginId }: PluginInitContext): void {
  // 第一步：将自定义语法替换为安全的 HTML 占位符（不会被 sanitize 破坏）
  addHook('content:markdown', pluginId, (markdown: string) => {
    return markdown.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4';
      // 直接拼接 data-* 属性，内容不包含 " 或特殊字符（URL 一般安全）
      return `<div class="lp-placeholder" data-photo="${photo}" data-video="${video}" data-ratio="${ratio}"></div>`;
    });
  });

  // 第二步：在最终 HTML 输出前，将占位符替换为完整的 LivePhoto 结构
  addHook('content:content', pluginId, (html: string) => {
    // 正则匹配占位符，捕获 data-* 属性值
    return html.replace(
      /<div class="lp-placeholder" data-photo="([^"]*)" data-video="([^"]*)" data-ratio="([^"]*)"><\/div>/g,
      (match, photo, video, ratio) => {
        const style = `aspect-ratio: ${ratio};`;
        const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        return `<div style="${style}" class="live-photo" id="${id}">
    <img class="live-photo-img" src="${photo}" alt="Live Photo">
    <video class="live-photo-video" playsinline muted preload="auto">
        <source src="${video}" type="video/mp4">
    </video>
</div>`;
      }
    );
  });
}
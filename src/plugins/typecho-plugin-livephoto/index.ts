import type { PluginInitContext } from 'typecho/plugin-sdk';

// 匹配 [LivePhoto photo="..." video="..." ratio="..."]
const LIVE_PHOTO_REGEX = /\[LivePhoto\s+photo="([^"]+)"\s+video="([^"]+)"(?:\s+ratio="([^"]+)")?\s*\]/g;
// 匹配占位符
const PLACEHOLDER_REGEX = /@@@LIVEPHOTO:([^|]+)\|([^|]+)\|([^@]+)@@@/g;

/**
 * 解析比例字符串（如 "4/3"、"3/4"），返回 padding-top 百分比
 */
function getPaddingTop(ratio: string): string {
  const parts = ratio.split('/').map(Number);
  if (parts.length !== 2 || parts.some(isNaN) || parts[0] === 0) {
    return '100%'; // 默认 1:1
  }
  // padding-top = (高 / 宽) * 100%
  const percent = (parts[1] / parts[0]) * 100;
  return `${percent}%`;
}

export default function init({ addHook, pluginId }: PluginInitContext): void {
  addHook('content:markdown', pluginId, (markdown: string) => {
    return markdown.replace(LIVE_PHOTO_REGEX, (match, photo, video, ratio) => {
      if (!ratio) ratio = '3/4';
      const encodedPhoto = photo.replace(/:\/\//g, ':/');
      const encodedVideo = video.replace(/:\/\//g, ':/');
      return `@@@LIVEPHOTO:${encodedPhoto}|${encodedVideo}|${ratio}@@@`;
    });
  });

  addHook('content:content', pluginId, (html: string) => {
    return html.replace(PLACEHOLDER_REGEX, (match, photo, video, ratio) => {
      const decodedPhoto = photo.replace(/:\//g, '://');
      const decodedVideo = video.replace(/:\//g, '://');
      const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      // 计算 padding-top 百分比
      const paddingTop = getPaddingTop(ratio);
      // 容器相对定位，宽度100%，高度由 padding-top 撑起
      const containerStyle = `position:relative; width:100%; padding-top:${paddingTop};`;
      // 内部图片和视频绝对定位铺满容器，并设置 object-fit: cover（可选）
      const innerStyle = `position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;`;
      return `<div style="${containerStyle}" class="live-photo" id="${id}">
    <img class="live-photo-img" src="${decodedPhoto}" alt="Live Photo" style="${innerStyle}">
    <video class="live-photo-video" playsinline muted preload="auto" style="${innerStyle}">
        <source src="${decodedVideo}" type="video/mp4">
    </video>
</div>`;
    });
  });
}
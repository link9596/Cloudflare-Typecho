import type { PluginInitContext } from 'typecho/plugin-sdk';

export default function init({ addHook, pluginId }: PluginInitContext): void {
  addHook('archive:footer', pluginId, (html: string) => {
    return html + `
<script>
(function() {
  function initLivePhotos() {
    document.querySelectorAll('.live-photo-wrapper').forEach(function(container) {
      if (container.dataset.initialized === 'true') return;
      container.dataset.initialized = 'true';
      const video = container.querySelector('.live-photo-video');
      if (!video) return;
      container.addEventListener('click', function(e) {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });
    });
  }
  // 初次加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLivePhotos);
  } else {
    initLivePhotos();
  }
  // Swup 切换后重新初始化
  document.addEventListener('swup:page:view', function() {
    setTimeout(initLivePhotos, 50);
  });
})();
</script>
`;
  });
}
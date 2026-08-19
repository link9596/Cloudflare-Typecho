import type { PluginInitContext } from 'typecho/plugin-sdk';

export default function init({ addHook, pluginId }: PluginInitContext): void {
  addHook('archive:footer', pluginId, (html: string) => {
    return html + `
<script>
(function() {
  function initialize() {
    if (typeof LivePhoto !== 'undefined' && typeof LivePhoto.init === 'function') {
      LivePhoto.init();
    }

    if (typeof Lightbox !== 'undefined' && typeof Lightbox.init === 'function') {
      Lightbox.init();
    }
  }

  // 初次加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Swup 页面切换后重新初始化
  document.addEventListener('swup:page:view', function() {
    setTimeout(initialize, 50);
  });
})();
</script>
`;
  });
}
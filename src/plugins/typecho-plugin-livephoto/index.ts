import type { PluginInitContext } from 'typecho/plugin-sdk';

export default function init({ addHook, pluginId }: PluginInitContext): void {
  // ========== 前台注入 ==========
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  document.addEventListener('swup:page:view', function() {
    setTimeout(initialize, 50);
  });
})();
<\/script>
`;
  });

  // ========== 后台编辑器注入 ==========
  const editorUIHtml = `
<div id="livephoto-dialog" class="wmd-prompt-dialog" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:10000; background:#fff; border:1px solid #ccc; border-radius:4px; box-shadow:0 2px 10px rgba(0,0,0,0.2); padding:20px; min-width:400px;">
  <div>
    <p><b>插入 Live Photo</b></p>
    <p>请输入图片URL:</p>
    <p><input type="text" id="lp-photo-url" style="width:100%;" placeholder="https://example.com/photo.jpg"></p>
    <p>请输入视频URL:</p>
    <p><input type="text" id="lp-video-url" style="width:100%;" placeholder="https://example.com/video.mp4"></p>
    <p>请输入宽高比(格式如 3/4):</p>
    <p><input type="text" id="lp-aspect-ratio" style="width:100%;" placeholder="留空默认为3/4"></p>
    <p style="margin-top:10px;"></p>
  </div>
  <form style="margin-top:15px; text-align:right;">
    <button type="button" class="btn btn-s primary" id="lp-ok">确定</button>
    <button type="button" class="btn btn-s" id="lp-cancel">取消</button>
  </form>
</div>

<!-- Fallback 容器 -->
<div id="livephoto-fallback-container" style="margin-bottom:8px;"></div>

<script is:inline>
(function() {
  // ---------- 对话框逻辑 ----------
  function initDialog() {
    var dialog = document.getElementById('livephoto-dialog');
    if (!dialog) return;
    var photoInput = document.getElementById('lp-photo-url');
    var videoInput = document.getElementById('lp-video-url');
    var ratioInput = document.getElementById('lp-aspect-ratio');
    var okBtn = document.getElementById('lp-ok');
    var cancelBtn = document.getElementById('lp-cancel');

    function insertLivePhoto() {
      var photo = photoInput.value.trim();
      var video = videoInput.value.trim();
      if (!photo || !video) {
        alert('请填写图片和视频链接');
        return;
      }
      var ratio = ratioInput.value.trim();
      // 若留空，则使用默认宽高比 3/4
      if (!ratio) ratio = '3/4';
      var code = '[LivePhoto photo="' + photo + '" video="' + video + '" ratio="' + ratio + '"]';

      var editor = document.getElementById('text');
      if (editor && editor.tagName === 'TEXTAREA') {
        var start = editor.selectionStart;
        var end = editor.selectionEnd;
        var text = editor.value;
        editor.value = text.substring(0, start) + code + text.substring(end);
        editor.selectionStart = editor.selectionEnd = start + code.length;
        editor.focus();
      } else {
        alert('未找到可用的编辑器，请确保光标在内容区域');
      }

      dialog.style.display = 'none';
      photoInput.value = '';
      videoInput.value = '';
      ratioInput.value = '';
    }

    okBtn.addEventListener('click', insertLivePhoto);
    cancelBtn.addEventListener('click', function() { dialog.style.display = 'none'; });

    // ESC 关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && dialog.style.display !== 'none') {
        dialog.style.display = 'none';
      }
    });

    // 输入框中按 Enter 触发确定
    [photoInput, videoInput, ratioInput].forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          insertLivePhoto();
        }
      });
    });
  }

  // ---------- 定位 ----------
  function addLivePhotoButton() {
    // 1. 标准工具栏 #wmd-button-row 中添加
    var row = document.getElementById('wmd-button-row');
    if (row) {
      if (document.getElementById('wmd-livephoto-button')) return true;

      var spacer = document.createElement('li');
      spacer.className = 'wmd-spacer';
      row.appendChild(spacer);

      var item = document.createElement('li');
      item.id = 'wmd-livephoto-button';
      item.className = 'wmd-button';
      item.title = '插入 LivePhoto';
      item.style.cursor = 'pointer';
      item.style.padding = '0 6px';
      item.textContent = 'Live';
      item.addEventListener('click', function() {
        var dialog = document.getElementById('livephoto-dialog');
        if (dialog) {
          dialog.style.display = 'block';
          var photoInput = document.getElementById('lp-photo-url');
          if (photoInput) setTimeout(function() { photoInput.focus(); }, 50);
        }
      });
      row.appendChild(item);
      return true;
    }

    var toolbar = document.querySelector('.editor-toolbar') || document.querySelector('#editor-toolbar');
    if (toolbar) {
      if (document.getElementById('wmd-livephoto-button')) return true;
      var btn = document.createElement('button');
      btn.id = 'wmd-livephoto-button';
      btn.textContent = 'Live';
      btn.type = 'button';
      btn.className = 'btn btn-sm';
      btn.style.marginRight = '6px';
      btn.addEventListener('click', function() {
        var dialog = document.getElementById('livephoto-dialog');
        if (dialog) {
          dialog.style.display = 'block';
          var photoInput = document.getElementById('lp-photo-url');
          if (photoInput) setTimeout(function() { photoInput.focus(); }, 50);
        }
      });
      toolbar.appendChild(btn);
      return true;
    }

    // 3. Fallback：在编辑器上方的容器中放置按钮
    var container = document.getElementById('livephoto-fallback-container');
    if (container) {
      if (container.querySelector('.livephoto-fallback-btn')) return true;
      var fallbackBtn = document.createElement('button');
      fallbackBtn.className = 'livephoto-fallback-btn';
      fallbackBtn.textContent = 'Live';
      fallbackBtn.type = 'button';
      fallbackBtn.addEventListener('click', function() {
        var dialog = document.getElementById('livephoto-dialog');
        if (dialog) {
          dialog.style.display = 'block';
          var photoInput = document.getElementById('lp-photo-url');
          if (photoInput) setTimeout(function() { photoInput.focus(); }, 50);
        }
      });
      container.appendChild(fallbackBtn);
      return true;
    }

    return false;
  }

  function initLivePhotoButton() {
    if (addLivePhotoButton()) return;

    var attempts = 0;
    var timer = setInterval(function() {
      attempts++;
      if (addLivePhotoButton()) {
        clearInterval(timer);
      } else if (attempts >= 50) { // 5秒超时，强制显示 Fallback
        clearInterval(timer);
        var container = document.getElementById('livephoto-fallback-container');
        if (container && !container.querySelector('.livephoto-fallback-btn')) {
          var fallbackBtn = document.createElement('button');
          fallbackBtn.className = 'livephoto-fallback-btn';
          fallbackBtn.textContent = 'Live';
          fallbackBtn.type = 'button';
          fallbackBtn.addEventListener('click', function() {
            var dialog = document.getElementById('livephoto-dialog');
            if (dialog) {
              dialog.style.display = 'block';
              var photoInput = document.getElementById('lp-photo-url');
              if (photoInput) setTimeout(function() { photoInput.focus(); }, 50);
            }
          });
          container.appendChild(fallbackBtn);
        }
      }
    }, 100);
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initDialog();
      initLivePhotoButton();
    });
  } else {
    initDialog();
    initLivePhotoButton();
  }
})();
<\/script>
`;

  // 注册后台钩子
  addHook('admin:writePost:bottom', pluginId, (html: string) => html + editorUIHtml);
  addHook('admin:writePage:bottom', pluginId, (html: string) => html + editorUIHtml);
}
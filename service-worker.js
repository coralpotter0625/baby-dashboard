// ============================================================
//  Service Worker —— 猪猪育儿工作台 PWA 离线缓存
// ============================================================

const CACHE_NAME = 'baby-dashboard-v2';
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/sensory-data.js',
  './icons/favicon-32x32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192x192.png',
  './icons/icon-256x256.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/maskable-512x512.png'
];

// 安装时缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求：网络优先，失败回退缓存
self.addEventListener('fetch', event => {
  const { request } = event;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // 成功则更新缓存
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // 离线时从缓存读取
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // 如果是页面请求，回退到 index.html（SPA 行为）
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          throw new Error('No cache match for ' + request.url);
        });
      })
  );
});

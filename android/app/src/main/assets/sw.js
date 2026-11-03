/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "ed0a60f19186d07bc335bd8e31bac921"
  }, {
    "url": "pwa-512x512.png",
    "revision": "acc9ee707b7ed17752f4dbe4a998378e"
  }, {
    "url": "pwa-192x192.png",
    "revision": "08ca1366d4fedea648b119a476fab133"
  }, {
    "url": "index.html",
    "revision": "2c6d4c0d329b28f6f05b3000dee8db43"
  }, {
    "url": "icon.svg",
    "revision": "0e6cd3814a295ca0970c1f21c992a00d"
  }, {
    "url": "icon-maskable.svg",
    "revision": "6a8d2d0b62a776c82b54f4b202f25043"
  }, {
    "url": "favicon.ico",
    "revision": "08ca1366d4fedea648b119a476fab133"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "906932b62deab3e3deae2b2a1772c1a2"
  }, {
    "url": "fonts/Vazirmatn-Regular.woff2",
    "revision": "cdc140628f111dc1f6185775f968e379"
  }, {
    "url": "fonts/Vazirmatn-Medium.woff2",
    "revision": "dd2193b32cbe791734c97e4e167816bf"
  }, {
    "url": "fonts/Vazirmatn-Bold.woff2",
    "revision": "7958481fe611c2574940c172068921bb"
  }, {
    "url": "assets/index-Hxxznolo.js",
    "revision": null
  }, {
    "url": "assets/index-BRfeSyly.css",
    "revision": null
  }, {
    "url": "assets/aistudio/index_228cc456.html",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "906932b62deab3e3deae2b2a1772c1a2"
  }, {
    "url": "favicon.ico",
    "revision": "08ca1366d4fedea648b119a476fab133"
  }, {
    "url": "icon-maskable.svg",
    "revision": "6a8d2d0b62a776c82b54f4b202f25043"
  }, {
    "url": "icon.svg",
    "revision": "0e6cd3814a295ca0970c1f21c992a00d"
  }, {
    "url": "pwa-192x192.png",
    "revision": "08ca1366d4fedea648b119a476fab133"
  }, {
    "url": "pwa-512x512.png",
    "revision": "acc9ee707b7ed17752f4dbe4a998378e"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "ed0a60f19186d07bc335bd8e31bac921"
  }, {
    "url": "fonts/Vazirmatn-Bold.woff2",
    "revision": "7958481fe611c2574940c172068921bb"
  }, {
    "url": "fonts/Vazirmatn-Medium.woff2",
    "revision": "dd2193b32cbe791734c97e4e167816bf"
  }, {
    "url": "fonts/Vazirmatn-Regular.woff2",
    "revision": "cdc140628f111dc1f6185775f968e379"
  }, {
    "url": "manifest.webmanifest",
    "revision": "cb95eebb8984afcd02c25ab90bc384f7"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/.*/i, new workbox.CacheFirst({
    "cacheName": "kelidban-offline-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));

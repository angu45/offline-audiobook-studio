/*
 * Offline Audiobook Studio
 * Service Worker
 *
 * Uses a safe cache-first strategy for
 * local application files.
 */

const CACHE_NAME =
  "offline-audiobook-studio-pro-v4";


const APP_ASSETS = [

  "./",

  "./index.html",

  "./css/style.css",

  "./css/responsive.css",

  "./js/app.js",

  "./js/player.js",

  "./js/speech.js",

  "./pyscript/script_analyzer.py",

  "./manifest.json"

];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches.open(
        CACHE_NAME
      )
      .then(
        cache =>
          cache.addAll(
            APP_ASSETS
          )
      )
      .then(
        () =>
          self.skipWaiting()
      )

    );

  }
);


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches.keys()
        .then(
          keys => {

            return Promise.all(

              keys
                .filter(
                  key =>
                    key !==
                    CACHE_NAME
                )
                .map(
                  key =>
                    caches.delete(
                      key
                    )
                )

            );

          }
        )
        .then(
          () =>
            self.clients.claim()
        )

    );

  }
);


/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
  "fetch",
  event => {

    /*
     * Only handle GET requests.
     */

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    const request =
      event.request;


    /*
     * Cache first for local assets.
     */

    event.respondWith(

      caches.match(
        request
      )
      .then(
        cached => {

          if (cached) {

            return cached;

          }


          return fetch(
            request
          )
          .then(
            response => {

              /*
               * Only cache valid
               * same-origin responses.
               */

              if (
                response.ok &&
                new URL(
                  request.url
                ).origin ===
                self.location.origin
              ) {

                const copy =
                  response.clone();


                caches.open(
                  CACHE_NAME
                )
                .then(
                  cache => {

                    cache.put(
                      request,
                      copy
                    );

                  }
                );

              }


              return response;

            }
          );

        }
      )

    );

  }
);
(function () {
  "use strict";

  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("../service-worker.js", { scope: "../", updateViaCache: "none" }).catch(function () {
      // Core application behavior remains available when PWA installation is unavailable.
    });
  });
})();

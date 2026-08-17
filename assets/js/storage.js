/**
 * storage.js (DEPRECATED)
 * LocalStorage data management has been completely replaced by assets/js/api.js
 * connected directly to Core PHP & MySQL database.
 */

window.CakeStorage = (function () {
    console.info('CakeStorage is deprecated. All operations now run live through CakeApi with MySQL.');
    return window.CakeApi ? window.CakeApi : {};
})();

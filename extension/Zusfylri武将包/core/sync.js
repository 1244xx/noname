(function () {
    if (typeof window !== "undefined" && window.Sync) return;

    var root =
        typeof window !== "undefined"
            ? window
            : typeof globalThis !== "undefined"
              ? globalThis
              : this;

    var Sync = {
        ensureStorage: function (player) {
            if (!player) return {};
            if (!player.storage) player.storage = {};
            return player.storage;
        },

        getStorage: function (player, key, fallback) {
            if (!player || !player.storage) return fallback;
            if (!(key in player.storage)) return fallback;
            return player.storage[key];
        },

        setStorage: function (player, key, value) {
            if (!player) return value;
            this.ensureStorage(player)[key] = value;
            if (typeof player.syncStorage === "function") player.syncStorage(key);
            return value;
        },

        deleteStorage: function (player, key) {
            if (!player || !player.storage) return;
            delete player.storage[key];
            if (typeof player.syncStorage === "function") player.syncStorage(key);
        },

        ensureArray: function (player, key) {
            var storage = this.ensureStorage(player);
            if (!Array.isArray(storage[key])) {
                storage[key] = [];
                if (player && typeof player.syncStorage === "function") player.syncStorage(key);
            }
            return storage[key];
        },

        ensureObject: function (player, key) {
            var storage = this.ensureStorage(player);
            if (!storage[key] || typeof storage[key] !== "object" || Array.isArray(storage[key])) {
                storage[key] = {};
                if (player && typeof player.syncStorage === "function") player.syncStorage(key);
            }
            return storage[key];
        },

        pushUnique: function (player, key, value) {
            var list = this.ensureArray(player, key);
            if (list.indexOf(value) === -1) {
                list.push(value);
                if (typeof player.syncStorage === "function") player.syncStorage(key);
            }
            return list;
        },

        pushValue: function (player, key, value) {
            var list = this.ensureArray(player, key);
            list.push(value);
            if (typeof player.syncStorage === "function") player.syncStorage(key);
            return list;
        },

        removeValue: function (player, key, value) {
            if (!player || !player.storage || !Array.isArray(player.storage[key])) return [];
            var list = player.storage[key];
            for (var i = list.length - 1; i >= 0; i--) {
                if (list[i] === value) list.splice(i, 1);
            }
            if (typeof player.syncStorage === "function") player.syncStorage(key);
            return list;
        },

        setMany: function (player, map) {
            if (!player) return map;
            this.ensureStorage(player);
            for (var key in map) {
                player.storage[key] = map[key];
                if (typeof player.syncStorage === "function") player.syncStorage(key);
            }
            return map;
        },

        resetArray: function (player, key) {
            return this.setStorage(player, key, []);
        },

        setFlag: function (player, key, bool) {
            return this.setStorage(player, key, !!bool);
        },
    };

    root.Sync = Sync;

    if (typeof game !== "undefined" && game) {
        if (!game.zusSetStorage) {
            game.zusSetStorage = function (player, key, value) {
                return Sync.setStorage(player, key, value);
            };
        }
        if (!game.zusDeleteStorage) {
            game.zusDeleteStorage = function (player, key) {
                return Sync.deleteStorage(player, key);
            };
        }
        if (!game.zusSync) game.zusSync = Sync;
    }
})();

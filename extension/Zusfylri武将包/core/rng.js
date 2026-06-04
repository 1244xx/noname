(function () {
    if (typeof window !== "undefined" && window.RNG) return;
    var root = (typeof window !== "undefined") ? window : (typeof globalThis !== "undefined" ? globalThis : this);
    var RNG = {
        random: function (num) {
            if (!num || num <= 0) return 0;
            if (typeof game !== "undefined" && game && typeof game.random === "function") {
                return game.random(num);
            }
            return 0;
        },
        randomGet: function (list) {
            if (!Array.isArray(list) || !list.length) return null;
            if (typeof game !== "undefined" && game && typeof game.random === "function") {
                return list[game.random(list.length)];
            }
            return list[0];
        },
        randomGets: function (list, count) {
            if (!Array.isArray(list) || !list.length || count <= 0) return [];
            var copy = list.slice(0), result = [];
            while (copy.length && result.length < count) {
                var index = this.random(copy.length);
                result.push(copy.splice(index, 1)[0]);
            }
            return result;
        }
    };
    root.RNG = RNG;
    if (typeof game !== "undefined" && game) {
        game.zusSafeRandomGet = RNG.randomGet;
        game.zusRNG = RNG;
    }
})();

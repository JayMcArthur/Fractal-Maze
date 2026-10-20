// lee/prng.js
// Seedable deterministic PRNG for reproducible random test configurations.
//
// mulberry32(seed) -> () => [0, 1)
//   seed : 32-bit integer (other numeric values are coerced with `| 0`)
//   returns a zero-arg function that yields uniform floats in [0, 1).
//
// Example:
//   const rng = mulberry32(12345);
//   random_route_gen(8, 8, 4, rng);  // reproducible config
//
// Same seed → same sequence, regardless of caller or platform.

(function (global) {
  function mulberry32(seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  global.mulberry32 = mulberry32;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mulberry32: mulberry32 };
  }
})(typeof window !== 'undefined' ? window : globalThis);

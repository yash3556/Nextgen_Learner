function toYYYYMMDD(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Simple seeded picker (deterministic for a given seed).
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickDeterministic(list, seed, count) {
  if (!Array.isArray(list)) return [];
  const n = list.length;
  if (n === 0) return [];
  const chosen = [];
  for (let i = 0; i < count; i++) {
    const idx = (hashString(seed + ":" + i) + i) % n;
    const item = list[idx];
    if (!chosen.find((c) => c === item)) chosen.push(item);
    if (chosen.length >= Math.min(count, n)) break;
  }
  return chosen;
}

module.exports = { toYYYYMMDD, pickDeterministic, hashString };


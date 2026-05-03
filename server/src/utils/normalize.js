function toTrimmedArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  // Accept comma/newline separated strings
  return String(value)
    .split(/[,|\n]/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function toStringArrayLower(value) {
  return toTrimmedArray(value).map((v) => v.toLowerCase());
}

function toStringMaybe(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

module.exports = { toTrimmedArray, toStringArrayLower, toStringMaybe };


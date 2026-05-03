function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function isStrongEnoughPassword(value) {
  return normalizeText(value).length >= 8;
}

function isValidUrl(value) {
  try {
    const url = new URL(normalizeText(value));
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
}

function normalizeHttpUrl(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(raw)) return raw;
  return `https://${raw}`;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildExactCaseInsensitiveRegex(value) {
  return new RegExp(`^${escapeRegex(normalizeText(value))}$`, "i");
}

module.exports = {
  buildExactCaseInsensitiveRegex,
  isStrongEnoughPassword,
  isValidEmail,
  isValidUrl,
  normalizeHttpUrl,
  normalizeEmail,
  normalizeText
};

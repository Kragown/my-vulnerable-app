function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeText(text, maxLength = 2000) {
  if (typeof text !== 'string') return '';
  return escapeHtml(text.trim().slice(0, maxLength));
}

module.exports = { escapeHtml, sanitizeText };

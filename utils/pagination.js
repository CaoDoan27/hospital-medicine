const DEFAULT_PAGE_SIZE = 10;

function parsePage(rawPage) {
  const n = parseInt(rawPage, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function buildPagination({ page, total, pageSize = DEFAULT_PAGE_SIZE, baseUrl, extraParams = {} }) {
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const qsPairs = Object.entries(extraParams)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  const qsSuffix = qsPairs.length ? '&' + qsPairs.join('&') : '';
  const buildUrl = (p) => `${baseUrl}?page=${p}${qsSuffix}`;

  const windowSize = 2;
  const start = Math.max(1, currentPage - windowSize);
  const end = Math.min(totalPages, currentPage + windowSize);
  const pages = [];
  for (let p = start; p <= end; p++) {
    pages.push({ number: p, active: p === currentPage, url: buildUrl(p) });
  }

  return {
    page: currentPage,
    pageSize,
    total: safeTotal,
    totalPages,
    offset: (currentPage - 1) * pageSize,
    prevUrl: currentPage > 1 ? buildUrl(currentPage - 1) : null,
    nextUrl: currentPage < totalPages ? buildUrl(currentPage + 1) : null,
    pages
  };
}

module.exports = { parsePage, buildPagination, DEFAULT_PAGE_SIZE };

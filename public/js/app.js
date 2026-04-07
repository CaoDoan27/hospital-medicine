// ===== Global App JavaScript =====

// Update datetime
function updateDateTime() {
  const el = document.getElementById('currentDateTime');
  if (!el) return;
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' };
  el.textContent = now.toLocaleDateString('vi-VN', opts);
}
updateDateTime();
setInterval(updateDateTime, 60000);

// Sidebar toggle
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

// Auto-dismiss alerts
document.querySelectorAll('.alert').forEach(alert => {
  setTimeout(() => { alert.style.opacity = '0'; alert.style.transform = 'translateY(-10px)'; setTimeout(() => alert.remove(), 300); }, 5000);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // F2: New
  if (e.key === 'F2') { e.preventDefault(); const btn = document.querySelector('[data-shortcut="new"]'); if (btn) btn.click(); }
  // F3: Search
  if (e.key === 'F3') { e.preventDefault(); const input = document.querySelector('.search-box input, [data-shortcut="search"]'); if (input) input.focus(); }
  // Ctrl+S: Save
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); const btn = document.querySelector('[data-shortcut="save"]'); if (btn) btn.click(); }
  // Ctrl+P: Print
  if (e.ctrlKey && e.key === 'p') { e.preventDefault(); window.print(); }
  // Escape: Close modal
  if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); }
});

// Format currency
function formatCurrency(num) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// Format number
function formatNumber(num) {
  return new Intl.NumberFormat('vi-VN').format(num);
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type}`;
  toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:300px;';
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Confirm delete
function confirmDelete(message = 'Bạn có chắc chắn muốn xóa?') {
  return confirm(message);
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

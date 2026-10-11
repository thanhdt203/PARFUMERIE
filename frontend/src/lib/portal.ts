/**
 * Modal render vào #admin-portal (nằm trong .admin-root) để vẫn nhận CSS nền của khu admin.
 * Ngoài khu admin thì rơi về <body>.
 */
export function getPortalRoot(): HTMLElement {
  return document.getElementById('admin-portal') ?? document.body;
}

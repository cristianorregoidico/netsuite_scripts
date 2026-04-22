/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @Author Franco León - Cristian Orrego - 01/2026
 * @description En VIEW de un registro con custbody_approval_state = Unapproved (3) y usuario con rol 1009, oculta los mensajes de comunicaciones en la UI.
 */
define(['N/runtime', 'N/currentRecord'], (runtime, currentRecord) => {

  const APPROVAL_FIELD_ID = 'custbody_approval_state';
  const UNAPPROVED_INTERNAL_ID = '3';
  const ALLOWED_ROLE_ID = 1009;

  function shouldHide() {
    const roleId = Number(runtime.getCurrentUser().role);
    if (roleId !== ALLOWED_ROLE_ID) return false;

    const rec = currentRecord.get();
    const val = String(rec.getValue({ fieldId: APPROVAL_FIELD_ID }) || '').trim();
    return val === UNAPPROVED_INTERNAL_ID;
  }

  function hideMessagesUI() {
    if (!shouldHide()) return;

    const labels = new Set(['Messages', 'Mensajes']);

    // 1) Ocultar el tab/botón "Messages"
    document.querySelectorAll('a, span, div, li').forEach((node) => {
      const t = (node.innerText || '').trim();
      if (labels.has(t)) {
        const container =
          node.closest('li') ||
          node.closest('td') ||
          node.closest('div') ||
          node;
        if (container) container.style.display = 'none';
      }
    });

    // 2) Ocultar contenido del bloque/sublista
    const selectors = [
      '[id^="messages"]',
      '[id*="messages"]',
      '[aria-label="Messages"]',
      '[aria-label="Mensajes"]',
      '[data-title="Messages"]',
      '[data-title="Mensajes"]'
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.display = 'none';
      });
    });
  }

  function schedule() {
    setTimeout(hideMessagesUI, 50);
    setTimeout(hideMessagesUI, 500);
    setTimeout(hideMessagesUI, 1500);
  }

  function pageInit() {
    schedule();

    // Si el usuario entra a Communication, o cambia subtabs
    document.addEventListener('click', () => {
      setTimeout(hideMessagesUI, 100);
      setTimeout(hideMessagesUI, 600);
    }, true);

    // Refuerzos por cambios de navegación en la misma página
    window.addEventListener('hashchange', () => schedule());
    window.addEventListener('popstate', () => schedule());
  }

  function fieldChanged(context) {
    if (context.fieldId === APPROVAL_FIELD_ID) {
      schedule();
    }
  }

  function saveRecord() {
    // Antes de guardar, refuerza ocultación (y deja guardar normalmente)
    try { hideMessagesUI(); } catch (e) {}
    return true;
  }

  return { pageInit, fieldChanged, saveRecord };
});

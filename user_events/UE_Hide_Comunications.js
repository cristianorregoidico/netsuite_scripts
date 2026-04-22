/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @Author Franco León - Cristian Orrego - 01/2026
 * @description En VIEW de un registro con custbody_approval_state = Unapproved (3) y usuario con rol 1009, oculta los mensajes de comunicaciones en la UI.
 */
define(['N/runtime'], (runtime) => {

  function beforeLoad(context) {

    // SOLO VIEW
    if (context.type !== context.UserEventType.VIEW) return;

    const user = runtime.getCurrentUser();
    if (Number(user.role) !== 1009) return;

    const rec = context.newRecord;
    const approvalValue = String(rec.getValue({ fieldId: 'custbody_approval_state' }) || '');

    // Unapproved = internal id 3
    if (approvalValue !== '3') return;

    // Inyectamos JS/CSS
    const html = `
      <script>
        (function() {
          function hideMessages() {
            var labels = ['Messages', 'Mensajes'];

            document.querySelectorAll('a, span, div, li').forEach(function(node) {
              var t = (node.innerText || '').trim();
              if (labels.indexOf(t) !== -1) {
                var container =
                  node.closest('li') ||
                  node.closest('td') ||
                  node.closest('div') ||
                  node;
                if (container) container.style.display = 'none';
              }
            });

            var selectors = [
              '[id^="messages"]',
              '[id*="messages"]',
              '[aria-label="Messages"]',
              '[aria-label="Mensajes"]',
              '[data-title="Messages"]',
              '[data-title="Mensajes"]'
            ];

            selectors.forEach(function(sel) {
              document.querySelectorAll(sel).forEach(function(el) {
                el.style.display = 'none';
              });
            });
          }

          setTimeout(hideMessages, 100);
          setTimeout(hideMessages, 500);
          setTimeout(hideMessages, 1500);
        })();
      </script>
    `;

    context.form.addField({
      id: 'custpage_hide_messages_js',
      type: 'inlinehtml',
      label: 'Hide Messages'
    }).defaultValue = html;
  }

  return { beforeLoad };
});

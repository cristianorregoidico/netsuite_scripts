/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/log"], () => {

  const LOCK_FIELD = true; // <-- your custom field on Estimate

  function beforeLoad(context) {
    const { newRecord, form, type } = context;
    log.debug("UE_Hide_Email_Button beforeLoad", `type: ${type}`);
    // Only in UI
    if (type !== context.UserEventType.CREATE &&
        type !== context.UserEventType.EDIT &&
        type !== context.UserEventType.VIEW) {
      return;
    }

    const lock = newRecord.getValue({ fieldId: LOCK_FIELD }) === true || newRecord.getValue({ fieldId: LOCK_FIELD }) === 'T';
    if (!lock) return;
    log.debug("UE_Hide_Email_Button beforeLoad", "Hiding email button(s)");
    // Hide standard Email button
    try { form.removeButton({ id: 'email' }); } catch (e) {}

    // Depending on form/record type, some instances use different ids
    try { form.removeButton({ id: 'sendemail' }); } catch (e) {}
    try { form.removeButton({ id: 'btn_email' }); } catch (e) {}

    // Optional: hide "Attach" / other comm-related buttons if present
    try { form.removeButton({ id: 'attach' }); } catch (e) {}
    try { form.removeButton({ id: 'fax' }); } catch (e) {}

    // Optional: add a warning message on the form
    form.addPageInitMessage({
      type: 'WARNING',
      title: 'Communication locked',
      message: 'Email sending is disabled for this Quote based on the lock field.'
    });
  }

  return { beforeLoad };
});

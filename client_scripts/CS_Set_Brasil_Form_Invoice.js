/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @Author Cristian Orrego
 */
define(['N/currentRecord', 'N/url'], (currentRecord, url) => {
  const pageInit = () => {
    const rec = currentRecord.get();
    const isBrasil = rec.getValue('custbody_transaccion_brazil');
    const currentForm = rec.getValue('customform');
    const brasilForm = 270;
    
    if (isBrasil && currentForm !== brasilForm) {
      window.location.href = url.resolveRecord({
        recordType: 'invoice',
        isEditMode: true,
        params: { cf: brasilForm, id: rec.id }
      });
    }
  };
  return { pageInit };
});

/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 */
define(['N/record', 'N/log'], (record, log) => {
  
  const beforeLoad = (context) => {
    try {
      // Solo aplica al crear desde Sales Order
      if (context.type !== context.UserEventType.COPY &&
          context.type !== context.UserEventType.CREATE) return;

      const newRecord = context.newRecord;
      const createdFrom = newRecord.getValue({ fieldId: 'createdfrom' });
      log.debug('Created From', createdFrom);
      if (!createdFrom) return;

      // Cargar la Sales Order origen
      log.debug('Loading Sales Order', createdFrom);
      const soRecord = record.load({
        type: record.Type.SALES_ORDER,
        id: createdFrom,
        isDynamic: false,
      });

      log.debug('Sales Order Loaded', soRecord.id);
      const isTransaccionBrasil = soRecord.getValue({
        fieldId: 'custbody_transaccion_brazil', // reemplaza con tu ID real
      });
        log.debug('Is Transaccion Brasil', isTransaccionBrasil);
      // Si está marcado, cambia el formulario
      if (isTransaccionBrasil) {
        log.debug('Setting custom form for Brasil');
        const customFormId = 270; // 👈 ID interno del formulario que quieres aplicar
        newRecord.setValue({
          fieldId: 'customform',
          value: customFormId,
        });
      }
    } catch (e) {
      log.debug('Error setting custom form', e);
    }
  };

  return { beforeLoad };
});

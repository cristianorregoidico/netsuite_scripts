/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @Author Cristian Orrego - 01/2026
 * @description Al crear un Item Receipt, lee la PO origen para obtener el campo custbody_boty_bill_reference y envía un POST a un endpoint externo con ese valor.
 */
define(['N/https', 'N/log', 'N/runtime', 'N/record', 'N/search'], (https, log, runtime, record, search) => {

  function afterSubmit(context) {
    try {
      // Solo al CREAR el Item Receipt
      if (context.type !== context.UserEventType.CREATE) return;

      const ir = context.newRecord;

      // Transaction de origen (PO, TO, etc.)
      const createdFromId = ir.getValue({ fieldId: 'createdfrom' });
      if (!createdFromId) {
        log.audit({
          title: 'Item Receipt sin createdfrom',
          details: { itemReceiptId: ir.id }
        });
        return;
      }

      // Intentamos determinar el tipo de transacción origen
      // En la mayoría de casos será Purchase Order, pero validamos.
      const originTypeLookup = search.lookupFields({
        type: 'transaction',
        id: createdFromId,
        columns: ['recordtype']
      });

      const originRecordType = originTypeLookup.recordtype; // ej: 'purchaseorder'
      if (originRecordType !== 'purchaseorder') {
        log.audit({
          title: 'createdfrom no es Purchase Order',
          details: {
            itemReceiptId: ir.id,
            createdFromId,
            originRecordType
          }
        });
        return;
      }

      // Opción A (más simple): cargar la PO y leer el campo
      const po = record.load({
        type: record.Type.PURCHASE_ORDER,
        id: createdFromId,
        isDynamic: false
      });

      var billRef = po.getValue({ fieldId: 'custbody_boty_bill_reference' });

      if (!billRef) {
        log.audit({
          title: 'PO sin custbody_boty_bill_reference',
          details: {
            itemReceiptId: ir.id,
            purchaseOrderId: createdFromId
          }
        });
        return;
      }

      // Convertimos explícitamente a integer
      billRef = parseInt(billRef, 10);
      if (isNaN(billRef)) {
        throw new Error(
          'custbody_boty_bill_reference no es numérico. Valor recibido: ' + billRef
        );
      }

      const endpointUrl = 'https://defaultdd3881f7d5fe4f9083f0dd74977579.51.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/784b75b5267846c9b0ad899cdf319289/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=fXVk2DKGVykVGwQkAscL6zU_3MId9VhRCWu1xV54jH4';


      const payload = JSON.stringify({ bill_id: billRef });

      const headers = { 'Content-Type': 'application/json' };

      const response = https.post({
        url: endpointUrl,
        body: payload,
        headers
      });

      log.audit({
        title: 'POST enviado (bill_id desde PO)',
        details: {
          itemReceiptId: ir.id,
          purchaseOrderId: createdFromId,
          billRef,
          endpointUrl,
          statusCode: response.code,
          responseBody: response.body
        }
      });

      // Si quieres marcar error cuando el endpoint no responde 2xx:
      // if (response.code < 200 || response.code >= 300) {
      //   throw new Error(`Endpoint respondió ${response.code}: ${response.body}`);
      // }

    } catch (e) {
      log.error({
        title: 'Error UE ItemReceipt -> leer PO y enviar a endpoint',
        details: e
      });
    }
  }

  return { afterSubmit };
});

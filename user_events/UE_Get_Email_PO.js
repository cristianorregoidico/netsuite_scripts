/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Adjunta los archivos incluidos en correos a la transacción
 */
define([ 'N/log', 'N/search', 'N/https'], function( log, search, https) {

  function afterSubmit(context) {
    log.debug("Inicializando ejecución")
    var PURCHASE_ORDER_TYPE = 'purchaseorder'; // Tipo de transacción para Purchase Order

    var message = context.newRecord;
    try {
        var messageId = message.getValue({fieldId: 'id'});
        log.debug("messageId", messageId)

        // Obtener la transacción relacionada (ej: PO)
        var transactionId = message.getValue('transaction');
        log.debug("transactionId", transactionId)

        if (!transactionId) return;

        var transactionType = search.lookupFields({
          type: 'transaction',
          id: transactionId,
          columns: ['recordtype']
        }).recordtype;
        log.debug("transactionType", transactionType)
        if (transactionType !== PURCHASE_ORDER_TYPE) return; // Si no es una PO, salir
        
        
        var payload = {
          po_id: transactionId,
          message_id: messageId
        }
        log.debug("Payload to send", payload)

        var response = https.post({
          url: 'https://appserviceexpediting.azurewebsites.net/api/po-emails/attach',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
            'x-token': '5e64ce20a2a31c0be67c56a841c1378342cb0b628f747a60ef9fb9a2c011786979'
          }
        });

        log.audit('Respuesta del endpoint', {
          status: response.code,
          body: response.body
        });
    } catch (error) {
        log.error('Error al ejecutar afterSubmit en Message', error);
    }
    
  }

  return {
    afterSubmit: afterSubmit
  };
});

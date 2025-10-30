/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Adjunta los archivos incluidos en correos a la transacción
 */
define(['N/record', 'N/file', 'N/log', 'N/search'], function(record, file, log, search) {

  function afterSubmit(context) {
    log.debug("Inicializando ejecución")
    var files = []
    var PURCHASE_ORDER_TYPE = 'purchaseorder'; // Tipo de transacción para Purchase Order
    var message = context.newRecord;
    var messageId = message.getValue({fieldId: 'id'});
    log.debug("messageId", messageId)
    
    var mediaItemCount = message.getLineCount({ sublistId: 'mediaitem' });
    log.debug("mediaItemCount", mediaItemCount)
    if (mediaItemCount === 0) return; // Si no hay archivos adjuntos, salir

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
    
    log.debug("Es una PO, se procede")
    for (var i = 0; i < mediaItemCount; i++) {
      var fileId = message.getSublistValue({
        sublistId: 'mediaitem',
        fieldId: 'mediaitem',
        line: 0 // puedes iterar si hay más de uno
      });
      var itemDisplay = message.getSublistValue({
        sublistId: 'mediaitem',
        fieldId: 'mediaitem_display',
        line: 0 // puedes iterar si hay más de uno
      });
      var fileType = search.lookupFields({
        type: 'file',
        id: fileId,
        columns: ['filetype']
      }).filetype;

      files.push({
        file_id: fileId, 
        file_name: itemDisplay, 
        file_type: fileType[0].value
      })
    }
    
    log.debug("files to attach", files)
    var payload = {
      po_id: transactionId,
      message_id: messageId,
      files: files
    }
    log.debug("Payload to send", payload)
  }

  return {
    afterSubmit: afterSubmit
  };
});

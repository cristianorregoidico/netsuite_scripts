/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Adjunta los archivos incluidos en correos a la transacción
 */
define(['N/record', 'N/file', 'N/log', 'N/search'], function(record, file, log, search) {

  function afterSubmit(context) {
    var message = context.newRecord;
    //log.debug("message", message)
    var mediaItemLoaded = message.getValue('mediaitemloaded');
    log.debug("mediaItemLoaded", mediaItemLoaded)
    var mediaItemCount = message.getLineCount({ sublistId: 'mediaitem' });
    log.debug("mediaItemCount", mediaItemCount)
    var fileId = message.getSublistValue({
      sublistId: 'mediaitem',
      fieldId: 'mediaitem',
      line: 0 // puedes iterar si hay más de uno
    });
    log.debug("fileId", fileId)
    var itemDisplay = message.getSublistValue({
      sublistId: 'mediaitem',
      fieldId: 'mediaitem_display',
      line: 0 // puedes iterar si hay más de uno
    });
    log.debug("itemDisplay", itemDisplay)
    

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

    // Obtener ID del archivo adjunto
    if (!fileId) return;
    var fileType = search.lookupFields({
      type: 'file',
      id: fileId,
      columns: ['recordtype']
    }).recordtype;
    log.debug("fileType", fileType)
    try {
      // Cargar el archivo
      var originalFile = file.load({ id: fileId });

      // (Opcional) Copiar el archivo al File Cabinet
      var copiedFile = file.create({
        name: originalFile.name,
        fileType: originalFile.fileType,
        contents: originalFile.getContents(),
        folder: 1194715  // <- Cambiar por ID real de tu carpeta destino
      });
      var newFileId = copiedFile.save();
      log.debug("newFileId", newFileId)

      // Adjuntar el archivo a la Purchase Order
      var poRecord = record.attach({
        record: {
          type: fileType,
          id: newFileId
        },
        to: {
          type: transactionType,
          id: transactionId
        }
      });

      log.audit('Archivo adjuntado correctamente a la PO', 'Archivo ID: ' + newFileId);
    } catch (e) {
      log.error('Error en script de mensaje', e.toString());
    }
  }

  return {
    afterSubmit: afterSubmit
  };
});

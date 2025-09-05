/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Enviar petición HTTP con ID de PO y Item Receipt al crear un Item Receipt
 */

define(['N/https', 'N/log'], function (https, log) {

    function afterSubmit(context) {
        try {
            if (context.type !== context.UserEventType.CREATE) return;

            var newRecord = context.newRecord;

            var itemReceiptId = newRecord.id;
            var createdFrom = newRecord.getValue({ fieldId: 'createdfrom' }); // Purchase Order ID

            if (!createdFrom || !itemReceiptId) {
                log.error('Faltan datos', 'PO ID: '+ createdFrom + ',  IR ID: ' + itemReceiptId);
                return;
            }
            log.debug("itemReceiptId", itemReceiptId)
            log.debug("createdFrom", createdFrom)

            // Construcción del URL del endpoint
            var endpointBase = 'https://appserviceexpediting.azurewebsites.net/api/po-notifications/start/'; 
            var fullUrl = endpointBase + createdFrom +'?ir=' + itemReceiptId;
            //var testURL = 'https://prod-164.westus.logic.azure.com/workflows/e1be2ea245d24e39bc4dbebfb70b218b/triggers/manual/paths/invoke/send_email?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-riuFCkgvKxHOqBLOj_SV6vm8kbCtliqX-cBa6NUBa0';
            log.debug('Llamando a endpoint externo', fullUrl);

            var response = https.get({
                url: testURL,
                headers: {
                    'Content-Type': 'application/json',
                    'x-token': '5e64ce20a2a31c0be67c56a841c1378342cb0b628f747a60ef9fb9a2c011786979'
                    // Agrega headers como autorización si es necesario
                }
            });

            log.audit('Respuesta del endpoint', {
                status: response.code,
                body: response.body
            });

        } catch (error) {
            log.error('Error al ejecutar afterSubmit en Item Receipt', error);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});

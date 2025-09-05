/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Get the vendor id and send it to service for creation y salesforce
 */
define(['N/https', 'N/log'], function (https, log) {

    function afterSubmit(context) {
        try {
            // Solo ejecuta en creación o edición
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
                return;
            }

            var newRecord = context.newRecord;
            var vendorId = newRecord.id;
            
            if (!vendorId) {
                log.error('Vendor ID missing', 'No vendor ID found in record.');
                return;
            }
            log.debug("vendorId", vendorId)

            // Construir el body de la solicitud
            var requestBody = JSON.stringify({
                vendor_id: vendorId
            });
            log.debug("requestBody", requestBody)
            // Realizar la solicitud POST al endpoint externo
            var response = https.post({
                url: 'https://appserviceexpediting.azurewebsites.net/api/account-to-salesforce/vendor', // <-- Reemplazar por tu URL real
                headers: {
                    'Content-Type': 'application/json',
                    'x-token': '5e64ce20a2a31c0be67c56a841c1378342cb0b628f747a60ef9fb9a2c011786979'
                },
                body: requestBody
            });

            // Registrar la respuesta para depuración
            log.audit('Vendor sent to external service', {
                vendorId: vendorId,
                status: response.code,
                body: response.body
            });

        } catch (e) {
            log.error('Error sending vendor to external service', e.toString());
        }
    }

    return {
        afterSubmit: afterSubmit
    };

});

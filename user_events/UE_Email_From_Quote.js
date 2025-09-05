/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Enviar petición HTTP con ID de PO para obtener el correo usado en el RFQ
 */
define(['N/https', 'N/record', 'N/log'], function (https, record, log) {

    function afterSubmit(context) {
        try {
            if (context.type !== context.UserEventType.CREATE) return;

            var poRecord = context.newRecord;
            var poId = poRecord.id;

            log.debug('Purchase Order ID', poId);

            // Construir body para enviar al API
            var requestBody = JSON.stringify({
                po_id: poId
            });

            // Realizar petición HTTP POST al endpoint
            var response = https.post({
                url: 'https://d4itoolstest.azurewebsites.net/api/quoter/quoted-email', 
                headers: {
                    'Content-Type': 'application/json',
                    'keyId': 'G4d9kJ7s8Q2fP1zX6wT3mV5rN0cB8jL',
                    'keyPass': 'R2y6X5nP9h3W8kJ1tZ0s4M7qV2bL6fQ'
                },
                body: requestBody
            });

            log.debug('Respuesta API', response.body);

            var parsedResponse = JSON.parse(response.body);

            // Solo continuar si success es true
            if (parsedResponse.success === true && parsedResponse.data && parsedResponse.data.email) {
                var email = parsedResponse.data.email;

                // Actualizar el campo en la PO
                record.submitFields({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    values: {
                        custbody_rfq_email: email // ← reemplaza por tu campo real
                    }
                });

                log.debug('Email guardado en PO', email);
            } else {
                log.debug('API no devolvió datos', 'success=false o sin campo email');
                record.submitFields({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    values: {
                        custbody_rfq_email: 'Not Found' // ← reemplaza por tu campo real
                    }
                });
            }

        } catch (e) {
            log.debug('Error en afterSubmit de PO', e);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});

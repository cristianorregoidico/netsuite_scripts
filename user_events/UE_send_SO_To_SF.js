/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Enviar petición HTTP con ID de SalesOrder para que se cree en Salesforce
 */
define(['N/https', 'N/record', 'N/log'], function (https, record, log) {

    function afterSubmit(context) {
        try {
            if (context.type !== context.UserEventType.CREATE) return;

            var soRecord = context.newRecord;
            var soId = soRecord.id;

            log.debug('SO ID', soId);

            

            // Realizar petición HTTP POST al endpoint
            var response = https.get({
                url: 'https://idicotools.azurewebsites.net/api/netsuite/salesforce/so_one/'+soId, 
                headers: {
                    'Content-Type': 'application/json',
                    'x-token': '5e64ce20a2a31c0be67c56a841c1378342cb0b628f747a60ef9fb9a2c011786979'
                },
            });

            log.debug('Respuesta API', response.body);

            var parsedResponse = JSON.parse(response.body);

            // Solo continuar si success es true
            log.debug('Se hizo la llamada a la API', parsedResponse);

        } catch (e) {
            log.debug('Error en afterSubmit de Quote', e);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});

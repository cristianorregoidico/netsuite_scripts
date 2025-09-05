/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/https', 'N/log'], function(record, https, log) {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
            return;
        }

        var newRecord = context.newRecord;
        var oldRecord = context.oldRecord;
        var poId = newRecord.id;
        var soId = newRecord.getValue({ fieldId: 'createdfrom' });

        var fieldReceiveById = 'custbody_evol_new_receive_by'; // ID del campo a validar

        var newReceiveBy = newRecord.getValue({ fieldId: fieldReceiveById });
        var oldReceiveBy = oldRecord ? oldRecord.getValue({ fieldId: fieldReceiveById }) : null;
        var newReceiveByDate = formatDate(newReceiveBy)
        log.debug("newReceiveByDate", newReceiveByDate)
        var oldReceiveByDate = formatDate(oldReceiveBy)
        log.debug("oldReceiveByDate", oldReceiveByDate)
        // Verificamos si cambió el valor
        if (newReceiveByDate !== oldReceiveByDate) {
            log.debug('Fecha de Receive By Cambiada', newReceiveByDate);
            log.debug('Iniciando la actualizacion de ETD en SO');
            var date = formatDate(newReceiveBy);
            var body = {
                po: poId,
                so: soId,
                date: date,
                type: 'ETD'
            }
            log.debug('Body', body);
            try {
                var response = https.post({
                    url: 'https://idicod4itools.azurewebsites.net/api/netsuite/so/update-etd', // Cambia esta URL por la real
                    headers: { 'Content-Type': 'application/json', 'keyId': 'G4d9kJ7s8Q2fP1zX6wT3mV5rN0cB8jL', 'keyPass': 'R2y6X5nP9h3W8kJ1tZ0s4M7qV2bL6fQ' },
                    body: JSON.stringify(body)
                });

                log.debug('API Response', response.body);
            } catch (e) {
                log.error('Error calling external API', e);
            }
        } 
        
    }

    function formatDate(dateObj) {
        if (!dateObj) return null;

        var date = dateObj.toISOString();

        return date.split("T")[0];
    }

    return {
        afterSubmit: afterSubmit
    };
});

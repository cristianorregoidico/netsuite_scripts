/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/https', 'N/log', 'N/search'], function(record, https, log) {
    
  function afterSubmit(context) {
        var newItem = context.newRecord;
        log.debug('New Item Data JSON', newItem);

        var item_id = newItem.getValue('id');
        log.debug('Item ID', item_id);

        var EXPEDITING_API_KEY = '5e64ce20a2a31c0be67c56a841c1378342cb0b628f747a60ef9fb9a2c011786979'
        if (context.type === context.UserEventType.CREATE) {
            try {
                var body = {
                item_id: item_id
                };
                var headers = {
                    'Content-Type': 'application/json',
                    'x-token': EXPEDITING_API_KEY
                }
                var response = https.post({
                    url: 'https://appserviceexpediting.azurewebsites.net/api/item/to-salesforce',
                    body: JSON.stringify(body),
                    headers: headers
                });
                 log.debug('Respuesta API', response.body);

                var parsedResponse = JSON.parse(response.body);
                log.debug('Se hizo la llamada a la API', parsedResponse);
            } catch (error) {
                log.error('Error sending item to Salesforce', error);
            }
            
        }
       
    }

    return {
        afterSubmit: afterSubmit
    };
});

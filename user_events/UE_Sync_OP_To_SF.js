/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Syncs Opportunity records to an external system via REST API on create and edit events.
 */
define(['N/https', 'N/log'], function (https, log) {

    function afterSubmit(context) {
        try {
            var oppRecord = context.newRecord;
            var oppId = oppRecord.id; // internal id of the opportunity
            log.debug("Opportunity ID", oppId);

            if (!oppId) return;

            // Body request
            var requestBody = {
                op_id: oppId
            };

            var url = 'https://appserviceexpediting.azurewebsites.net/api/opportunity-app/opportunity/salesforce-sync';
            var action;

            if (context.type === context.UserEventType.CREATE) {
                action = 'POST';
            } else if (context.type === context.UserEventType.EDIT) {
                action = 'PATCH';
            } else {
                return; // skip if not CREATE or EDIT
            }
            requestBody.action = action;


            // Send request
            var response = https.request({
                method: 'POST',
                url: url,
                body: JSON.stringify(requestBody),
                headers: {
                    'Content-Type': 'application/json',
                    'x-token': '5e64ce20a2a31c0be67c56a841c1378342cb0b628f747a60ef9fb9a2c011786979'
                }
            });

            log.audit('API Response', {
                status: response.code,
                body: response.body
            });

        } catch (e) {
            log.error('Error in afterSubmit Opportunity UE', e);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});

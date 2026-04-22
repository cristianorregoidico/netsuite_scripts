/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/runtime', 'N/https', 'N/log'], (
    runtime,
    https,
    log
) => {

    function execute() {
        try {
            const scriptObj = runtime.getCurrentScript();

            const apiUrl = scriptObj.getParameter({
                name: 'custscript_external_api_url'
            });

            const apiToken = scriptObj.getParameter({
                name: 'custscript_external_api_token'
            });

            if (!apiUrl) {
                throw new Error('Missing required parameter: custscript_external_api_url');
            }

            const headers = {
                'Accept': 'application/json'
            };

            //if (apiToken) {
            //    headers.Authorization = 'Bearer ' + apiToken;
            //}

            log.audit({
                title: 'START_EXTERNAL_GET',
                details: {
                    url: apiUrl
                }
            });

            const response = https.get({
                url: apiUrl,
                headers: headers
            });

            log.audit({
                title: 'EXTERNAL_API_RESPONSE',
                details: {
                    code: response.code,
                    body: response.body
                }
            });

            if (Number(response.code) < 200 || Number(response.code) >= 300) {
                log.error({
                    title: 'NON_SUCCESS_RESPONSE',
                    details: {
                        code: response.code,
                        body: response.body
                    }
                });
            }

        } catch (e) {
            log.error({
                title: 'SCHEDULED_SCRIPT_ERROR',
                details: {
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                }
            });

            throw e;
        }
    }

    return {
        execute
    };
});
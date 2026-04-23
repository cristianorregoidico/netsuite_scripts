/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/runtime', 'N/https', 'N/log', 'N/record'], (
    runtime,
    https,
    log,
    record
) => {

    // CAMBIA esto por el scriptid real de tu custom record de log
    const EXECUTION_LOG_RECORD_TYPE = 'customrecord_amex_reconciliation_logs';

    function execute() {
        const scriptObj = runtime.getCurrentScript();
        const logId = scriptObj.getParameter({
            name: 'custscript_log_id'
        });

        try {
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

            // if (apiToken) {
            //     headers.Authorization = 'Bearer ' + apiToken;
            // }

            log.audit({
                title: 'START_EXTERNAL_GET',
                details: {
                    url: apiUrl,
                    logId: logId
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

            if (logId) {
                record.submitFields({
                    type: EXECUTION_LOG_RECORD_TYPE,
                    id: logId,
                    values: {
                        custrecord_execution_status:
                            Number(response.code) >= 200 && Number(response.code) < 300
                                ? 'Success'
                                : 'Error'
                    }
                });
            }

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
            if (logId) {
                try {
                    record.submitFields({
                        type: EXECUTION_LOG_RECORD_TYPE,
                        id: logId,
                        values: {
                            custrecord_execution_status: 'Error'
                        }
                    });
                } catch (updateError) {
                    log.error({
                        title: 'LOG_UPDATE_ERROR',
                        details: {
                            name: updateError.name,
                            message: updateError.message
                        }
                    });
                }
            }

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
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/task', 'N/record', 'N/runtime', 'N/format'], (
    serverWidget,
    search,
    task,
    record,
    runtime,
    format
) => {

    const CUSTOM_RECORD_TYPE = 'customrecord_amex_vendors_rules';
    const SCHEDULED_SCRIPT_ID = 'customscript_ss_amex_rules';
    const SCHEDULED_DEPLOY_ID = 'customdeploy_ss_amex_rules';

    // CAMBIA esto por el scriptid real de tu custom record de log
    const EXECUTION_LOG_RECORD_TYPE = 'customrecord_amex_reconciliation_logs';

    function onRequest(context) {
        const request = context.request;

        if (request.method === 'GET') {
            const action = request.parameters.action || '';

            if (action === 'run_global') {
                runGlobalScheduledScript(context);
                return;
            }

            renderMainPage(context);
            return;
        }

        renderMainPage(context);
    }

    function renderMainPage(context) {
        const form = serverWidget.createForm({
            title: 'Amex Vendors Rules'
        });

        form.clientScriptModulePath = './CS_Amex_Rules.js';

        const todayExecution = getTodayExecution();

        form.addButton({
            id: 'custpage_btn_new_rule',
            label: 'New Rule',
            functionName: 'goToNewRecord'
        });

        if (!todayExecution.exists) {
            form.addButton({
                id: 'custpage_btn_run_global',
                label: 'Run Amex Reconciliation',
                functionName: 'runGlobalScript'
            });
        }

        const infoField = form.addField({
            id: 'custpage_execution_info',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Execution Info'
        });

        infoField.defaultValue = buildExecutionInfoHtml(todayExecution);

        const sublist = form.addSublist({
            id: 'custpage_rules_list',
            type: serverWidget.SublistType.LIST,
            label: 'Rules'
        });

        sublist.addField({
            id: 'custpage_col_internalid',
            type: serverWidget.FieldType.TEXT,
            label: 'Internal ID'
        });

        sublist.addField({
            id: 'custpage_col_name',
            type: serverWidget.FieldType.TEXT,
            label: 'Amex Expense Description'
        });

        sublist.addField({
            id: 'custpage_col_vendor',
            type: serverWidget.FieldType.TEXT,
            label: 'Vendor'
        });

        sublist.addField({
            id: 'custpage_col_transaction_account',
            type: serverWidget.FieldType.TEXT,
            label: 'Transaction Account'
        });

        sublist.addField({
            id: 'custpage_col_expense_account',
            type: serverWidget.FieldType.TEXT,
            label: 'Expense Account'
        });

        sublist.addField({
            id: 'custpage_col_bill_name',
            type: serverWidget.FieldType.TEXT,
            label: 'Bill Name'
        });

        sublist.addField({
            id: 'custpage_col_inactive',
            type: serverWidget.FieldType.TEXT,
            label: 'Inactive'
        });

        const ruleSearch = search.create({
            type: CUSTOM_RECORD_TYPE,
            filters: [],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'custrecord_vendor_description' }),
                search.createColumn({ name: 'custrecord_vendor_name' }),
                search.createColumn({ name: 'custrecord_transaction_account' }),
                search.createColumn({ name: 'custrecord_expense_account' }),
                search.createColumn({ name: 'custrecord_bill_name' }),
                search.createColumn({ name: 'isinactive' })
            ]
        });

        let line = 0;

        ruleSearch.run().each((result) => {
            const internalId = result.getValue({ name: 'internalid' });
            const name = result.getValue({ name: 'custrecord_vendor_description' }) || ' ';
            const vendor = result.getText({ name: 'custrecord_vendor_name' }) || ' ';
            const transactionAccount = result.getText({ name: 'custrecord_transaction_account' }) || ' ';
            const expenseAccount = result.getText({ name: 'custrecord_expense_account' }) || ' ';
            const billName = result.getValue({ name: 'custrecord_bill_name' }) || ' ';
            const inactive = result.getValue({ name: 'isinactive' }) === true ||
                             result.getValue({ name: 'isinactive' }) === 'T'
                ? 'Yes'
                : 'No';

            sublist.setSublistValue({
                id: 'custpage_col_internalid',
                line: line,
                value: String(internalId)
            });

            sublist.setSublistValue({
                id: 'custpage_col_name',
                line: line,
                value: String(name)
            });

            sublist.setSublistValue({
                id: 'custpage_col_vendor',
                line: line,
                value: String(vendor)
            });

            sublist.setSublistValue({
                id: 'custpage_col_transaction_account',
                line: line,
                value: String(transactionAccount)
            });

            sublist.setSublistValue({
                id: 'custpage_col_expense_account',
                line: line,
                value: String(expenseAccount)
            });

            sublist.setSublistValue({
                id: 'custpage_col_bill_name',
                line: line,
                value: String(billName)
            });

            sublist.setSublistValue({
                id: 'custpage_col_inactive',
                line: line,
                value: inactive
            });

            line++;
            return true;
        });

        context.response.writePage(form);
    }

    function runGlobalScheduledScript(context) {
        try {
            const todayExecution = getTodayExecution();

            if (todayExecution.exists) {
                renderAlreadyExecutedPage(context, todayExecution);
                return;
            }

            const logId = createExecutionLog();

            const scheduledTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: SCHEDULED_SCRIPT_ID,
                deploymentId: SCHEDULED_DEPLOY_ID,
                params: {
                    custscript_log_id: String(logId)
                }
            });

            const taskId = scheduledTask.submit();

            record.submitFields({
                type: EXECUTION_LOG_RECORD_TYPE,
                id: logId,
                values: {
                    custrecord_execution_id: String(taskId)
                }
            });

            const form = serverWidget.createForm({
                title: 'Amex Reconciliation In Progress'
            });

            form.clientScriptModulePath = './CS_Amex_Rules.js';

            const messageField = form.addField({
                id: 'custpage_info',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Info'
            });

            messageField.defaultValue = `
                <div style="padding:12px; font-size:14px;">
                    <p><b>Success.</b> The Amex Reconciliation was sent for execution.</p>
                    <p>Task ID: <b>${escapeHtml(taskId)}</b></p>
                    <p>Execution Log ID: <b>${escapeHtml(logId)}</b></p>
                    <p>Note: <b>An email will be sent when the task finishes.</b></p>
                </div>
            `;

            form.addButton({
                id: 'custpage_btn_back',
                label: 'Back',
                functionName: 'goBack'
            });

            context.response.writePage(form);

        } catch (e) {
            const form = serverWidget.createForm({
                title: 'Error With Amex Reconciliation'
            });

            form.clientScriptModulePath = './CS_Amex_Rules.js';

            const errorField = form.addField({
                id: 'custpage_error',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Error'
            });

            errorField.defaultValue = `
                <div style="padding:12px; color:#b00020; font-size:14px;">
                    <p><b>Error launching Amex Execution.</b></p>
                    <pre>${escapeHtml(e.name + ': ' + e.message)}</pre>
                </div>
            `;

            form.addButton({
                id: 'custpage_btn_back_error',
                label: 'Back',
                functionName: 'goBack'
            });

            context.response.writePage(form);
        }
    }

    function getTodayExecution() {
    const today = format.format({
        value: new Date(),
        type: format.Type.DATE
    });

    const executionSearch = search.create({
        type: EXECUTION_LOG_RECORD_TYPE,
        filters: [
                ['custrecord_execution_date', 'on', today]
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
                search.createColumn({ name: 'custrecord_execution_id' }),
                search.createColumn({ name: 'custrecord_execution_date_time' }),
                search.createColumn({ name: 'custrecord_execution_status' }),
                search.createColumn({ name: 'custrecord_execution_user' }),
                search.createColumn({ name: 'created' })
            ]
        });

        const results = executionSearch.run().getRange({
            start: 0,
            end: 1
        });

        if (!results || !results.length) {
            return { exists: false };
        }

        return {
            exists: true,
            internalId: results[0].getValue({ name: 'internalid' }),
            taskId: results[0].getValue({ name: 'custrecord_execution_id' }) || '',
            executionDateTime: results[0].getValue({ name: 'custrecord_execution_date_time' }) || '',
            status: results[0].getValue({ name: 'custrecord_execution_status' }) || '',
            user: results[0].getValue({ name: 'custrecord_execution_user' }) || '',
            created: results[0].getValue({ name: 'created' }) || ''
        };
    }

    function createExecutionLog() {
        const now = new Date();

        const logRec = record.create({
            type: EXECUTION_LOG_RECORD_TYPE,
            isDynamic: true
        });

        logRec.setValue({
            fieldId: 'custrecord_execution_date',
            value: now
        });

        logRec.setValue({
            fieldId: 'custrecord_execution_date_time',
            value: now
        });

        logRec.setValue({
            fieldId: 'custrecord_execution_status',
            value: 'Pending'
        });

        logRec.setValue({
            fieldId: 'custrecord_execution_user',
            value: String(runtime.getCurrentUser().name || runtime.getCurrentUser().id)
        });

        return logRec.save({
            enableSourcing: false,
            ignoreMandatoryFields: false
        });
    }

    function renderAlreadyExecutedPage(context, todayExecution) {
        const form = serverWidget.createForm({
            title: 'Amex Reconciliation Already Executed Today'
        });

        form.clientScriptModulePath = './CS_Amex_Rules.js';

        const infoField = form.addField({
            id: 'custpage_already_executed_info',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Info'
        });

        infoField.defaultValue = `
            <div style="padding:12px; font-size:14px;">
                <p><b>This process already ran today.</b></p>
                <p>Status: <b>${escapeHtml(todayExecution.status || 'Pending')}</b></p>
                <p>Execution Date/Time: <b>${escapeHtml(todayExecution.executionDateTime || todayExecution.created || '')}</b></p>
                <p>Task ID: <b>${escapeHtml(todayExecution.taskId || '')}</b></p>
            </div>
        `;

        form.addButton({
            id: 'custpage_btn_back_already_executed',
            label: 'Back',
            functionName: 'goBack'
        });

        context.response.writePage(form);
    }

    function buildExecutionInfoHtml(todayExecution) {
        if (!todayExecution.exists) {
            return `
                <div style="padding:12px; margin-bottom:10px; background:#f0f8ff; border:1px solid #cfe2ff;">
                    <p style="margin:0;"><b>Today's Status:</b> No execution has been registered today.</p>
                </div>
            `;
        }

        return `
            <div style="padding:12px; margin-bottom:10px; background:#fff3cd; border:1px solid #ffecb5;">
                <p style="margin:0 0 6px 0;"><b>Today's Status:</b> Already executed today.</p>
                <p style="margin:0 0 6px 0;"><b>Status:</b> ${escapeHtml(todayExecution.status || 'Pending')}</p>
                <p style="margin:0 0 6px 0;"><b>Execution Date/Time:</b> ${escapeHtml(todayExecution.executionDateTime || todayExecution.created || '')}</p>
                <p style="margin:0;"><b>Task ID:</b> ${escapeHtml(todayExecution.taskId || '')}</p>
            </div>
        `;
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    return {
        onRequest
    };
});
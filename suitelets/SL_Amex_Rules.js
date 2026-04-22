/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/task'], (
    serverWidget,
    search,
    task
) => {

    const CUSTOM_RECORD_TYPE = 'customrecord_amex_vendors_rules';
    const SCHEDULED_SCRIPT_ID = 'customscript_ss_amex_rules';
    const SCHEDULED_DEPLOY_ID = 'customdeploy_ss_amex_rules';

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

        form.addButton({
            id: 'custpage_btn_new_rule',
            label: 'New Rule',
            functionName: 'goToNewRecord'
        });

        form.addButton({
            id: 'custpage_btn_run_global',
            label: 'Run Amex Reconciliation',
            functionName: 'runGlobalScript'
        });

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
            const scheduledTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: SCHEDULED_SCRIPT_ID,
                deploymentId: SCHEDULED_DEPLOY_ID
            });

            const taskId = scheduledTask.submit();

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
                    <p>Task ID: <b>${taskId}</b></p>
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
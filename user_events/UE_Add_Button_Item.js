/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * Version  Date            	Author          		Details
 * 1.0      04/07/2025    	Cristian Orrego    	    Initial version	
 */
define(['N/ui/serverWidget'], function(serverWidget) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.VIEW) {
            var form = context.form;
            form.clientScriptModulePath = 'SuiteScripts/IDICO SCRIPT/CEDSCRIPTS/CS_View_Legacy_History.js';

            form.addButton({
                id: 'custpage_open_external_window',
                label: 'Legacy History',
                functionName: 'openExternalWindow'
            });
        }
    }

    return {
        beforeLoad: beforeLoad
    };
});

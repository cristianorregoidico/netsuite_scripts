/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * Version  Date            	Author          		Details
 * 1.0      2/04/2025    	Cristian Orrego    	    Initial version		
 */
define(['N/ui/message', 'N/record', 'N/log', 'N/ui/dialog'], function(message, record, log, dialog) {
    function saveRecord(context) {
        var currentRecord = context.currentRecord;

        // Reemplaza 'custbody_mi_campo' con el ID del campo que deseas monitorear
        var fieldValue = currentRecord.getValue({ fieldId: 'custbody_gross_profit_percent_final_vc' });

        if (fieldValue < 15) {
            log.debug('⚠️ Atención: El valor de este campo es menor a 15.');
            //alert("⚠️ Atención: El valor de este campo es menor a 15.");
          var options = {
                        title: 'GM por debajo de 15%',
                        message: "⚠️ Atención: El margen de la transacción está por debajo de 15%."
                    };
          dialog.alert(options);
        }
        log.debug('Valor del GM: ' + fieldValue);
        return true; // Permite guardar la transacción
    }

    return {
        saveRecord: saveRecord
    };
});
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @author Cristian Orrego
 * Version  Date            	Author          		Details
 * 1.0      2/10/2025    	Cristian Orrego    	    Initial version		
**/
 
define(['N/record', 'N/log'], function (record, log) {
    function fieldChanged(context) {
        var currentRecord = context.currentRecord;

        if(context.sublistId === 'taxdetails' && context.fieldId === 'netamount'){
            var lineIndex = context.line; // Índice de la línea actual
            log.debug('Línea Actual', lineIndex);
            var netAmount = currentRecord.getCurrentSublistValue({
                sublistId: 'taxdetails',
                fieldId: 'netamount'
            });
            log.debug('Net Amount', netAmount);

            if(netAmount > 0){
                log.debug('Calculando base de imp', netAmount);
                currentRecord.setCurrentSublistValue({
                    sublistId: 'taxdetails',
                    fieldId: 'taxbasis',
                    value: netAmount.toFixed(2) // Redondeamos a 2 decimales
                });
                log.debug('Base de imp registarda', netAmount);

            }
        }
        // Verificar si el campo cambiado es "taxcode" en la sublista "taxdetails"
        if (context.sublistId === 'taxdetails' && context.fieldId === 'taxrate') {
            var lineIndex = context.line; // Índice de la línea actual
            log.debug('Línea Actual', lineIndex);
            // Obtener el taxcode
            var taxCode = currentRecord.getCurrentSublistValue({
                sublistId: 'taxdetails',
                fieldId: 'taxcode'
            });
            log.debug('Tax Code', taxCode);
            log.debug('Tax Code Type Of', typeof taxCode);
            log.debug('Tax Code Int', typeof parseInt(taxCode));

            var isIca = validateIca(parseInt(taxCode));
            log.debug('Is Ica', isIca);
            
            log.debug('Capturando el Tax Rate');
            var taxRate = currentRecord.getCurrentSublistValue({
                sublistId: 'taxdetails',
                fieldId: 'taxrate'
            });
            log.debug('Tax Rate obtenido', taxRate);
            
            log.debug('Capturando el Base de Imp');
            var taxbasis = currentRecord.getCurrentSublistValue({
                sublistId: 'taxdetails',
                fieldId: 'taxbasis'
            });
            log.debug('Base de imp obtenido', taxbasis);
            if (taxbasis && taxRate) {
                var taxAmount = 0;
                if(isIca){
                    taxAmount = taxbasis * (taxRate / 1000);
                }else{
                    taxAmount = taxbasis * (taxRate / 100);
                };
                //var taxAmount = taxbasis * (taxRate / 100);
                log.debug("Tax Amount", taxAmount);
                log.debug('Cálculo Tax Amount', 'Línea: ' + lineIndex + ' | Tax Amount: ' + taxAmount.toFixed(2));

                currentRecord.setCurrentSublistValue({
                    sublistId: 'taxdetails',
                    fieldId: 'taxamount',
                    value: taxAmount.toFixed(2) // Redondeamos a 2 decimales
                });
            }
        }
    }

    function validateIca(taxCode) {
        var icaCodesIDs = [
            364068, 364068, 364075, 364067, 364066, 364065
        ]
        if(icaCodesIDs.includes(taxCode)){
            return true;
        }
        return false;
    }

    return {
        fieldChanged: fieldChanged
    };
});
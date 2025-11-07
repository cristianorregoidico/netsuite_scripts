/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @author Cristian Orrego
 * Version  Date            	Author          		Details
 * 1.0      07/11/2025    	Cristian Orrego    	    Initial version		
**/
 
define(['N/record', 'N/log'], function (record, log) {
    function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        var taxChile = 0.19;
        var taxChilepercent = taxChile * 100;
        var customForm = currentRecord.getValue({
                fieldId: 'customform'
            });
        log.debug('Custom Form', customForm);
        if(context.sublistId === 'taxdetails' && context.fieldId === 'netamount' && customForm == 265){

            var lineIndex = context.line; // Índice de la línea actual
            log.debug('Línea Actual', lineIndex);
            var netAmount = currentRecord.getCurrentSublistValue({
                sublistId: 'taxdetails',
                fieldId: 'netamount'
            });
            log.debug('Net Amount', netAmount);

            var taxAmount = netAmount * taxChile;
            log.debug('Tax Amount Calculado', taxAmount);

            if(netAmount > 0){
                log.debug('Calculando base de imp', netAmount);
                currentRecord.setCurrentSublistValue({
                    sublistId: 'taxdetails',
                    fieldId: 'taxbasis',
                    value: netAmount.toFixed(2) // Redondeamos a 2 decimales
                });
                log.debug('Base de imp registarda', netAmount);

                log.debug('Seteando tax type', 115);
                currentRecord.setCurrentSublistValue({
                    sublistId: 'taxdetails',
                    fieldId: 'taxtype',
                    value: 115 
                });
                log.debug('Tax type seteado', 115);


                log.debug('Seteando tax rate', taxChile);
                currentRecord.setCurrentSublistValue({
                    sublistId: 'taxdetails',
                    fieldId: 'taxrate',
                    value: taxChilepercent // Redondeamos a 2 decimales 
                });
                log.debug('Tax rate Seteado', taxChile);

                log.debug('Seteando tax amount', taxAmount);
                currentRecord.setCurrentSublistValue({
                    sublistId: 'taxdetails',
                    fieldId: 'taxamount',
                    value: taxAmount.toFixed(2) // Redondeamos a 2 decimales 
                });
                log.debug('Tax amount Seteado', taxAmount);

            }

            // var taxType = currentRecord.getCurrentSublistValue({
            //     sublistId: 'taxdetails',
            //     fieldId: 'taxtype'
            // });
            // log.debug('Tax type', taxType);
            // log.debug('Tax type Type Of', typeof taxType);

            // if(taxType == 115){
            //     log.debug('Seteando tax code', 487605);
            //     currentRecord.setCurrentSublistValue({
            //         sublistId: 'taxdetails',
            //         fieldId: 'taxcode',
            //         value: '487605' 
            //     });
            //     log.debug('Tax code Seteado', 487605);
            // }
        }
        
    }


    return {
        fieldChanged: fieldChanged
    };
});
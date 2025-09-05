/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Author Cristian Orrego
 * @Description Setear campos "Regional Value Content" y "OEM" en el sublist "Item" de la Invoice
 */
define(['N/record', 'N/log'], function(record, log) {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            return;
        }
        log.debug("Loading record")
        var recId = context.newRecord.id;
        var recType = context.newRecord.type;
        log.debug("recId", recId)
        // Reload the record in dynamic mode so we can update sublist fields
        var rec = record.load({
            type: recType,
            id: recId,
            isDynamic: false
        });

        var lineCount = rec.getLineCount({ sublistId: 'item' });
        log.debug("lineCount", lineCount)
        for (var i = 0; i < lineCount; i++) {
          log.debug("Setting line", i)
            rec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_regional_value_content', // <-- your column ID
                line: i,
                value: 3
            });
            rec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_evol_oem', // <-- your column ID
                line: i,
                value: 2
            });
          log.debug("Setting line done", i)
        }
        log.debug("Saving record")
        rec.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
        });
        log.debug("Saving record done")
    }

    return {
        afterSubmit: afterSubmit
    };
});
/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record'], function(record) {
    function onAction(context) {
        var rec = context.newRecord;
        var lineCount = rec.getLineCount({ sublistId: 'item' });

        for (var i = 0; i < lineCount; i++) {
            rec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_regional_value_content', // Your custom column field
                line: i,
                value: 3
            });
        }

        return rec.save();
    }

    return { onAction: onAction };
});

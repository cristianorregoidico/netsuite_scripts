/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record'], function (record) {
    function beforeLoad(context) {
        if (context.type !== context.UserEventType.VIEW &&
            context.type !== context.UserEventType.EDIT) return;

        var rec = context.newRecord;
        var customEmail = rec.getValue('custbody_custom_email_address');
        var email = 'cristianorrego@idico.com'

        if (customEmail) {
            rec.setValue({
                fieldId: 'email',
                value: email
            });
        }
    }

    return {
        beforeLoad: beforeLoad
    };
});

/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Validates custentity_additional_emails so it only contains valid emails
 * separated by semicolons (;).
 */

define([], () => {

    const EMAIL_FIELD_ID = 'custentity_additional_emails';

    // Simple email regex (good enough for UI validation)
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateEmails(value) {
        if (!value) {
            // Empty field is OK
            return { valid: true };
        }

        // Reject commas explicitly
        if (value.indexOf(',') !== -1) {
            return {
                valid: false,
                message: 'Use semicolons (;) to separate emails. Commas (,) are not allowed.'
            };
        }

        // Split by semicolon
        const rawParts = value.split(';');

        // Track invalid items
        const invalidParts = [];

        for (let i = 0; i < rawParts.length; i++) {
            const part = rawParts[i];
            const trimmed = part.trim();

            // Empty between ;; or leading/trailing ;
            if (!trimmed) {
                invalidParts.push('(empty between semicolons)');
                continue;
            }

            if (!EMAIL_REGEX.test(trimmed)) {
                invalidParts.push(trimmed);
            }
        }

        if (invalidParts.length > 0) {
            return {
                valid: false,
                message:
                    'The field "Additional Emails" must contain valid email addresses ' +
                    'separated only by semicolons (;) e.g. john@company.com;jane@company.com\n\n' +
                    'Invalid value(s):\n- ' + invalidParts.join('\n- ')
            };
        }

        return { valid: true };
    }

    function validateField(context) {
        const currentRecord = context.currentRecord;
        const fieldId = context.fieldId;

        if (fieldId !== EMAIL_FIELD_ID) {
            return true;
        }

        const value = currentRecord.getValue({ fieldId: EMAIL_FIELD_ID }) || '';
        const result = validateEmails(value);

        if (!result.valid) {
            alert(result.message);
            return false; // cancels leaving the field
        }

        return true;
    }

    // Extra safety: validate on save as well
    function saveRecord(context) {
        const currentRecord = context.currentRecord;
        const value = currentRecord.getValue({ fieldId: EMAIL_FIELD_ID }) || '';
        const result = validateEmails(value);

        if (!result.valid) {
            alert(result.message);
            return false; // prevent save
        }

        return true;
    }

    return {
        validateField,
        saveRecord
    };
});

/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Version   Date            Author             Details
 * 1.0       Dec 02, 2025    Cristian Orrego    Ticket # 1178.
 */

define(['N/runtime', 'N/search', 'N/record'],
    /**
     * @param {runtime} runtime
     * @param {search} search
     */
    (runtime, search, record) => {

        // --- Variables ---
        const LOGISTICS_EMAIL = 'logistics@idico.com';
        const PURCHASE_ORDER_PATH = 'purchord'; // Referer path for Purchase Order
        const OTHER_RECIPIENTS_SUBLIST_ID = 'otherrecipientslist';
        const EMAIL_FIELD_ID = 'email';
        const CC_FIELD_ID = 'cc';
        let linkedPurchaseOrder = null;

        /**
         * Verifica si un correo electrónico ya existe en la sublista de destinatarios.
         * @param {Record} msgObj - El objeto de registro de mensaje (scriptContext.newRecord).
         * @param {string} emailToFind - El correo electrónico a buscar.
         * @returns {boolean} True si el correo ya existe, false en caso contrario.
         */
        const emailExistsInRecipients = (msgObj, emailToFind) => {
            const lineCount = msgObj.getLineCount({ sublistId: OTHER_RECIPIENTS_SUBLIST_ID });

            for (let i = 0; i < lineCount; i++) {
                const recipientEmail = msgObj.getSublistValue({
                    sublistId: OTHER_RECIPIENTS_SUBLIST_ID,
                    fieldId: EMAIL_FIELD_ID,
                    line: i
                });
                if (recipientEmail === emailToFind) {
                    return true;
                }
            }
            return false;
        };



        /**
         * Añade un nuevo destinatario (con CC) a la sublista.
         * @param {Record} msgObj - El objeto de registro de mensaje.
         * @param {string} email - El correo electrónico a añadir.
         * @param {number} lineIndex - El índice de la línea donde añadir.
         */
        const addRecipientToSublist = (msgObj, email, lineIndex, to = false) => {
            let cc_mode = 'cc';
            msgObj.setSublistValue({
                sublistId: OTHER_RECIPIENTS_SUBLIST_ID,
                fieldId: EMAIL_FIELD_ID,
                line: lineIndex,
                value: email
            });
            if (to) {
                cc_mode = 'toRecipients';
            }
            msgObj.setSublistValue({
                sublistId: OTHER_RECIPIENTS_SUBLIST_ID,
                fieldId: cc_mode,
                line: lineIndex,
                value: true
            });
            log.debug('Email Added to CC', `Added ${email} at line ${lineIndex}`);
        };

        /**
         * Retorna el email del Sales Rep de una Sales Order dada su ID.
         * @param {number|string} salesOrderId - El ID interno de la Sales Order.
         * @returns {string|null} El email del Sales Rep, o null si no se encuentra o hay un error.
         */
        function getSalesRepEmailFromSalesOrder(salesOrderId) {
            try {
                if (!salesOrderId) {
                    log.debug('getSalesRepEmailFromSalesOrder', 'Sales Order ID is null or empty.');
                    return null;
                }

                // Cargar la Sales Order
                const salesOrder = record.load({
                    type: record.Type.SALES_ORDER,
                    id: salesOrderId,
                    isDynamic: false
                });
                // Corrección de string template
                log.debug('getSalesRepEmailFromSalesOrder', 'Sales Order ' + salesOrderId + ' loaded successfully.');

                // Obtener el ID del Sales Rep (campo 'salesrep')
                const salesRepId = salesOrder.getValue({ fieldId: 'salesrep' });
                // Corrección de string template
                log.debug('getSalesRepEmailFromSalesOrder', 'Sales Rep ID for SO ' + salesOrderId + ': ' + salesRepId);

                if (salesRepId) {
                    // Cargar el registro del empleado (Sales Rep es un tipo de empleado)
                    const employeeRecord = record.load({
                        type: record.Type.EMPLOYEE,
                        id: salesRepId,
                        isDynamic: false
                    });
                    const employeeEmail = employeeRecord.getValue({ fieldId: 'email' });
                    // Corrección de string template
                    log.debug('getSalesRepEmailFromSalesOrder', 'Email for Sales Rep ' + salesRepId + ': ' + employeeEmail);

                    if (employeeEmail && employeeEmail.trim() !== '') {
                        return employeeEmail;
                    } else {
                        // Corrección de string template
                        log.debug('getSalesRepEmailFromSalesOrder', 'Email for Sales Rep ' + salesRepId + ' is empty.');
                        return null;
                    }
                } else {
                    log.debug('getSalesRepEmailFromSalesOrder', 'No Sales Rep found on Sales Order ' + salesOrderId + '.');
                    return null;
                }
            } catch (e) {
                // Corrección de string template
                log.error('getSalesRepEmailFromSalesOrder Error', 'Failed to get Sales Rep email for SO ' + salesOrderId + '. Error: ' + e.message + ', Stack: ' + e.stack);
                return null;
            }
        }

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            const { newRecord: msgRecord, type: contextType, request } = scriptContext;
            const aditionalRecipientsToAdd = [];
            const transactionType = record.Type.PURCHASE_ORDER;
            const actualRecipient = msgRecord.getValue({ fieldId: 'recipientemail' })
            log.debug('recipientemail', actualRecipient)

            // Para entornos de producción, considera envolver los logs en una condición de entorno
            // if (runtime.env === 'SANDBOX' || runtime.env === 'DEVELOPMENT') {
            //     log.debug('Request Headers', request?.headers?.referer);
            //     log.debug('Context Type', contextType);
            // }

            // Guard Clause: Solo procede si es CREATE o EDIT
            if (contextType !== scriptContext.UserEventType.CREATE && contextType !== scriptContext.UserEventType.EDIT) {
                log.debug('Skipping Script', `Not CREATE or EDIT event. Type: ${contextType}`);
                return;
            }

            const referer = request?.headers?.referer || ''; // Manejo de referer nulo/indefinido
            log.debug('Referer', referer);
            log.debug('templatetype', request?.parameters?.templatetype)
            const transactionId = request?.parameters?.transaction;
            const isEmail = request?.parameters?.templatetype === 'EMAIL' ? true : false;
            log.debug("isEmail", isEmail)

            log.debug("transactionId", transactionId)

            // Guard Clause: Solo procede si el referer incluye "purchord"
            if (!referer.includes(PURCHASE_ORDER_PATH) || !isEmail) {
                log.debug('Skipping Script', `Referer does not include "${PURCHASE_ORDER_PATH}". Referer: ${referer}`);
                return;
            }
            try {
                linkedPurchaseOrder = record.load({
                    type: transactionType, // Usamos el tipo directamente
                    id: transactionId,
                    isDynamic: false // Usar modo estático para mejor rendimiento
                });
                log.debug('Purchase Order Loaded', 'Purchase Order cargada exitosamente: ID: ' + transactionId);
            } catch (eLoad) {
                log.error('Error cargando la Purchase Order', 'ID: ' + transactionId + ', Error: ' + eLoad.message + ', Stack: ' + eLoad.stack);
                return;
            }

            const rfqEmailFieldId = 'custbody_rfq_email';
            const rfqEmailValue = linkedPurchaseOrder.getValue({ fieldId: rfqEmailFieldId });
            log.debug("RFQ Email", rfqEmailValue)
            if (rfqEmailValue) {
                aditionalRecipientsToAdd.push(rfqEmailValue);
            }
            const createdFromId = linkedPurchaseOrder.getValue({ fieldId: 'createdfrom' });
            const salesRepEmail = getSalesRepEmailFromSalesOrder(createdFromId);
            log.debug("Sales Rep Email", salesRepEmail);
            if (salesRepEmail) {
                aditionalRecipientsToAdd.push(salesRepEmail);
            }
            // Obtener información del usuario actual
            const currentUser = runtime.getCurrentUser();
            // const currentUserId = currentUser.id; // No utilizado en la lógica final, pero útil para depurar.
            const currentUserEmail = currentUser.email;

            log.debug('Current User Email', currentUserEmail);
            log.debug('Target Logistics Email', LOGISTICS_EMAIL);

            let otherRecipientsLineCount = msgRecord.getLineCount({ sublistId: OTHER_RECIPIENTS_SUBLIST_ID });
            log.debug('Other Recipients Line Count', otherRecipientsLineCount);

            // Verificar si el correo de logística ya está en la lista de destinatarios
            const logisticsEmailAlreadyAdded = emailExistsInRecipients(msgRecord, LOGISTICS_EMAIL);
            log.debug('Logistics Email Already Added?', logisticsEmailAlreadyAdded);
            if (!logisticsEmailAlreadyAdded) {
                aditionalRecipientsToAdd.push(LOGISTICS_EMAIL);
            }
           

            if (!logisticsEmailAlreadyAdded) {
                addRecipientToSublist(msgRecord, LOGISTICS_EMAIL, otherRecipientsLineCount);
                otherRecipientsLineCount++;
            }
            if (rfqEmailValue !== '') {
                addRecipientToSublist(msgRecord, rfqEmailValue, otherRecipientsLineCount, to = true);
                otherRecipientsLineCount++;
            }
            if (salesRepEmail !== '') {
                addRecipientToSublist(msgRecord, salesRepEmail, otherRecipientsLineCount);
                otherRecipientsLineCount++;
            }

        };

        return { beforeLoad };
    });
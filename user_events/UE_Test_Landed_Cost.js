/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Script User Event para actualizar un campo en el Item Receipt.
 * Se ejecuta en la creación o edición del documento.
 */
define(['N/log'],
    /**
     * @param {N_log} log
     */
    (log) => {

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            const newRecord = scriptContext.newRecord;
            const eventType = scriptContext.type;

            // CONCATENACIÓN AJUSTADA:
            log.debug('beforeSubmit Triggered', 'Record Type: ' + newRecord.type + ', Event Type: ' + eventType);

            // Verificar si el evento es CREATE o EDIT
            if (eventType === scriptContext.UserEventType.CREATE || eventType === scriptContext.UserEventType.EDIT) {
                try {
                    // *** INICIO DE LA LÓGICA DE ACTUALIZACIÓN DE TU CAMPO ***

                    // 1. Define el ID de tu campo a actualizar
                    //    Asegúrate de que este sea el ID correcto de tu campo personalizado (custbody_XXXX)
                    //    o el ID de un campo estándar si ese es el caso.
                    const freightOutAmountFieldId = 'landedcostamount3'; // <-- ¡IMPORTANTE! Reemplaza con el ID de tu campo
                    const freightOutSourceFieldId = 'landedcostsource3'
                    const landedCostMethodFieldId = 'landedcostmethod'
                    
                    // 2. Define el nuevo valor para el campo
                    let newValueFreightOutAmount = 80.00; // <-- Define el valor que quieres establecer
                    let newValueFreightOutSource = 'MANUAL'; // <-- Define el valor que quieres establecer
                    let newValueLandedCostMethod = 'VALUE'; // <-- Define el valor que quieres establecer

                    // Ejemplo de lógica condicional (puedes adaptarla a tus necesidades):
                    // Si quieres que el valor dependa de otro campo en el Item Receipt
                    const transactionDate = newRecord.getValue({ fieldId: 'trandate' });
                    const subsidiaryId = newRecord.getValue({ fieldId: 'subsidiary' });
                    const memo = newRecord.getValue({ fieldId: 'memo' });



                    // 3. Actualizar el valor del campo
                    newRecord.setValue({
                        fieldId: landedCostMethodFieldId,
                        value: newValueLandedCostMethod,
                        ignoreFieldChange: true // Opcional: evita que otros scripts de cliente o lógica de campo se disparen
                    });

                    newRecord.setValue({
                        fieldId: freightOutAmountFieldId,
                        value: newValueFreightOutAmount,
                        ignoreFieldChange: true // Opcional: evita que otros scripts de cliente o lógica de campo se disparen
                    });

                    newRecord.setValue({
                        fieldId: freightOutSourceFieldId,
                        value: newValueFreightOutSource,
                        ignoreFieldChange: true // Opcional: evita que otros scripts de cliente o lógica de campo se disparen
                    });

                    // CONCATENACIÓN AJUSTADA:
                    log.debug('Campo Actualizado', 'Campo \'' + landedCostMethodFieldId + '\' actualizado a: ' + newValueLandedCostMethod);
                    log.debug('Campo Actualizado', 'Campo \'' + freightOutAmountFieldId + '\' actualizado a: ' + newValueFreightOutAmount);
                    log.debug('Campo Actualizado', 'Campo \'' + freightOutSourceFieldId + '\' actualizado a: ' + newValueFreightOutSource);

                    // *** FIN DE LA LÓGICA DE ACTUALIZACIÓN DE TU CAMPO ***

                } catch (e) {
                    // CONCATENACIÓN AJUSTADA:
                    log.error('Error en beforeSubmit del Item Receipt', 'Mensaje: ' + e.message + ', Stack: ' + e.stack);
                    // Opcional: Puedes lanzar una excepción para evitar que el documento se guarde si el error es crítico.
                    // throw new Error('No se pudo actualizar el campo: ' + e.message);
                }
            } else {
                // CONCATENACIÓN AJUSTADA:
                log.debug('Evento No Aplicable', 'El script solo se ejecuta en CREATE o EDIT. Tipo de evento actual: ' + eventType);
            }
        };

        return { beforeSubmit: beforeSubmit };

    });
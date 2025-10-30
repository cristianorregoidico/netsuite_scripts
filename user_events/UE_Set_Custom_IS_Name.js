/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @Author Cristian Orrego
 *
 * Descripción:
 * Llena automáticamente un campo personalizado con el nombre completo
 * del empleado o salesrep asociado a la transacción
 * al crear o editar (beforeSubmit).
 */

define(['N/search', 'N/log'], (search, log) => {

    const beforeSubmit = (context) => {
        try {
            const newRec = context.newRecord;
            const type = context.type;

            // Solo ejecutar en creación o edición
            if (type !== context.UserEventType.CREATE && type !== context.UserEventType.EDIT) return;

            // Buscar salesrep o employee
            const salesRepId = newRec.getValue({ fieldId: 'salesrep' }) || newRec.getValue({ fieldId: 'employee' });
            if (!salesRepId) return;

            // Buscar nombre y apellido
            const employeeData = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: salesRepId,
                columns: ['firstname', 'lastname']
            });

            const fullName = ((employeeData.firstname || '') + ' ' + (employeeData.lastname || '')).trim();

            // Setear el valor en el campo personalizado
            newRec.setValue({
                fieldId: 'custbody_custom_is_name', // ⚠️ Cambia por tu campo real
                value: fullName
            });

            log.debug('Nombre asignado', fullName);

        } catch (e) {
            log.error('Error en beforeSubmit', e);
        }
    };

    return { beforeSubmit };
});

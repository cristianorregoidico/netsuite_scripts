/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/redirect', 'N/log'], function(record, redirect, log) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.VIEW) {
            log.debug("En ejecución", "Antes de cargar el formulario");
            log.debug("context", JSON.stringify(context));
            var fulfillment = context.newRecord;
            log.debug("fulfillment", JSON.stringify(fulfillment));
            var rec = record.load({
                type: record.Type.ITEM_FULFILLMENT,
                id: fulfillment.id
            });
            var fulfillmentForm = rec.getValue('customform');
            log.debug("Form desde record.load", fulfillmentForm);

            // Mapea: Fulfillment Form 1 -> Packing Slip Form 1, etc.
            var packingSlipForm;
            if (fulfillmentForm == '271') { // ID del Formulario de Fulfillment 1
                packingSlipForm = '272'; // ID del Packing Slip 1
            } else { // ID Fulfillment 2
                packingSlipForm = '222'; // ID Packing Slip 2
            }
            log.debug("Fulfillment Form: ",fulfillmentForm);
            log.debug("Packing Slip Form: ",packingSlipForm);
            // Agregar botón para imprimir con el form correcto
            if (packingSlipForm) {
                log.debug("Agregando botón de impresión");
                context.form.addButton({
                    id: 'custpage_print_packing',
                    label: 'Print Packing Slip',
                    functionName: "window.open('/app/accounting/print/hotprint.nl?regular=T&trantype=itemship&id=" 
                                 + fulfillment.id + "&form=" + packingSlipForm + "')"
                });
            }
        }
    }
    return { beforeLoad: beforeLoad };
});

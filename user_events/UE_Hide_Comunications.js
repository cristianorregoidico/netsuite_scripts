/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/ui/serverWidget'], function(log, serverWidget) {

    function beforeLoad(context) {
        if (context.type === context.UserEventType.VIEW) {
            try {
                var form = context.form;
                
                // Opción 1: Ocultar el subtab completo de 'Communications'
                // Necesitas el ID del subtab. Frecuentemente es 'communications' o similar.
                // Tendrías que inspeccionar el código fuente para el ID exacto del subtab.
                // Si el ID es 'communications', el código sería:
                var communicationTab = form.getSublist({ id: 'communications' }); // o form.getTab({ id: 'communications' }); si es un tab de nivel superior
                if (communicationTab) {
                    communicationTab.isHidden = true;
                    log.debug('Subtab Communications ocultado', 'Modo: VIEW');
                } else {
                    log.debug('Subtab Communications no encontrado');
                }

                // Opción 2 (menos probable para un botón interno): Deshabilitar un botón por ID si NetSuite lo expone
                // Esto solo funciona si NetSuite expone el botón específico en la API del formulario.
                // Es muy poco probable que el botón de email sea directamente accesible así.
                // var emailButton = form.getButton({ id: 'tbl_newmessage' }); // No funcionará con IDs HTML directos.
                // if (emailButton) {
                //     emailButton.isHidden = true; // O emailButton.isDisabled = true;
                //     log.debug('Botón de email ocultado/deshabilitado');
                // }

            } catch (e) {
                log.error('Error en beforeLoad (User Event):', e);
            }
        }
    }

    return {
        beforeLoad: beforeLoad
    };
});
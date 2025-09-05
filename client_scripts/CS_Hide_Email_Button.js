/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord'], function (currentRecord) {

    function pageInit(context) {
        try {
            var element = document.getElementById('custpage_mi_campo');
            if (element) {
                element.style.display = 'none'; // Oculta el elemento
                console.log('Elemento ocultado correctamente');
            } else {
                console.log('Elemento no encontrado');
            }
        } catch (e) {
            console.error('Error al ocultar el elemento:', e);
        }
    }

    return {
        pageInit: pageInit
    };
});

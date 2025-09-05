/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * Version  Date            	Author          		Details
 * 1.0      04/07/2025    	Cristian Orrego    	    Initial version	
 */
define(['N/currentRecord', 'N/log'], function(currentRecord, log) {
    
    function openExternalWindow() {
        try {
            var rec = currentRecord.get();
            var itemId = rec.id;
            var externalId = rec.getValue({ fieldId: 'externalid' });
            log.debug('itemId', itemId);
            log.debug('externalId', externalId);

            var url = 'https://idicod4itools.azurewebsites.net/items?id=' + itemId + '&externald=' + encodeURIComponent(externalId);
            var windowSettings = "location=yes,height=500,width=800,scrollbars=yes,status=yes"
            window.open(url, ' ', windowSettings);
            log.debug('url', url);
        } catch (e) {
            console.error('Error abriendo ventana externa:', e.message);
            alert('No se pudo abrir la página externa. Verifica que el campo External ID tenga valor.');
        }
    }

    return {
        pageInit: function() {},
        openExternalWindow: openExternalWindow
    };
});

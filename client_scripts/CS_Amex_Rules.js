/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([], () => {

    function pageInit(context) {
        // Entry point requerido por NetSuite
    }

    function goToNewRecord() {
        // IMPORTANTE:
        // Reemplaza YOUR_RECORD_TYPE_ID por el rectype real que usa tu custom record en la URL nativa de NetSuite.
        // Un truco fácil:
        // abre el botón nativo "New" de ese record y copia la URL.
        window.location.href = '/app/common/custom/custrecordentry.nl?rectype=1801';
    }

    function runGlobalScript() {
        const currentUrl = window.location.href;
        const separator = currentUrl.indexOf('?') === -1 ? '?' : '&';
        window.location.href = currentUrl + separator + 'action=run_global';
    }

    function goBack() {
        window.history.back();
    }

    return {
        pageInit,
        goToNewRecord,
        runGlobalScript,
        goBack
    };
});
/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @Author Fernando Valencia
 * @ScriptName CO SS | Certificados Retención
 * Description: Genera en pdf los certificados de retención
 * ScriptFile co_certificados_retencion_ss.js
 * ScriptId customscript_co_certificado_reten_ss
 * ScriptDeployment customdeploy_co_certificado_reten_ss
 */

define(['N/translation', 'N/ui/serverWidget', 'N/format', 'N/record', 'N/redirect','N/ui/message','../../../SuiteApps/com.netsuite.lcbfn/co.common/co_license_checker'],
    function ( translation, serverWidget, format, record, redirect,message,licenseChecker) {

        // TIPO_RETENCION_IVA = 1;
        // TIPO_RETENCION_ICA = 2;
        // TIPO_RETENCION_FUENTE = 3;
        // TIPO_RETENCION_RENTA = 4;

        //var tipoRetencion = '';
        //var retencionLetras = { 1: 'IVA', 2: 'ICA', 3: 'FUENTE', 4: 'RENTA' };
        var tipoCertificado = null;

        var handler = {};

        handler.onRequest = function (context) {
            try {
                //log.debug('context', JSON.stringify(context.request));
                if (context.request.method == 'GET') {
                    var hasLicense = licenseChecker.checkLicense();
                    get(context.response,hasLicense);
                } else {
                    post(context.request);
                }
            } catch (e) {
                log.error('onRequest', JSON.stringify(e));
            }
        };

        /**
         * Muestra el formulario para ingresar los parametros
         *
         * @param response
         */
        function get(response, hasLicense) {
            try {

                var etiquetas = translation.load({
                    collections: [{
                        alias: 'T', collection: 'custcollection_co_withholding_cert_translations',
                        keys: [
                            'CO_CERT_RETENCION', 'CO_TIPO_CERT', 'CO_FILTERS', 'CO_VENDOR', 'CO_SUBSIDIARY', 'CO_FROMDATE', 'CO_TODATE',
                            'CO_EXPDATE', 'CO_SUMMARIZED', 'CO_NOTES', 'CO_SUBMIT', 'CO_CERTTYPE_HELP', 'CO_VENDOR_HELP',
                            'CO_SUBSIDIARY_HELP', 'CO_FROMDATE_HELP', 'CO_TODATE_HELP', 'CO_NOTES_HELP', 'CO_SUMMARIZED_HELP', 'CO_EXPDATE_HELP'
                        ]
                    }]
                });
                var form = serverWidget.createForm(etiquetas.T.CO_CERT_RETENCION());
                form.addFieldGroup({ id: 'filters', label: etiquetas.T.CO_FILTERS() });

                form.addField({
                    id: 'custpage_tipo_certificado',
                    label: etiquetas.T.CO_TIPO_CERT(),
                    type: serverWidget.FieldType.SELECT,
                    source: 'customlist_co_withholding_names',
                    container: 'filters'
                }).isMandatory = true;

                form.addField({
                    id: 'subsidiary', label: etiquetas.T.CO_SUBSIDIARY(), type: serverWidget.FieldType.SELECT,
                    source: 'subsidiary', container: 'filters'
                }).isMandatory = true;

                var tpEntity = form.addField({
                    id: 'tpentity', label: etiquetas.T.CO_VENDOR(), type: serverWidget.FieldType.MULTISELECT,
                    source: 'customrecord_cseg_co_thirdparty', container: 'filters'
                }).isMandatory = true;
                tpEntity.defaultValue = null;

                form.addField({
                    id: 'fromdate', label: etiquetas.T.CO_FROMDATE(),
                    type: serverWidget.FieldType.DATE, container: 'filters'
                }).isMandatory = true;

                form.addField({
                    id: 'todate', label: etiquetas.T.CO_TODATE(),
                    type: serverWidget.FieldType.DATE, container: 'filters'
                }).isMandatory = true;

                var expDate = form.addField({ id: 'expdate', label: etiquetas.T.CO_EXPDATE(), type: serverWidget.FieldType.DATE });
                expDate.isMandatory = true;
                expDate.defaultValue = format.format({ value: new Date(), type: format.Type.DATE });

                form.addField({ id: 'notes', label: etiquetas.T.CO_NOTES(), type: serverWidget.FieldType.LONGTEXT });
                form.addField({ id: 'summarized', label: etiquetas.T.CO_SUMMARIZED(), type: serverWidget.FieldType.CHECKBOX }).defaultValue = 'T';

                asignHelp(form, etiquetas);

                //form.setScript('customscript_co_certificado_formulario');
                if(hasLicense) {
                    form.addSubmitButton({label: etiquetas.T.CO_SUBMIT()});
                }else{
                    form.addPageInitMessage({type: message.Type.WARNING, message: translation.get({collection: 'custcollection_co_general_translations',key:'CUST_MESSAGE_NO_LICENSE'})()});
                }
                response.writePage(form);
            } catch (e) {
                log.error('ERROR: get', JSON.stringify(e));
            }
        }

        function asignHelp(form, etiquetas) {
            try {
                form.getField('custpage_tipo_certificado').setHelpText({ help: etiquetas.T.CO_CERTTYPE_HELP() });
                form.getField('tpentity').setHelpText({ help: etiquetas.T.CO_VENDOR_HELP() });
                form.getField('subsidiary').setHelpText({ help: etiquetas.T.CO_SUBSIDIARY_HELP() });
                form.getField('fromdate').setHelpText({ help: etiquetas.T.CO_FROMDATE_HELP() });
                form.getField('todate').setHelpText({ help: etiquetas.T.CO_TODATE_HELP() });
                form.getField('notes').setHelpText({ help: etiquetas.T.CO_NOTES_HELP() });
                form.getField('summarized').setHelpText({ help: etiquetas.T.CO_SUMMARIZED_HELP() });
                form.getField('expdate').setHelpText({ help: etiquetas.T.CO_EXPDATE_HELP() });
            } catch (e) {
                log.error('ERROR: asignHelp', JSON.stringify(e));
            }
        }

        /**
         * Construye el pdf para imprimir
         *
         * @param request
         */
        function post(request) {

            try {
                tipoCertificado = request.parameters.custpage_tipo_certificado;
                var subsidiary = request.parameters.subsidiary;
                var notes = request.parameters.notes;

                log.debug('post', 'Inicia el proceso del Certificado, de tipo ' + tipoCertificado);

                //tipoRetencion = retencionLetras[tipoCertificado] || 'DESCONOCIDO';

                var terceros = request.parameters.tpentity.split(String.fromCharCode(5));

                var fromDate = format.parse({ value:request.parameters.fromdate, type: format.Type.DATE });
                var toDate = format.parse({ value:request.parameters.todate, type: format.Type.DATE });
                var expDate = format.parse({ value:request.parameters.expdate, type: format.Type.DATE });
                //log.debug('post', 'From ' + fromDate + '\nTo ' + toDate + '\nExpDate ' + expDate);

                var esResumen = request.parameters.summarized == 'T' ? true : false;
                //log.debug('post', 'Resumen ' + esResumen);

                if (Date.parse(fromDate) > Date.parse(toDate)) {
                    throw new Error('La fecha inicial es mayor a la fecha final. Verificar');
                }

                //Se crea el registro para iniciar el proceso de generación de los PDFs, mediante un userevent
                var customTransaction = record.create({ type: 'customrecord_co_certificado_retencion', isDynamic: true });

                customTransaction.setValue({ fieldId: 'custrecord_co_tipo_certificado', value: tipoCertificado });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_desde', value: fromDate });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_hasta', value: toDate });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_fecha_exp', value: expDate });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_subsidiary', value: subsidiary });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_resumido', value: esResumen });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_tpentities', value: terceros });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_notas', value: notes });
                customTransaction.setValue({ fieldId: 'custrecord_co_certificado_estado', value: 'Pendiente' });
                var id = customTransaction.save();
                redirect.toRecord({ id: id, type: 'customrecord_co_certificado_retencion' });

            } catch (e) {
                log.debug('post', 'Finaliza el proceso del Certificado con error.');
                log.error('ERROR: post', JSON.stringify(e));
            }
        }
        return handler;
    }
);

/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @ScriptName  CO | Certificado retenciones Masivo
 * @ScriptId    customscript_co_certificado_reten_mr
 * @NModuleScope Public
 * @Company Netsoft
 * @Author Fernando Valencia Rosas
 *
 */

define(['N/search', 'N/record', 'N/format', 'N/file', 'N/render', 'N/runtime', '../../../SuiteApps/com.netsuite.lcbfn/co.withholdigCertificates/co_lb_util.js'],
    function (search, record, format, file, render, runtime, amountToWords) {

        /**
         * Se obtienen los datos generales necesarios para la creación de los pdfs, estos provienen
         * del registro padre customrecord_co_certificado_retencion,
         * este se crea en el suitelet y llena los campos de la cabecera.
         * Se modifica el estado del registro de log para que quede en estado "En ejecucion".
         * Se crean el Header y el Footer de los txt que sera el mismo para todos
         * por ultimo se crea un objeto con los datos y se envia al map
         */
         function getInputData() {
            try {
                var scriptRuntime = runtime.getCurrentScript();
                var idRecord = scriptRuntime.getParameter({name: 'custscript_co_id_registro_cert_reten_t'});
                var retencionLetras = {1: 'IVA', 2: 'ICA', 3: 'FUENTE', 4: 'RENTA'};
                var setup = record.load({type: 'customrecord_co_certificado_retencion', id: idRecord});
                var procesados = []//buscarProcesados(idRecord);
                record.submitFields({
                    id: idRecord,
                    type: 'customrecord_co_certificado_retencion',
                    values: {'custrecord_co_certificado_estado': 'En ejecución'}
                });
                var tipoCertificado = setup.getValue({fieldId: 'custrecord_co_tipo_certificado'});
                var fromDate = format.format({
                    value: setup.getValue({fieldId: 'custrecord_co_certificado_desde'}),
                    type: format.Type.DATE
                });
                var toDate = format.format({
                    value: setup.getValue({fieldId: 'custrecord_co_certificado_hasta'}),
                    type: format.Type.DATE
                });
                var expDate = format.format({
                    value: setup.getValue({fieldId: 'custrecord_co_certificado_fecha_exp'}),
                    type: format.Type.DATE
                });
                var subsidiary = setup.getValue({fieldId: 'custrecord_co_certificado_subsidiary'});
                var esResumen = setup.getValue({fieldId: 'custrecord_co_certificado_resumido'}) ? true : false;
                var terceros = setup.getValue({fieldId: 'custrecord_co_certificado_tpentities'});
                var memo = setup.getValue({fieldId: 'custrecord_co_certificado_notas'});

                var infoSubsidiary = infoSubsidiaria(subsidiary, fromDate, toDate);
                var recSetupCertReten = loadSetupCertReten(subsidiary);
                var headerHtml = buildHeaderHTML(infoSubsidiary, recSetupCertReten, retencionLetras[tipoCertificado]);
                var footerHtml = buildFooterHTML(infoSubsidiary, retencionLetras[tipoCertificado], expDate);

                var listaRetenciones = [];
                listaRetenciones = getRetenciones(fromDate, toDate, subsidiary, tipoCertificado, terceros, esResumen, procesados);
                //listaRetenciones.title = 'search certificado retención';
                //listaRetenciones.save();
                var resultados = getResults(listaRetenciones);
                log.debug('getInputData', JSON.stringify(resultados));
                return obtenerObjetoResultados(resultados, infoSubsidiary, headerHtml, footerHtml, memo, retencionLetras[tipoCertificado], tipoCertificado, recSetupCertReten, esResumen, expDate);
            } catch (e) {
                log.error({ title: 'getInputData', details: e });
            }
        }

        /**
         * Se agrupan los resultados por los diferentes proveedores
         */
        function map(context) {
            try {
                var data = JSON.parse(context.value);
                log.audit("key", [data.tpEntityId + data.city, data.tipoRetencion])
                var key = data.tipoRetencion == "ICA" ? data.tpEntityId + data.city : data.tpEntityId
                context.write({
                    key: key,
                    value: data
                });

            } catch (e) {
                log.error({ title: 'map', details: e });
            }
        }

        /**
         * Con la información agrupada se procede a crear el cuerpo del pdf
         * Se unen todas las partes y se transforma el XML en un PDF, este se guarda y
         * finalmente se crea un detalle del registro padre, donde se indica el proveedor y el PDF
         * @param context
         */
        function reduce(context) {
            var scriptRuntime = runtime.getCurrentScript();
            var idRecord = scriptRuntime.getParameter({ name: 'custscript_co_id_registro_cert_reten_t' });
            try {
                var info = context.values;
                var datosVendor = null;
                var vendorHeader = '';
                var vendorBody = '<table style="width: 100%">';
                var vendorFooter = '';
                var totalMontosBase = 0;
                var totalRentecion = 0;
                var data = null;
                for (var i = 0; i < info.length; i++) {
                    data = JSON.parse(info[i]);
                    if (!datosVendor) {
                        datosVendor = {};
                        datosVendor.name = data.vendorName;
                        log.audit('reduce', 'Reduce para ' + data.vendorName)
                        datosVendor.taxRegNum = data.entityTaxRegNum;
                        datosVendor.digitoVerificacion = data.vendorDigitoVerificacion;
                        vendorHeader = buildVendorHeaderHTML(datosVendor, data);
                    }

                    var montoBase = data.montoBase;
                    var montoRetencion = data.montoRetencion;
                    var porcentaje = data.porcentaje;
                    var concepto = data.concepto;
                    totalMontosBase += parseFloat(montoBase);
                    totalRentecion += parseFloat(montoRetencion);
                    vendorBody += buildBodyHTML(concepto, montoBase, porcentaje, montoRetencion);
                }
                vendorBody += '</table>';
                //la variable data sigue funcionando por que queda con el ultimo, los datos que se utilizan en esta seccion son generales
                vendorFooter = buildVendorFooterHTML(totalMontosBase, totalRentecion, data.memo, data.expDate, data.letterCents, data.currencyIni);
                var xmlPdf = data.headerHtml + data.footerHtml + vendorHeader + vendorBody + vendorFooter;
                xmlPdf = nsUnsuported(xmlPdf);

                var fileObj = render.xmlToPdf({
                    xmlString: xmlPdf
                });

                if (data.tipoRetencion == 'ICA'){
                    fileObj.name = data.tipoRetencion + '_' + data.vendorName +'_' + data.city + '_' + format.format({ value: new Date(), type: format.Type.DATETIME }) + '.pdf';
                }else{
                    fileObj.name = data.tipoRetencion + '_' + data.vendorName + '_' + format.format({ value: new Date(), type: format.Type.DATETIME }) + '.pdf';
                }
                log.audit('folder ID', JSON.stringify(data.folderId));
                fileObj.folder = data.folderId;
                var idArchivo = fileObj.save();

                var detalle = record.create({ type: 'customrecord_co_certificado_detalle', isDynamic: true });
                detalle.setValue({ fieldId: 'custrecord_co_certificado_padre', value: idRecord });
                detalle.setValue({ fieldId: 'custrecord_co_certificado_tpentity', value: data.tpEntityId });
                detalle.setValue({ fieldId: 'custrecord_co_certificado_documento', value: idArchivo });
                detalle.save();

            } catch (e) {
                log.error({ title: 'reduce', details: e });
                var detalle = record.create({ type: 'customrecord_co_certificado_detalle', isDynamic: true });
                detalle.setValue({ fieldId: 'custrecord_co_certificado_padre', value: idRecord });
                detalle.setValue({ fieldId: 'custrecord_co_certificado_error', value: e });
                detalle.save();
            }
        }

        /**
         * Se actualiza el registro custscript_co_id_registro_cert_reten a finalizado
         * @param context
         */
        function summarize(context) {
            try {
                var scriptRuntime = runtime.getCurrentScript();
                var idRecord = scriptRuntime.getParameter({ name: 'custscript_co_id_registro_cert_reten_t' });
                record.submitFields({ id: idRecord, type: 'customrecord_co_certificado_retencion', values: { 'custrecord_co_certificado_estado': 'Finalizado' } });
                log.audit({ title: 'Fin', details: 'Metrica usada ' + context.usage });

            } catch (e) {
                log.error({ title: 'summarize', details: e });
            }
        }

        /**=====================================================================================================================**/
        /**                                                                                                                     **/
        /**=====================================================================================================================**/
        
        function infoSubsidiaria(subsidiariaId, fromDate, toDate) {
            try {
                var subsidiaria = record.load({ type: 'subsidiary', id: subsidiariaId });
                var logo = subsidiaria.getValue({ fieldId: 'pagelogo' });
                logo = (logo !== null) ? asignaLogo(logo) : '';
                var razonSocial = subsidiaria.getValue({ fieldId: 'legalname' }) || '';
                var addr1, city, rtn;
                var subsidiarySearchObj = search.create({
                    type: "subsidiary",
                    filters: [ ["internalid","anyof",subsidiariaId] ],
                    columns: [ "taxregistrationnumber", "address1",
                       search.createColumn({ name: "custrecord_co_city", join: "address" })]
                 });
                subsidiarySearchObj.run().each(function(result){
                    addr1 = result.getValue({ name: 'address1' }) || '';
                    city = result.getText({ name: 'custrecord_co_city', join: "address" }) || '';
                    rtn = result.getValue({ name: 'taxregistrationnumber' });
                    return false;
                });
                //var rtn = subsidiaria.getSublistValue({ sublistId: 'taxregistration', fieldId: 'taxregistrationnumber', line: 1 });
                rtn = rtn != null ? rtn : 'Federalidnumber sin diligenciar';
                var country = subsidiaria.getText({ fieldId: 'country' }) || '';
                var periodoGrav = '  Del ' +  fromDate  + '   al   ' +  toDate;
                log.debug('infoSubsi', 'Dirección: ' + addr1 + ', ' + city + ', ' + country);

                return { logo: logo, razonSocial: razonSocial, rtn: rtn, addr1: addr1, city: city, country: country, periodoGrav: periodoGrav, tipoRetencion: '' };
            } catch (e) {
                log.error('infoSubsidiaria', 'Error en infoSubsidiaria: ' + e);
                return {};
            }
        }

        function loadSetupCertReten(idsubsidiaria) {
            var recSetupCertReten = null;
            var filters = [], columns = [];
            var idRec = 0;
            var searchResults = null, result = [];

            try {
                if (idsubsidiaria) {
                    filters.push(['custrecord_co_setup_subsidiaria', 'anyof', idsubsidiaria]);
                    filters.push('AND');
                }
                filters.push(['isinactive', 'is', 'F']);

                columns.push(search.createColumn({ name: 'internalid' }));
                columns.push(search.createColumn({ name: 'custrecord_co_setup_subsidiaria' }));

                searchResults = search.create({ type: 'customrecord_co_setup_withholding_cert', columns: columns, filters: filters });
                result = searchResults.run().getRange(0, 1);
                if (result && result.length > 0) {
                    idRec = result[0].getValue('internalid');
                }
                if (idRec) {
                    recSetupCertReten = record.load({ type: 'customrecord_co_setup_withholding_cert', id: idRec });
                } else {
                    log.debug('loadSetupCertReten', 'No existe el registro customrecord_co_setup o no se localizo configuración para la subsidiaria: ' + idsubsidiaria);
                }
                
            } catch (e) {
                log.error('loadSetupCertReten', 'Error: ' + e);
            }

            return recSetupCertReten;
        }

        function getRetenciones(fromDate, toDate, subsidiary, tipoCertificado, terceros, resumen, procesados) {
            var searchResults = [];

            try {
                var taxCodes = getTaxCodes(tipoCertificado);
                //log.debug('getRetenciones', 'TaxCodes: '+taxCodes);
                var filterExpression = getFilters(fromDate, toDate, subsidiary, taxCodes, terceros, procesados);
                var columns = getColumns(resumen, taxCodes, tipoCertificado);

                searchResults = search.create({
                    type: 'transaction',
                    columns: columns,
                    filters: filterExpression,
                });

            } catch (e) {
                log.error('getRetenciones', 'Error en la consulta getRetenciones: ' + e);
            }
            return searchResults;
        }

        function getTaxCodes(tipoCertificado){
            var taxCodes = [];
            var salestaxitemSearchObj = search.create({
                type: "salestaxitem",
                filters: [["custrecord_co_withholding_category","anyof",tipoCertificado]],
                columns: ["internalid"]
             });
             salestaxitemSearchObj.run().each(function(result){
                taxCodes.push(result.getValue( { name: 'internalid' } ));
                return true;
             });
            return taxCodes;
        }

        function getFilters(fromDate, toDate, subsidiary, taxCodes, terceros, procesados) {
            var filterExpression = [];
            try {
                if (fromDate && toDate) {
                    log.debug('getRetenciones', 'fromDate: ' + fromDate + '.    toDate: ' + toDate);
                    filterExpression.push(['trandate', 'within', fromDate, toDate]);
                    filterExpression.push('AND');
                }

                if (subsidiary) {
                    log.debug('getRetenciones', 'subsidiary: ' + subsidiary);
                    filterExpression.push(['subsidiary', 'anyof', subsidiary]);
                    filterExpression.push('AND');
                }

                if (taxCodes) {
                    log.debug('getRetenciones', 'TaxCodes: ' + taxCodes);
                    filterExpression.push(['taxdetail.taxcode', 'anyof', taxCodes]);
                    filterExpression.push('AND');
                }

                if (terceros) {
                    log.debug('getRetenciones', 'terceros: ' + JSON.stringify(terceros));
                    filterExpression.push(['line.cseg_co_thirdparty', 'anyof', terceros]);
                    filterExpression.push('AND');
                }
                //Se quitan de la busqueda los que ya se procesaron
                if (procesados && procesados.length > 0) {
                    filterExpression.push(['line.cseg_co_thirdparty', 'noneof', procesados]);
                    filterExpression.push('AND');
                }
                filterExpression.push(["taxline","is","F"]);
                filterExpression.push('AND');
                filterExpression.push(['type', 'anyof', 'VendBill', 'VendCred', 'ExpRept']);
                filterExpression.push('AND');
                filterExpression.push(['posting', 'is', 'T']);
                filterExpression.push('AND');
                filterExpression.push(["taxdetail.taxamount","isnotempty",""]);

                log.debug('getFilters', "filterExpression: " + JSON.stringify(filterExpression));
            } catch (e) {
                log.error('getFilters', 'error creando filtros de búsqueda ' + e);
            }
            return filterExpression;
        }

        function getColumns(resumen, taxcodes, tipoCertificado) {
            var columns = [];
            try {
                columns.push(search.createColumn({ name: "line.cseg_co_thirdparty", summary: resumen ? "GROUP" : null }));
                //columns.push(search.createColumn({ name: "cseg_co_thirdparty", summary: resumen ? "GROUP" : null }));
                columns.push(search.createColumn({ name: "entitytaxregnum", summary: resumen ? "GROUP" : null }));

                columns.push(search.createColumn({ name: "custrecord_co_thirdparty_vendor", join: "line.cseg_co_thirdparty", summary: resumen ? "GROUP" : null }));
                columns.push(search.createColumn({ name: "taxcode", join: "taxDetail", summary: resumen ? "GROUP" : null }));
                //columns.push(search.createColumn({ name: "taxbasis", join: "taxDetail", summary: resumen ? "SUM" : null }));
                columns.push(search.createColumn({
                    name: "formulanumeric_1",
                    formula: "CASE WHEN {recordtype} = 'vendorcredit' THEN {taxdetail.taxbasis} * -1 ELSE {taxdetail.taxbasis} END",
                    label: "Formula (taxbasis)",
                    summary: resumen ? "SUM" : null
                }))
                columns.push(search.createColumn({
                    name: "formulanumeric_2",
                    formula: "{taxdetail.taxfxamount}",
                    label: "Formula (taxamount)",
                    summary: resumen ? "SUM" : null
                }))
                columns.push(search.createColumn({ name: "taxrate", join: "taxDetail", summary: resumen ? "GROUP" : null }));
                //columns.push(search.createColumn({ name: "taxamount", join: "taxDetail", summary: resumen ? "SUM" : null }));
                //columns.push(search.createColumn({ name: "taxfxamount", join: "taxDetail", summary: resumen ? "SUM" : null }));
                if(tipoCertificado == 2){
                    columns.push(search.createColumn({ name: "city", join: "location", summary: resumen ? "GROUP" : null }));
                }
                //columns.push(search.createColumn({name: "recordtype", label: "recordtype",  summary: resumen ? "GROUP" : null }))




                /*if (tipoCertificado == TIPO_RETENCION_IVA) {
                    columns.push(search.createColumn({ name: 'name', join: 'account', summary: resumen ? 'GROUP' : null }));
                    columns.push(search.createColumn({ name: 'number', join: 'account', summary: resumen ? 'GROUP' : null }));
                }

                if (tipoCertificado == TIPO_RETENCION_ICA) {
                    columns.push(search.createColumn({ name: 'custcol_co_categoria_ica', summary: resumen ? 'GROUP' : null }));
                }

                if (tipoCertificado == TIPO_RETENCION_FUENTE) {
                    columns.push(search.createColumn({ name: 'custcol_co_categoria_retencion', summary: resumen ? 'GROUP' : null }));
                }

                columns.push(search.createColumn({ name: 'formulacurrency', summary: resumen ? 'sum' : null, formula: "CASE {recordtype} WHEN 'vendorcredit' THEN {custcol_co_monto_origen} * {exchangerate}*-1 ELSE {custcol_co_monto_origen} * {exchangerate} END" }));
                columns.push(search.createColumn({ name: 'formulapercent', summary: resumen ? 'GROUP' : null, formula: 'ROUND({custcol_co_percent_retention}, 6)' }));
                columns.push(search.createColumn({ name: 'amount', summary: resumen ? 'sum' : null }));
                columns.push(search.createColumn({ name: 'entity', summary: resumen ? 'GROUP' : null, sort: search.Sort.DESC }));
                columns.push(search.createColumn({ name: 'internalid', join: 'custcol_co_tercero_entity', summary: resumen ? 'GROUP' : null }));
                columns.push(search.createColumn({ name: 'entityid', join: 'custcol_co_tercero_entity', summary: resumen ? 'GROUP' : null }));
                columns.push(search.createColumn({ name: 'custentity_co_tipo_documento', join: 'custcol_co_tercero_entity', summary: resumen ? 'GROUP' : null }));
                columns.push(search.createColumn({ name: 'custentity_co_num_identificacion', join: 'custcol_co_tercero_entity', summary: resumen ? 'GROUP' : null }));
                columns.push(search.createColumn({ name: 'custentity_co_digito_verificacion', join: 'custcol_co_tercero_entity', summary: resumen ? 'GROUP' : null }));
                if (!resumen) { columns.push(search.createColumn({ name: 'type', summary: resumen ? 'GROUP' : null })); }*/

            } catch (e) {
                log.error('getColumns', 'error creando las columnas ' + e);
            }
            return columns;
        }

        function obtenerObjetoResultados(resultados, infoSubsidiary, headerHtml, footerHtml, memo, tipoRetencion, tipoCertificado, recSetupCertReten, resumen, expDate) {
            var data = [];
            try {
                for (var i = 0; resultados && i < resultados.length; i++) {
                    var info = {};
                    info.logo = infoSubsidiary.logo;
                    info.razonSocial = infoSubsidiary.razonSocial;
                    info.rtn = infoSubsidiary.rtn;
                    info.addr1 = infoSubsidiary.addr1;
                    info.country = infoSubsidiary.country;
                    info.periodoGrav = infoSubsidiary.periodoGrav;
                    info.tipoRetencion = tipoRetencion;
                    info.tpEntityId = resultados[i].getValue({ name: 'line.cseg_co_thirdparty', summary: resumen ? 'GROUP' : null });
                    var vendorId = resultados[i].getValue({ name: 'custrecord_co_thirdparty_vendor', join: 'line.cseg_co_thirdparty', summary: resumen ? 'GROUP' : null });
                    var vendorSearch = search.lookupFields({
                        type: 'vendor', 
                        id: vendorId, 
                        columns: ["isperson", "companyname", "lastname", "firstname", "middlename", "custentity_co_identification_num", "custentity_co_verification_digit"]
                    });
                    log.debug('obtenerObjetoResultados', 'vendorSearch:' + JSON.stringify(vendorSearch));
                    info.entityTaxRegNum = vendorSearch.custentity_co_identification_num;
                    //NIT traido desde la transacción
                    /*if(info.entityTaxRegNum = resultados[i].getText({ name: 'entitytaxregnum', summary: resumen ? 'GROUP' : null })){
                        info.entityTaxRegNum = resultados[i].getText({ name: 'entitytaxregnum', summary: resumen ? 'GROUP' : null })
                    }else{
                        info.entityTaxRegNum = resultados[i].getValue({ name: 'entitytaxregnum', summary: resumen ? 'GROUP' : null }) || vendorSearch.custentity_co_identification_num;
                    }*/
                    info.vendorDigitoVerificacion = vendorSearch.custentity_co_verification_digit;
                    var vendorCity = search.lookupFields({ type: 'vendor', id: vendorId, columns: ["Address.custrecord_co_city"] });
                    if( vendorCity['Address.custrecord_co_city'].length > 0 ){
                        info.city = vendorCity['Address.custrecord_co_city'][0].text;
                    }
                    var persona = vendorSearch.isperson || 'F';
                    if (persona == 'F' || persona == false) {
                        info.vendorName = vendorSearch.companyname || 'Nombre no definido';
                    } else {
                        var lastName = vendorSearch.lastname;
                        var firstName = vendorSearch.firstname;
                        var middleName = vendorSearch.middlename;
                        info.vendorName = firstName + ' ' + middleName + ' ' + lastName;
                    }

                    //info.montoBase = resultados[i].getValue({ name: 'taxbasis', join: 'taxDetail', summary: resumen ? 'SUM' : null });
                    //info.montoRetencion = resultados[i].getValue({ name: 'taxfxamount', join: 'taxDetail', summary: resumen ? 'SUM' : null });
                    //info.recordType = resultados[i].getValue({ name: 'recordtype', summary: resumen ? 'GROUP' : null })
                    info.montoBase = resultados[i].getValue({ name: "formulanumeric_1",
                        formula: "CASE WHEN {recordtype} = 'vendorcredit' THEN {taxdetail.taxbasis} * -1 ELSE {taxdetail.taxbasis} END",
                        summary: resumen ? "SUM" : null })
                    info.montoRetencion = resultados[i].getValue({ name: "formulanumeric_2",
                        formula: "{taxdetail.taxfxamount}",
                        summary: resumen ? "SUM" : null });
                    info.porcentaje = resultados[i].getValue({ name: 'taxrate', join: 'taxDetail', summary: resumen ? 'GROUP' : null });
                    var taxID = resultados[i].getValue({ name: 'taxcode', join: 'taxDetail', summary: resumen ? 'GROUP' : null });
                    info.concepto= search.lookupFields({ type: 'salestaxitem', id: taxID, columns: ["description"] }).description;
                    log.debug("TipoCertidficado", tipoCertificado)
                    if (tipoCertificado == 2) {
                        info.city = resultados[i].getValue({
                            name: 'city',
                            join: 'location',
                            summary: resumen ? 'GROUP' : null
                        });
                    }
                    /*
                    if (tipoCertificado == TIPO_RETENCION_IVA) {
                        var numero = resultados[i].getValue({ name: 'number', join: 'account', summary: resumen ? 'GROUP' : null });
                        var nombre = resultados[i].getValue({ name: 'name', join: 'account', summary: resumen ? 'GROUP' : null });
                        info.concepto = nombre.replace(numero + ' ', '');
                    } else if (tipoCertificado == TIPO_RETENCION_ICA) {
                        info.concepto = resultados[i].getText({ name: 'custcol_co_categoria_ica', summary: resumen ? 'GROUP' : null });
                    } else if (tipoCertificado == TIPO_RETENCION_FUENTE) {
                        info.concepto = resultados[i].getText({ name: 'custcol_co_categoria_retencion', summary: resumen ? 'GROUP' : null });
                    }*/

                    info.headerHtml = headerHtml;
                    info.footerHtml = footerHtml;
                    info.memo = memo;
                    //log.debug('obtenerObjetoResultados', JSON.stringify(recSetupCertReten));
                    info.folderId = recSetupCertReten.getValue({ fieldId: 'custrecord_co_setup_certificado_folder' }) || crearFolder(recSetupCertReten.id, recSetupCertReten.type);
                    info.letterCents = recSetupCertReten.getValue({ fieldId: 'custrecord_co_centavos_letra' });
                    info.currencyIni = recSetupCertReten.getValue({ fieldId: 'custrecord_co_iniciales_moneda' });
                    info.expDate = expDate;
                    data.push(info);
                    log.debug("data CFOD", data)
                  log.debug("info CFOD", info)
                }
            } catch (e) {
                log.error('obtenerObjetoResultados: ', 'error al obtener la información de los certificados ' + e);
            }
            return data;
        }

        function crearFolder(setupID, setupType) {
            var id = 0;
            try {
                var folder = record.create({ type: 'folder' });
                folder.setValue('name', 'Certificados de retencion');
                id = folder.save();
                record.submitFields({ id: setupID, type: setupType, values: { 'custrecord_co_setup_certificado_folder': id } });
            } catch (e) {
                log.error('crearFolder: ', 'error al crear folder de certificados ' + e);
            }
            return id;
        }

        function getResults(searchResults) {
            var searchResult = [];
            try {
                var k = 0;
                var result = searchResults.run().getRange(k * 100, (k + 1) * 100);
                searchResult = searchResult.concat(result);
                while (result.length == 100) {
                    k++;
                    result = searchResults.run().getRange(k * 100, (k + 1) * 100);
                    searchResult = searchResult.concat(result);
                }
            } catch (e) {
                log.error('getResults', 'error obteniendo los resultados: ' + e);
            }
            return searchResult;
        }

        function asignaLogo(logo) {
            try {
                var urlImg = '', idimage = '';

                idimage = file.load({ id: logo });
                if (idimage !== null) {
                    urlImg = idimage.url;
                }

                return urlImg;
            } catch (e) {
                log.error('asignaLogo', 'Error en asignaLogo: ' + e);
                return '';
            }
        }

        function comma(number) {
            var text = '';

            try {
                number = parseFloat(number);
                number = number ? String(number).split('.') : "0.00".split('.');

                for (var i = number[0].length - 1; i >= 0; i--) {
                    text = number[0][i] + text;
                    text = ((number[0].length - i) % 3 === 0 && !isNaN(number[0][i - 1])) ? ',' + text : text;
                }

                text = !isNaN(number[0]) ? text : '0';
                text += '.';
                text += number[1] ? (number[1].length > 1 ? number[1].substr(0, 3) : number[1] + '0') : '00';
            } catch (e) {
                log.error('comma', 'Error en comma: ' + e);
            }

            return text;
        }

        /**
         * Construye el header del pdf
         *
         * @param infoSubsidiary
         * @param fromDate
         * @param toDate
         * @param municipio
         * @returns {String}
         */
        function buildHeaderHTML(infoSubsidiary, recSetupCertReten, tipoRetencion) {
            log.debug("BuildHeader", "Info subsidiaria: " + JSON.stringify(infoSubsidiary));
            var xml = "";
            var alto = 60,
                ancho = 100,
                alineacion = "center",
                logo = infoSubsidiary.logo;

            try {
                if (recSetupCertReten != null && recSetupCertReten) {
                    alto = recSetupCertReten.getValue({ fieldId: 'custrecord_co_setup_logo_hight' }) || alto;
                    ancho = recSetupCertReten.getValue({ fieldId: 'custrecord_co_setup_logo_width' }) || ancho;
                    alineacion = recSetupCertReten.getText({ fieldId: 'custrecord_co_setup_logo_alinea' }) ? recSetupCertReten.getText({ fieldId: 'custrecord_co_setup_logo_alinea' }).toLowerCase() : alineacion;
                    logo = recSetupCertReten.getValue({ fieldId: 'custrecord_co_imagen_logo' }) ? asignaLogo(recSetupCertReten.getValue({ fieldId: 'custrecord_co_imagen_logo' })) : logo;
                }
                log.debug('buildHeaderHTML', 'alto: ' + alto + '    ancho: ' + ancho + '       alineacion_' + alineacion);

                xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
                xml += "<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"http://big.faceless.org/products/report/report-1.1.dtd\">\n";
                xml += "<pdf>\n";
                xml += "<head>\n";
                xml += "<style> body {font-family: Helvetica,sans-serif; font-size:10px;} table {border:0px} td {border:0px} </style>";
                xml += "<macrolist>\n";
                xml += "<macro id=\"myheader\">";

                xml += '<table style="width: 100%;">';
                if (logo) {
                    xml += '    <tr>';
                    xml += '        <td style="" align="' + alineacion + '">';
                    xml += '            <img src="' + logo + '" height="' + alto.toString() + 'px" width="' + ancho.toString() + 'px"/>';
                    xml += '        </td>';
                    xml += '    </tr>';
                }
                xml += '    <tr>';
                xml += '        <td style="" align="center">CERTIFICADO DE RETENCIÓN - CFOD ' + tipoRetencion + '</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td style="" align="center">' + infoSubsidiary.razonSocial + '</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td style="" align="center">' + infoSubsidiary.rtn + '</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td style="" align="center">' + infoSubsidiary.addr1 + '</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td style="" align="center">CERTIFICA</td>';
                xml += '    </tr>';
                xml += '</table>';
                xml += "</macro>";
            } catch (e) {
                log.error('buildHeaderHTML', 'Error: ' + e);
            }

            return xml;
        }

        function buildFooterHTML(infoSubsidiary, tipoRetencion, expDate) {
            var xml = '';

            try {
                xml += "<macro id=\"myfooter\">";
                xml += '<table style="width: 100%;">';
                xml += '    <tr>';
                xml += '        <td align="left">Se expide el presente certificado en la ciudad de ' + infoSubsidiary.city + ', ' + infoSubsidiary.country + ' al ' + expDate + '.</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td align="left">El presente certificado se expide conforme a lo establecido en el Art. 381 del Estatuto Tributario.</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td align="left">Certificado de Retención ' + tipoRetencion + ' expedido en forma continua impresa en computador, no requiere firma autografa de conformidad con el artículo 10 del Decreto 836 de 1991 y concepto DIAN 105489 de Diciembre de 2007.</td>';
                xml += '    </tr>';
                xml += '</table>';
                xml += "</macro>";
                xml += "</macrolist>\n";
                xml += "</head>\n";
            } catch (e) {
                log.error('buildFooterHTML', 'Error: ' + e);
            }

            return xml;
        }

        function buildVendorHeaderHTML(datosVendor, data) {
            var xml = "";
            log.audit('buildVendorHeaderHTML', 'datosVendor: ' + JSON.stringify(datosVendor));

            try {
                xml += "<body header='myheader' header-height='60mm' footer='myfooter' footer-height='10mm'>";
                xml += '<table style="width: 100%">';
                xml += '    <tr>';
                xml += '        <td  align="left" style="width:100%;" >Periodo Gravable:</td>';
                xml += '        <td align="left" style="width:100%;" >' + data.periodoGrav + '</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td align="left" style="width:100%;">Nombre o razón social a quién se le practica la retención:</td>';
                xml += '        <td align="left" style="width:100%;">' + datosVendor.name + '</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td align="left" style="width:100%;">C.C. o NIT:</td>';
                //Validación de NIT y dígito verificador
                if (datosVendor.taxRegNum && datosVendor.digitoVerificacion ) {
                    if (datosVendor.digitoVerificacion || datosVendor.digitoVerificacion == '0') {
                        xml += '        <td align="left" style="width:100%;">' + datosVendor.taxRegNum.trim() + '-' + datosVendor.digitoVerificacion.trim() + '</td>';
                    } else {
                        xml += '        <td align="left" style="width:100%;">' + datosVendor.taxRegNum.trim() /*+ '-' + 'Dígito verificador sin diligenciar'*/+ '</td>';
                    }
                } else if (datosVendor.taxRegNum) {
                    xml += '        <td align="left" style="width:100%;">' + datosVendor.taxRegNum.trim() /*+ '-' + 'Dígito verificador sin diligenciar'*/ + '</td>';
                } else if (datosVendor.digitoVerificacion || datosVendor.digitoVerificacion == '0') {
                    xml += '        <td align="left" style="width:100%;">' + 'NIT sin diligenciar' + '-' + datosVendor.digitoVerificacion.trim() + '</td>';
                } else {
                    xml += '        <td align="left" style="width:100%;">' + 'NIT sin diligenciar' /*+ '-' + 'Dígito verificador sin diligenciar'*/ + '</td>';
                }
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td align="left" style="width:100%;">Concepto pago sujeto a retención:</td>';
                //xml += '      <td align="left" style="width:100%;">IVA</td>'; // TODO: pendiente de que poner aqui
                xml += '        <td align="left" style="width:100%;">' + data.tipoRetencion + '</td>'; // TODO: pendiente de que poner aqui

                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td align="left" style="width:100%;">Ciudad donde se practicó la retención:</td>';
                //xml += '      <td align="left" style="width:100%;">' + datosVendor.municipioConsignar + '</td>';
                xml += '        <td align="left" style="width:100%;">' + data.city + ', ' + data.country + '</td>';
                xml += '    </tr>';
                xml += '    <tr>';
                xml += '        <td align="left" style="width:100%;">Ciudad donde se consignó la retención:</td>';
                //xml += '      <td align="left" style="width:100%;">' + datosVendor.municipioConsignar + '</td>';
                xml += '        <td align="left" style="width:100%;">' + data.city + ', ' + data.country + '</td>';
                xml += '    </tr>';
                xml += '</table>';

                xml += '<table style="width: 100%;margin-top:20px">';
                xml += '    <tr>';
                xml += '        <td align="left" style="width:50%;" ><strong>CONCEPTO</strong></td>';
                xml += '        <td align="left" style="width:10%;" ><strong>VR. BASE</strong></td>';
                xml += '        <td align="right" style="width:20%;" ><strong>TASA %</strong></td>';
                xml += '        <td align="right" style="width:20%;" ><strong>VR. RETENIDO</strong></td>';
                xml += '    </tr>';
                xml += '</table>';

            } catch (e) {
                log.error('buildVendorHeaderHTML', 'Error en buildVendorHeaderHTML: ' + e);
            }

            return xml;
        }

        function buildBodyHTML(concepto, montoBase, porcentaje, montoRetencion) {
            var xml = '';

            try {
                xml += '<tr>';
                xml += '<td align="left" style="width:70%; ">' + concepto + '</td>';
                xml += '<td align="right" style="width:5%; margin-right: 111px;"><p align="right">$' + comma(montoBase) + '</p></td>';
                xml += '<td align="right" style="width:5%; margin-right: 75px;">' + porcentaje + '</td>';
                xml += '<td align="right" style="width:20%;">$' + comma(montoRetencion > 0 ? montoRetencion : montoRetencion * -1) + '</td>';
                xml += '</tr>';
            } catch (e) {
                log.error('buildBodyHTML', 'Error en buildBodyHTML: ' + e);
            }

            return xml;
        }

        function buildVendorFooterHTML(totalMontosBase, totalRentecion, notes, expDate, cents, initials) {
            var xml = "";

            try {
                xml += '<table style="width: 100%">';
                xml += '<tr>';
                xml += '<td align="right" style="width:50%;"><strong></strong></td>';
                xml += '<td align="right" style="width:10%;"><strong>------------------------------------</strong></td>';
                xml += '<td align="right" style="width:20%;"><strong>-----------------------------------</strong></td>';
                xml += '<td align="right" style="width:20%;"><strong>------------------------------------</strong></td>';
                xml += '</tr>';

                xml += '<tr>';
                xml += '<td align="left" style="width:50%;"><strong>TOTAL</strong></td>';
                xml += '<td align="right" style="width:10%;" >$<strong>' + comma(totalMontosBase) + '</strong></td>';
                xml += '<td align="right" style="width:20%;" ><strong>    </strong></td>';
                xml += '<td align="right" style="width:20%;" >$<strong>' + comma(totalRentecion >= 0 ? totalRentecion : totalRentecion * -1) + '</strong></td>';
                xml += '</tr>';

                var currIni = initials || 'COP';
                //log.debug('VendorFooter','centavos: ' + cents);
                var cantidadword = amountToWords.toWords(totalRentecion >= 0 ? totalRentecion : totalRentecion * -1, 'spanish', 'COP', currIni, cents).toUpperCase();

                xml += '</table>';
                xml += '<br></br>';
                xml += '<table style="width: 100%">';
                xml += '<tr>';
                xml += '<td align="left" style="width:50%;"><strong>VALOR : </strong>' + cantidadword + '</td>';
                xml += '</tr>';
                xml += '<tr>';
                xml += '<td align="left" style="width:50%;"><strong>NOTAS : </strong>' + (notes != null ? notes : '') + '</td>';
                xml += '</tr>';
                xml += '</table>';

                xml += '<br></br>';
                xml += '<br></br>';
                xml += '<table style="width: 100%;">';
                xml += '<tr>';
                xml += '<td align="left"><strong>FECHA DE EXPEDICIÓN : </strong>' + expDate + '</td>';
                xml += '</tr>';
                xml += '</table>';
                xml += "</body>";
                xml += "</pdf>";
            } catch (e) {
                log.error('buildVendorFooterHTML', 'Error en buildVendorFooterHTML: ' + e);
            }

            return xml;
        }

        function nsUnsuported(xml) {
            try {
                xml = xml.replace(/&/g, "&#38;");
                xml = xml.replace(/á/g, "&#225;");
                xml = xml.replace(/é/g, "&#233;");
                xml = xml.replace(/í/g, "&#237;");
                xml = xml.replace(/ó/g, "&#243;");
                xml = xml.replace(/ú/g, "&#250;");
                xml = xml.replace(/Á/g, "&#193;");
                xml = xml.replace(/É/g, "&#201;");
                xml = xml.replace(/Í/g, "&#205;");
                xml = xml.replace(/Ó/g, "&#211;");
                xml = xml.replace(/Ú/g, "&#218;");
                xml = xml.replace(/Ò/g, "&#210;");
                xml = xml.replace(/ñ/g, "&#241;");
                xml = xml.replace(/Ñ/g, "&#209;");
                xml = xml.replace(/®/g, "&#174;");
                xml = xml.replace(/©/g, "&#169;");
                xml = xml.replace(/ª/g, "&#170;");
                xml = xml.replace(/™/g, "&#153;");
                xml = xml.replace(/Ÿ/g, "&#159;");
                xml = xml.replace(/°/g, "&#176;");
                xml = xml.replace(/¼/g, "&#188;");
                xml = xml.replace(/½/g, "&#189;");
                xml = xml.replace(/¾/g, "&#190;");
                xml = xml.replace(/Ä/g, "&#196;");
                xml = xml.replace(/Ë/g, "&#203;");
                xml = xml.replace(/Ï/g, "&#207;");
                xml = xml.replace(/Ö/g, "&#214;");
                xml = xml.replace(/Ü/g, "&#220;");
                xml = xml.replace(/ÿ/g, "&#255;");
            } catch (e) {
                log.error('nsUnsuported', 'Error en nsUnsuported: ' + e);
            }
            return xml;
        }

        function buscarProcesados(idRecord) {
            //log.debug("buscarProcesados", 'idReg: ' + idRecord)
            var filters = [], columns = [], detalles = [];
            try {
                if (idRecord) {
                    filters.push(['custrecord_co_certificado_padre', 'is', idRecord]);
                }
                columns.push(search.createColumn({ name: 'custrecord_co_certificado_tpentity' }));
                var searchResults = search.create({ type: 'customrecord_co_certificado_detalle', columns: columns, filters: filters });
                var results = getResults(searchResults);
                log.debug("buscarProcesados", 'procesados: ' + JSON.stringify(results));
                for (var i = 0; i < results.length; i++) {
                    detalles.push(results[i].getValue({ fieldId: 'custrecord_co_certificado_tpentity' }));
                }
            } catch (e) {
                log.error('buscarProcesados', e);
            }
            return detalles;
        }


        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });
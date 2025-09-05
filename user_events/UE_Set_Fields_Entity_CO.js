/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @Autor Leopoldo Santiago Rodríguez
 * @NModuleScope SameAccount
 * @Company Netsoft
 * @Name CO | UE | SET FIELDS ENTITY
 * @Description Script in charge of generating the verification digit, concatenation of entity ID and establishing the relationship entity - Third parties.
 * scriptName: co_ue_set_fields_entity.js
 * idScript: customscript_co_ue_set_field_entity
 * idDeploy: customdeploy_co_ue_set_field_entity
 * Fecha: 11/06/2020
 */
define(['N/error', 'N/record', 'N/runtime', 'N/search'],function(error, record, runtime, search) {

    var handler = {}, entityRecord = null, numIdentificacion = '';
    var CODIGO_PAIS_COLOMBIA = 'CO', TIPO_DOCUMENTO_NIT = 6, TIPO_DOCUMENTO_PASAPORTE = 7;
    var arrPrimos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    var fieldTercero = {
        'customer'  : 'custrecord_co_thirdparty_customer',
        'vendor'    : 'custrecord_co_thirdparty_vendor',
        'employee'  : 'custrecord_co_thirdparty_employee',
        'contact'   : 'custrecord_co_thirdparty_contact',
        'othername' : 'custrecord_co_thirdparty_other',
        'partner'   : 'custrecord_co_thirdparty_partner'
    };

    function getCheckDigit(numIdentificacion) {
        var digito = -1;
        var suma = 0;
        for (var i = numIdentificacion.length - 1, j = 0; i >= 0; i--, j++) {
            suma += numIdentificacion.charAt(i) * arrPrimos[j];
        }
        var residuo = suma % 11;
        digito = (residuo > 1) ? 11 - residuo : residuo;
        return digito;
    }

    function getNumIdentifier(){
        var numIdentifier = '', country = '';
        if(entityRecord.type == 'contact' || entityRecord.type == 'employee'){
            numIdentifier = entityRecord.getValue({ fieldId: 'custentity_co_identification_num' }) || null;
        }else {
            for (var i = 0; i < entityRecord.getLineCount({ sublistId: 'taxregistration' }); i++){
                country = entityRecord.getSublistValue({ sublistId: 'taxregistration', fieldId: 'nexuscountry', line: i });
                if(country == CODIGO_PAIS_COLOMBIA){
                    numIdentifier = entityRecord.getSublistValue({ sublistId: 'taxregistration', fieldId: 'taxregistrationnumber', line: i }) || null;
                    break;
                }
            }
        }
        return numIdentifier;
    }

    function setCheckDigit(checkDigit){
        try{
            var idFieldDigit = (entityRecord.type == 'subsidiary') ? 'custrecord_co_subsidiary_verdigit' : 'custentity_co_verification_digit';
            numIdentificacion = getNumIdentifier();
            log.debug("numid", numIdentificacion)
            var digitoVerificador = '';
            if(!numIdentificacion){
                entityRecord.setValue({ fieldId: idFieldDigit, value: '', ignoreFieldChange: false });
                if(entityRecord.type != 'subsidiary'){
                    entityRecord.setValue({ fieldId: 'custentity_co_identification_num', value: '', ignoreFieldChange: false });
                }
                return;
            }
            entityRecord.setValue({ fieldId: 'custentity_co_identification_num', value: numIdentificacion, ignoreFieldChange: false });
            if (isNaN(numIdentificacion)) {
                entityRecord.setValue({fieldId: idFieldDigit, value: '', ignoreFieldChange: false});
                return;
            }//Contiene letras en numero de identificacion
            if (entityRecord.type == 'subsidiary'){
                digitoVerificador = getCheckDigit(numIdentificacion);
            }else {
                digitoVerificador = (checkDigit) ? getCheckDigit(numIdentificacion) : '';
            }
            log.debug('NSO_DIGITO_VERIFICADOR', digitoVerificador);
            entityRecord.setValue({ fieldId: idFieldDigit, value: digitoVerificador, ignoreFieldChange: false });
        }catch (e) {
            throw error.create({ name: e.name, message: e.message });
        }
    }

    function setEntityID(){
        try{
            var nameEntity = '';
            var entityID = '';
            if(entityRecord.type == 'contact' || entityRecord.type == 'employee'){
                nameEntity = entityRecord.getValue({ fieldId: 'firstname' }) + ' ' + entityRecord.getValue({ fieldId: 'lastname' }) ;
                entityID = nameEntity;

            }else {
                nameEntity = entityRecord.getValue({ fieldId: 'companyname' });
                entityID = nameEntity + ' ' + entityRecord.getValue({ fieldId: 'custentity_co_identification_num' });
            }
            entityRecord.setValue({ fieldId: 'autoname', value: false });
            //entityRecord.setValue({ fieldId: 'entityid', value: entityID.trim() });
            log.debug('NSO_ENTITY_ID', entityID);
        }catch (e) {
            throw error.create({ name: e.name, message: e.message });
        }
    }

    function setTerceros(context){
        try{
            var  idTercero = '';
            var arrayFilters = [];
            var numIdenticacionNew = entityRecord.getValue({ fieldId: 'custentity_co_identification_num' });
            var thirdParty = entityRecord.getValue({ fieldId: 'cseg_co_thirdparty' });
            log.debug("third", thirdParty)
            if(!numIdenticacionNew){ return; }
            if (context.type == 'create' || context.type == 'copy' || (context.type == 'edit' && !thirdParty)) {
                arrayFilters.push(["custrecord_co_thirdparty_taxregnumber", "is", numIdenticacionNew]);
                arrayFilters.push("AND");
            }else if(context.type == 'edit'){
                var fieldsearchEntity = fieldTercero[entityRecord.type];
                arrayFilters.push(["custrecord_co_thirdparty_taxregnumber", "is", numIdenticacionNew]);
                arrayFilters.push("AND");
            }
            arrayFilters.push(["isinactive","is","F"]);
            log.debug('NSO_FILTERS', arrayFilters);
            var campoEntidad = fieldTercero[entityRecord.type]
            var buscaThirdParty = search.create({
                type: "customrecord_cseg_co_thirdparty",
                filters: [ arrayFilters ],
                columns: ['name', campoEntidad, 'custrecord_co_thirdparty_taxregnumber' ]
            });
            var resultados = buscaThirdParty.run().getRange({ start: 0, end: 1 }), terceroRecord = null;
            log.debug('NSO_BUSCA_TERCEROS', JSON.stringify(resultados));
            var nameEntity = '';
            if(entityRecord.type == 'contact' || entityRecord.type == 'employee'){
                nameEntity = entityRecord.getValue({ fieldId: 'firstname' }) + ' ' + entityRecord.getValue({ fieldId: 'lastname' }) ;
            }else {
                nameEntity = entityRecord.getValue({ fieldId: 'companyname' });
            }
            if(resultados.length > 0){
                log.debug('NSO_MESSAGE','--- SE EDITA UN TERCERO --');
                //Se carga el registro de terceros y se agrega el entity.
                idTercero = resultados[0].id;
                var taxid = resultados[0].getValue('custrecord_co_thirdparty_taxregnumber')
                var nombreTercero = resultados[0].getValue('name').replace(taxid, '')
                var campos = {};
                if (entityRecord.id == resultados[0].getValue(campoEntidad)){
                    nombreTercero = nameEntity
                }
                campos['name'] = nombreTercero +' '+ numIdenticacionNew
                log.debug('NSO_FIELD_TERCERO', campos);
                var idRecord = record.submitFields({
                    type: 'customrecord_cseg_co_thirdparty',
                    id: idTercero,
                    values: campos,
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields : true
                    }
                });
                log.debug('NSO_UPDATED_TERCERO', idRecord);
            }else{
                log.debug('NSO_MESSAGE', '--- SE CREA UN TERCERO ---');

                terceroRecord = record.create({ type: 'customrecord_cseg_co_thirdparty', isDynamic: true });
                terceroRecord.setValue({ fieldId: 'name', value: nameEntity +' '+ numIdenticacionNew });
                terceroRecord.setValue({ fieldId: 'custrecord_co_thirdparty_taxregnumber', value: numIdenticacionNew });
                terceroRecord.setValue({ fieldId: fieldTercero[entityRecord.type], value: entityRecord.id });//Se asigna el id del entity al campo correspondiente
                idTercero = terceroRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
            }
            log.debug('NSO_ID_THIRD_PARTY', idTercero);
            entityRecord.setValue({ fieldId: 'cseg_co_thirdparty', value: idTercero });//Se encontro el registro Third Party y se asigna al customer
        }catch (e) {
            throw error.create({ name: e.name, message: e.message });
        }
    }

    handler.afterSubmit = function (context) {
        try{
            if (context.type == 'edit' || context.type == 'create' || context.type == 'copy') {
                if (runtime.isFeatureInEffect({feature: 'subsidiaries'})) {
                    entityRecord = record.load({ type: context.newRecord.type, id: context.newRecord.id, isDynamic: true });
                    var idSubsidiaria = (entityRecord.type == 'subsidiary') ? entityRecord.id : entityRecord.getValue({ fieldId: 'subsidiary' });
                    var country = search.lookupFields({ type: 'subsidiary', id: idSubsidiaria, columns: ['country'] }).country[0].value;
                    if (country != CODIGO_PAIS_COLOMBIA) { return; }
                    if(entityRecord.type != 'subsidiary'){
                        var idDocumentType = entityRecord.getValue({ fieldId: 'custentity_co_document_type' });
                        var checkDigit = false;
                        if(idDocumentType) {
                            checkDigit = search.lookupFields({
                                type: 'customrecord_co_iddoctype',
                                id: idDocumentType,
                                columns: ['custrecord_co_idddoctype_verdigit']
                            }).custrecord_co_idddoctype_verdigit || false;
                        }
                        setCheckDigit(checkDigit);//Se obtiene digito verificador
                        setTerceros(context);//Se relaciona el registro de terceros relacionado
                        setEntityID();//ConcatenaciÃ³n de entity y Tax ID
                    }else {
                        setCheckDigit();//Se obtiene digito verificador
                    }
                    var recordId = entityRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
                }
            }
        }catch (e) {
            log.error('ERROR_AFTER_SUBMIT', JSON.stringify(e));
            var errorText = 'ERROR CODE: ' + e.name + '\nDESCRIPTION: ' + e.message;
            //throw errorText;
        }
    };

    return handler;

});
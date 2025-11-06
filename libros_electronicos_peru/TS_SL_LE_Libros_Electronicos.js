/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/search', 'N/log', 'N/redirect', 'N/task', 'N/runtime'],
    (ui, record, search, log, redirect, task, runtime) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === 'GET') {
                    //creamos el formulario
                    const form = ui.createForm({
                        title: 'Libros Electrónicos'
                    });
                    //creamos el btn submit
                    form.addSubmitButton({
                        label: 'Generar Reporte'
                    });

                    //creamos una seccion de reportes
                    form.addFieldGroup({
                        id: 'custpage_group_reportes',
                        label: 'Reportes'
                    });

                    //creamos un campo de texto
                    const cboReportes = form.addField({
                        id: 'custpage_cbo_reportes',
                        type: ui.FieldType.SELECT,
                        label: 'Libro',
                        source: 'customrecord_ts_le_lista_reportes',
                        container: 'custpage_group_reportes'
                    });
                    cboReportes.isMandatory = true;

                    form.clientScriptModulePath = './TS_CS_LE_Libros_Electronicos.js';

                    //creamos una seccion de parametros
                    form.addFieldGroup({
                        id: 'custpage_group_parametros',
                        label: 'Parámetros'
                    });

                    //validamos si existe el parametro custscript_ts_sl_le_params
                    if (scriptContext.request.parameters.custscript_ts_sl_le_params) {
                        let params = JSON.parse(scriptContext.request.parameters.custscript_ts_sl_le_params);
                        let reporte = params.reporte;
                        cboReportes.defaultValue = reporte;
                        let paramsReporte = getParamsReporte(reporte);

                        if (paramsReporte) {
                            paramsReporte.forEach(param => {
                                let field;

                                if (param.tipo_param == 'SELECT') {
                                    if (param.busq_guard_flag) {
                                        field = form.addField({
                                            id: param.id_param,
                                            type: param.tipo_param,
                                            label: param.name_param,
                                            container: 'custpage_group_parametros'
                                        });

                                        //busqueda guardada
                                        let searchSelect = search.load({
                                            id: param.origen_select
                                        });

                                        let searchSelectColumns = searchSelect.columns;

                                        searchSelect.run().each((result) => {
                                            field.addSelectOption({
                                                value: result.getValue(searchSelectColumns[0]),
                                                text: result.getValue(searchSelectColumns[1])
                                            });
                                            return true;

                                        }
                                        );

                                    } else {
                                        field = form.addField({
                                            id: param.id_param,
                                            type: param.tipo_param,
                                            label: param.name_param,
                                            source: param.origen_select,
                                            container: 'custpage_group_parametros'
                                        });
                                    }


                                } else {
                                    field = form.addField({
                                        id: param.id_param,
                                        type: param.tipo_param,
                                        label: param.name_param,
                                        container: 'custpage_group_parametros'
                                    });
                                }

                                field.isMandatory = param.req_param_flag;
                            }

                            );

                        }

                        let salidas = form.addField({
                            id: 'custpage_salidas',
                            type: ui.FieldType.SELECT,
                            label: 'Salida',
                            container: 'custpage_group_parametros'
                        });
                        salidas.isMandatory = true;

                        let scriptSalidas = getScriptSalidasDisponibles(reporte);

                        if (scriptSalidas.length > 0) {
                            scriptSalidas.forEach(scriptSalida => {
                                salidas.addSelectOption({
                                    value: scriptSalida.tipo_salida_text,
                                    text: scriptSalida.tipo_salida_text
                                });
                            });

                        }



                        let parametrosBuscados = form.addField({
                            id: 'custpage_parametros_buscados',
                            type: ui.FieldType.LONGTEXT,
                            label: 'Parametros Buscados',
                            container: 'custpage_group_parametros'
                        });
                        parametrosBuscados.defaultValue = JSON.stringify(paramsReporte);
                        parametrosBuscados.updateDisplayType({
                            displayType: ui.FieldDisplayType.HIDDEN
                        });
                        let parametrosSelect = form.addField({
                            id: 'custpage_parametros_select',
                            type: ui.FieldType.LONGTEXT,
                            label: 'Parametros Select',
                            container: 'custpage_group_parametros'
                        });
                        parametrosSelect.updateDisplayType({
                            displayType: ui.FieldDisplayType.HIDDEN
                        });
                    }

                    /***
                     * 
                     * Seccion de ejecuciones
                     */

                    //agregamos la lista de ejecuciones
                    let sublista = form.addSublist({
                        id: 'sublista',
                        type: ui.SublistType.STATICLIST,
                        label: 'Ejecuciones'
                    });


                    //agregamos un bton de actualizar

                    sublista.addRefreshButton();


                    sublista.addField({
                        id: 'reporte',
                        type: ui.FieldType.TEXT,
                        label: 'Reporte'
                    });

                    sublista.addField({
                        id: 'parametros',
                        type: ui.FieldType.TEXTAREA,
                        label: 'Parametros'
                    });

                    sublista.addField({
                        id: 'salida',
                        type: ui.FieldType.TEXT,
                        label: 'Salida'
                    });

                    sublista.addField({
                        id: 'estado',
                        type: ui.FieldType.TEXT,
                        label: 'Estado'
                    });

                    sublista.addField({
                        id: 'mensaje',
                        type: ui.FieldType.TEXTAREA,
                        label: 'Mensaje'
                    });

                    sublista.addField({
                        id: 'fecha_inicio',
                        type: ui.FieldType.TEXT,
                        label: 'Fecha Inicio'
                    });

                    sublista.addField({
                        id: 'fecha_fin',
                        type: ui.FieldType.TEXT,
                        label: 'Fecha Fin'
                    });

                    sublista.addField({
                        id: 'usuario',
                        type: ui.FieldType.TEXT,
                        label: 'Ejecutado por'
                    });


                    sublista.addField({
                        id: 'link',
                        type: ui.FieldType.TEXT,
                        label: 'Link'
                    });

                    let ejecuciones = getEjecuciones();

                    for (let i = 0; i < ejecuciones.length; i++) {
                        if (ejecuciones[i].reporte) {
                            sublista.setSublistValue({
                                id: 'reporte',
                                line: i,
                                value: ejecuciones[i].reporte
                            });
                        }
                        if (ejecuciones[i].reporte_params) {
                            let reporte_params = JSON.parse(ejecuciones[i].reporte_params);
                            let salida_html = '';

                            if (reporte_params.etiquetas) {
                                for (let j = 0; j < reporte_params.etiquetas.length; j++) {
                                    salida_html += '<b>' + reporte_params.etiquetas[j].etiqueta + '</b>: ' + reporte_params.etiquetas[j].valor + '<br>';
                                }

                                sublista.setSublistValue({
                                    id: 'parametros',
                                    line: i,
                                    value: salida_html
                                });
                            }

                        }

                        if (ejecuciones[i].salida) {
                            sublista.setSublistValue({
                                id: 'salida',
                                line: i,
                                value: ejecuciones[i].salida
                            });
                        }
                        if (ejecuciones[i].estado) {
                            sublista.setSublistValue({
                                id: 'estado',
                                line: i,
                                value: ejecuciones[i].estado
                            });
                        }
                        if (ejecuciones[i].mensaje) {
                            sublista.setSublistValue({
                                id: 'mensaje',
                                line: i,
                                value: ejecuciones[i].mensaje
                            });
                        }

                        if (ejecuciones[i].fecha_inicio) {
                            sublista.setSublistValue({
                                id: 'fecha_inicio',
                                line: i,
                                value: ejecuciones[i].fecha_inicio
                            });
                        }
                        if (ejecuciones[i].fecha_fin) {
                            sublista.setSublistValue({
                                id: 'fecha_fin',
                                line: i,
                                value: ejecuciones[i].fecha_fin
                            });
                        }
                        if (ejecuciones[i].usuario) {
                            sublista.setSublistValue({
                                id: 'usuario',
                                line: i,
                                value: ejecuciones[i].usuario
                            });
                        }
                        if (ejecuciones[i].url_archivo) {
                            sublista.setSublistValue({
                                id: 'link',
                                line: i,
                                value: "<a target='_blank' download href='" + ejecuciones[i].url_archivo + "'>Descargar</a>"
                            });
                        }
                    }

                    scriptContext.response.writePage(form);
                } else {
                    try {
                        //obtenemos los parametros
                        let params = scriptContext.request.parameters;
                        let params_select = params.custpage_parametros_select;
                        params_select = JSON.parse(params_select);
                        let scriptData = getScript(params_select.reporte);
                      log.debug('scriptData', scriptData);

                        //obtenemos el usuario actual
                        let currentUser = runtime.getCurrentUser();


                        let folderSalida = getFolderSalida();

                        params_select.parametros.salida_folder = folderSalida.id_folder;

                        log.debug('params_select', params_select);

                        //agregamos a la cola
                        let params_cola = {
                            reporte: params_select.reporte.nombre_reporte,
                            salida: params_select.reporte.salida,
                            script_id: scriptData.script_id,
                            deploy_id: scriptData.id_despliegue,
                            usuario: currentUser.id,
                            reporte_params: JSON.stringify(params_select)
                        };

                        log.debug('params_cola', params_cola);

                        agregarCola(params_cola);

                        //ejecutamos el script

                        try {
                            let scriptTask = task.create({
                                taskType: scriptData.tipo_script,
                                scriptId: scriptData.script_id,
                                deploymentId: scriptData.id_despliegue
                            });
                            let scriptTaskId = scriptTask.submit();
                            log.debug('scriptTaskId', scriptTaskId);

                        } catch (error) {
                            log.error('Error al ejecutar el script', error);

                        }


                        //Nos redirigimos a la pagina de resultados
                        redirect.toSuitelet({
                            scriptId: 'customscript_ts_sl_le_libros_electro',
                            deploymentId: 'customdeploy_ts_sl_le_libros_electro',
                        });
                    } catch (error) {
                        log.error('Error en onRequest Post', error);
                    }

                }

            } catch (error) {
                log.error('Error onRequest', error);
            }
        }

        const getEjecuciones = () => {
            try {
                let respuesta = [];

                let customrecord_ts_le_ejecucionesSearchObj = search.create({
                    type: "customrecord_ts_le_cola_ejecuciones",
                    columns:
                        [
                            search.createColumn({ name: "custrecord_ts_le_cola_reporte" }),
                            search.createColumn({ name: "custrecord_ts_le_cola_salida" }),
                            search.createColumn({ name: "custrecord_ts_le_estado_ejecu" }),
                            search.createColumn({ name: "custrecord_ts_le_cola_fecha_inicio", sort: search.Sort.DESC }),
                            search.createColumn({ name: "custrecord_ts_le_cola_fecha_fin" }),
                            search.createColumn({ name: "custrecord_ts_le_usuario_cola" }),
                            search.createColumn({ name: "custrecord_ts_le_url_archivo" }),
                            search.createColumn({ name: "custrecord_ts_le_estado_mens" }),
                            search.createColumn({ name: "custrecord_ts_le_cola_param" }),



                        ]

                });

                //paginamos la busqueda
                let pagedData = customrecord_ts_le_ejecucionesSearchObj.runPaged({
                    pageSize: 1000
                });

                if (pagedData.count > 0) {
                    let pageIndex = 0;

                    // Iterar a través de cada página
                    do {
                        // Obtener la página actual
                        let currentPage = pagedData.fetch({ index: pageIndex });
                        currentPage.data.forEach(function (result) {
                            respuesta.push({
                                reporte: result.getValue({ name: 'custrecord_ts_le_cola_reporte' }),
                                salida: result.getValue({ name: 'custrecord_ts_le_cola_salida' }),
                                estado: result.getValue({ name: 'custrecord_ts_le_estado_ejecu' }),
                                fecha_inicio: result.getValue({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                                fecha_fin: result.getValue({ name: 'custrecord_ts_le_cola_fecha_fin' }),
                                usuario: result.getText({ name: 'custrecord_ts_le_usuario_cola' }),
                                url_archivo: result.getValue({ name: 'custrecord_ts_le_url_archivo' }),
                                mensaje: result.getValue({ name: 'custrecord_ts_le_estado_mens' }),
                                reporte_params: result.getValue({ name: 'custrecord_ts_le_cola_param' }),
                            });
                        });
                        pageIndex++;
                    } while (pageIndex < pagedData.pageRanges.length)
                }

                return respuesta;

            } catch (error) {
                log.error('Error al obtener las ejecuciones', error);

            }
        }

        const agregarCola = (params) => {
            try {
                let agregarCola = record.create({
                    type: 'customrecord_ts_le_cola_ejecuciones',
                    isDynamic: true
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_cola_reporte',
                    value: params.reporte
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_cola_salida',
                    value: params.salida
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_cola_script_id',
                    value: params.script_id
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_cola_id_deploy',
                    value: params.deploy_id
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_estado_ejecu',
                    value: 'PENDIENTE'
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_cola_fecha_inicio',
                    value: new Date()
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_cola_param',
                    value: params.reporte_params
                });

                agregarCola.setValue({
                    fieldId: 'custrecord_ts_le_usuario_cola',
                    value: params.usuario
                });

                let id = agregarCola.save();

            } catch (error) {
                log.error('Error al agregar a la cola', error);
            }
        }

        const getScript = (params) => {
            try {
                let scriptData = {};

                let customrecord_ts_le_lista_scriptSearchObj = search.create({
                    type: "customrecord_ts_le_lista_script",
                    filters:
                        [
                            ["custrecord_ts_le_tipo_salida", "anyof", params.salida],
                            "AND",
                            ["custrecord_ts_le_cod_repo_script", "anyof", params.id_reporte]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_ts_le_cod_repo_script", label: "Codigo Reporte" }),
                            search.createColumn({ name: "custrecord_ts_le_script_desc", label: "script descripcion" }),
                            search.createColumn({ name: "custrecord_ts_le_script_id", label: "script id" }),
                            search.createColumn({ name: "custrecord_ts_le_tipo_salida", label: "tipo de salida" }),
                            search.createColumn({ name: "custrecord_ts_le_id_despliegue", label: "despliegue id" }),
                            search.createColumn({ name: "custrecord_ts_le_tipo_script", label: "tipo script" }),

                        ]
                });

                customrecord_ts_le_lista_scriptSearchObj.run().each(function (result) {
                    scriptData = {
                        cod_repo_script: result.getValue({ name: 'custrecord_ts_le_cod_repo_script' }),
                        script_desc: result.getValue({ name: 'custrecord_ts_le_script_desc' }),
                        script_id: result.getValue({ name: 'custrecord_ts_le_script_id' }),
                        tipo_salida: result.getValue({ name: 'custrecord_ts_le_tipo_salida' }),
                        id_despliegue: result.getValue({ name: 'custrecord_ts_le_id_despliegue' }),
                        tipo_script: result.getText({ name: 'custrecord_ts_le_tipo_script' }),
                    }
                    return true;
                });

                return scriptData;

            } catch (error) {
                log.error('Error al obtener el scriptId', error);
            }
        }

        const getParamsReporte = (codReporte) => {
            try {
                let params = [];

                let paramsSearch = search.create({
                    type: 'customrecord_ts_le_lista_params',
                    filters: [
                        ["custrecord_ts_le_repo_cod_param", "anyof", codReporte]
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_ts_le_repo_param' }),
                        search.createColumn({ name: 'custrecord_ts_le_repo_id_param' }),
                        search.createColumn({ name: 'custrecord_ts_le_repo_tipo_param' }),
                        search.createColumn({ name: 'custrecord_ts_le_repo_origen_select' }),
                        search.createColumn({ name: 'custrecord_ts_le_repo_busq_guard_flag' }),
                        search.createColumn({ name: 'custrecord_ts_le_req_param_flag' }),


                    ]
                });

                paramsSearch.run().each((result) => {
                    let param = {
                        name_param: result.getValue({ name: 'custrecord_ts_le_repo_param' }),
                        id_param: result.getValue({ name: 'custrecord_ts_le_repo_id_param' }),
                        tipo_param: result.getText({ name: 'custrecord_ts_le_repo_tipo_param' }),
                        origen_select: result.getValue({ name: 'custrecord_ts_le_repo_origen_select' }),
                        busq_guard_flag: result.getValue({ name: 'custrecord_ts_le_repo_busq_guard_flag' }),
                        req_param_flag: result.getValue({ name: 'custrecord_ts_le_req_param_flag' }),
                    }
                    params.push(param);
                    return true;
                }
                );
                return params;

            } catch (error) {
                log.debug('Error al obtener los parametros del reporte', error);
            }


        }

        const getScriptSalidasDisponibles = (codReporte) => {
            try {
                let scriptData = [];

                let customrecord_ts_le_lista_scriptSearchObj = search.create({
                    type: "customrecord_ts_le_lista_script",
                    filters:
                        [
                            ["custrecord_ts_le_cod_repo_script", "anyof", codReporte]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_ts_le_cod_repo_script", label: "Codigo Reporte" }),
                            search.createColumn({ name: "custrecord_ts_le_script_desc", label: "script descripcion" }),
                            search.createColumn({ name: "custrecord_ts_le_script_id", label: "script id" }),
                            search.createColumn({ name: "custrecord_ts_le_tipo_salida", label: "tipo de salida" }),
                            search.createColumn({ name: "custrecord_ts_le_id_despliegue", label: "despliegue id" }),
                            search.createColumn({ name: "custrecord_ts_le_tipo_script", label: "tipo script" }),

                        ]
                });

                customrecord_ts_le_lista_scriptSearchObj.run().each(function (result) {
                    log.debug('result', result.getText({ name: 'custrecord_ts_le_tipo_salida' }).split(','));

                    for (let i = 0; i < result.getText({ name: 'custrecord_ts_le_tipo_salida' }).split(',').length; i++) {  
                        scriptData.push({
                            cod_repo_script: result.getValue({ name: 'custrecord_ts_le_cod_repo_script' }),
                            script_desc: result.getValue({ name: 'custrecord_ts_le_script_desc' }),
                            script_id: result.getValue({ name: 'custrecord_ts_le_script_id' }),
                            tipo_salida_text: result.getText({ name: 'custrecord_ts_le_tipo_salida' }).split(',')[i],
                        });
                    }
                    return true;
                });

                return scriptData;

            } catch (error) {
                log.error('Error al obtener el scriptId', error);
            }
        }


        const getFolderSalida = () => {
            try {
                let scriptData = {};

                let customrecord_ts_le_lista_scriptSearchObj = search.create({
                    type: "customlist_ts_le_folder_salida",
                    filters:
                        [],
                    columns:
                        [
                            search.createColumn({ name: "name", label: "Id Folder" })

                        ]
                });

                customrecord_ts_le_lista_scriptSearchObj.run().each(function (result) {
                    scriptData = {
                        id_folder: result.getValue({ name: 'name' }),
                    }
                    return true;
                });

                return scriptData;

            } catch (error) {
                log.error('Error getFolderSalida', error);
            }
        }



        return { onRequest }

    });

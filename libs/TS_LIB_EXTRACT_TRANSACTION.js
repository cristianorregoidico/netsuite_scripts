/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @author rhuaccha
*/
define(['N/log', 'N/search', 'N/record', 'N/file'],
	function (log, search, record, file) {

		const STATUS_OK = true;
		const STATUS_ERROR = false;
		const MAX_PAGINATION_SIZE = 1000;
		const FACTURA = '01';
		const BOLETA = '03';
		const NOTA_CREDITO = '07';
		const NOTA_DEBITO = '08';
		const GUIA_REMISION = '09';
		const COMPROBANTE_RETENCION = '20';
		const VENDOR_CREDIT = 'vendorcredit';
		const TAX_CODE_GRAVADA = 'IGV_PE:S-PE'
		const TAX_CODE_INAFECTA = 'IGV_PE:Inaf-PE'
		const TAX_CODE_EXENTA = 'IGV_PE:E-PE'
		const TAXT_CODE_UNDEF = 'IGV_PE:UNDEF-PE'
		const TAXT_CODE_EXPORT = 'IGV_PE:X-PE'
		const TAXT_CODE_GRATUITA = 'TTG_PE:TTG'

		/**
		 * @param {string|number} internalId Id interno de la transacción
		 * @param {string} documentType codigo de tipo de documento
		 * @param {string} netsuiteType tipo de transacción en netsuite 
		 * @param {string|number} customerId Id del cliente
		 * @param {string|number} subsidiaryId Id de la subsidiario
		 * @returns 
		 */
		function getDocument() {
			var response = {
				status: STATUS_ERROR,
				message: 'Init',
				document: {}
			}
			try {
				var paramsName = ['internalId', 'documentType', 'netsuiteType', 'customerId', 'subsidiaryId'];
				var options = parseArguments(arguments, paramsName);

				var searchType = getSearchType(options.documentType);
				var searchFilters = getSearchFilters(options.internalId, options.netsuiteType);
				var searchColumns = getSearchColumns(options.documentType);

				var tmpSearch = search.create({
					type: searchType,
					filters: searchFilters,
					columns: searchColumns
				});

				var count = tmpSearch.runPaged().count;
				var transaction = {};

				if (count === 0) {
					response.status = STATUS_ERROR;
					response.message = 'No se encontraron resultados para el documento con el ID: ' + options.internalId;
					return response;
				}

				var resultSet = tmpSearch.run().getRange({ start: 0, end: 1 });
				resultSet.forEach(function (row) {
					row.columns.forEach(function (column) {
						var value = column.label;

						if (String(value).indexOf('T_') === 0) {
							transaction[column.label.replace('T_', '')] = row.getText(column);
						} else if (String(value).indexOf('V_') === 0) {
							transaction[column.label.replace('V_', '')] = row.getValue(column);
						} else {
							transaction[column.label] = row.getValue(column);
						}
					});
				});

				var customerObj = getCustomer(options.customerId,options.documentType);

				var subsidiaryObj = getSubsidiary(options.subsidiaryId);

				transaction.customer = customerObj.customer;
				transaction.subsidiary = subsidiaryObj.subsidiary;

				var linesObj = getTransaccionLines(options.internalId, options.documentType);

				if (linesObj.status === STATUS_OK) {
					transaction.total = linesObj.total;
					transaction.taxtotal = linesObj.taxtotal;
					transaction.discountTotal = linesObj.discountTotal;
					transaction.estgrossprofit = linesObj.estgrossprofit;
					transaction.taxTotalInvoice = linesObj.taxTotalInvoice;
					if (options.documentType === COMPROBANTE_RETENCION) {
						transaction.userTotal = linesObj.userTotal;
					}
					transaction.lines = linesObj.lines;
				}

				response.status = STATUS_OK;
				response.message = 'Proceso completado correctamente';
				response.document = transaction;

			} catch (error) {
				response.status = STATUS_ERROR;
				response.message = 'Error No se puede obtener la transacción: ' + error.message;
			}
			return response;
		}

		function getCustomer(customerId,documentType) {
			var object = {
				status: STATUS_ERROR,
				message: 'Init',
			}
			try {
				var tmpSearch = search.create({
					type: search.Type.CUSTOMER,
					filters:
						[
							["internalid","anyof",customerId], 
      						"AND", 
						    (documentType === FACTURA || documentType === BOLETA || documentType === NOTA_DEBITO || documentType === NOTA_CREDITO?["address.isdefaultbilling","is","T"]:["address.isdefaultshipping","is","T"])
						],
					columns:
						[
							search.createColumn({
								name: "formulatext",
								formula: "CASE WHEN {custentity_pe_document_type} = 'Registro Unico De Contribuyentes' THEN '6' WHEN {custentity_pe_document_type} = 'Documento Nacional De Identidad (DNI)' THEN '1' WHEN {custentity_pe_document_type} = 'Otros Tipos De Documentos' THEN '0' END",
								label: "tipoDocCustmer"
							}),
							search.createColumn({ name: "custentity_pe_document_number", label: "taxNumber" }),
							search.createColumn({ name: "companyname", label: "companyname" }),
							// search.createColumn({ name: "address1", label: "address1" }),
							search.createColumn({ name: "address1", join: 'Address', label: "address1" }),
							search.createColumn({ name: "custrecord_province", join: "Address", label: "city" }),
							search.createColumn({ name: "state", label: "state" }),
							search.createColumn({ name: "address2", label: "address2" }),
							search.createColumn({ name: "country", label: "country" }),
							search.createColumn({ name: "phone", label: "phone" }),
							search.createColumn({ name: "email", label: "email" }),
							search.createColumn({ name: "internalid", label: "internalid" }),
							search.createColumn({ name: "formulatext", formula: "CONCAT({firstname}, CONCAT('-', {lastname}))", label: "fullName" }),//41
							search.createColumn({ name: "firstname", label: "firstname" }),
							search.createColumn({ name: "lastname", label: "lastname" }),
							//search.createColumn({ name: "vatregnumber", label: "vatregnumber" }), // 
							search.createColumn({ name: "custrecord_pe_cod_ubigeo", join: "Address", label: "codeUbigeo" }),//0
							search.createColumn({ name: "custrecord_pe_distrito", join: "Address", label: "distrito" }),
							search.createColumn({ name: "custrecord_pe_departamento", join: "Address", label: "departamento" }),
							search.createColumn({ name: "altname", label: "altname" })
						]
				});
				var result = tmpSearch.run().getRange({ start: 0, end: 1 });
				var data = {};
				if (result && result.length > 0) {
					result.forEach(function (row) {
						row.columns.forEach(function (column) {
							data[column.label] = row.getValue(column);
						});
					});
				}

				object.status = STATUS_OK;
				object.message = 'Proceso ejecutado correttamente';
				object.customer = data;

			} catch (error) {
				object.status = STATUS_ERROR;
				object.message = 'Error No se puede obtener el cliente: ' + error.message;
				log.debug('error',error);
			}
			return object;
		}

		function getSubsidiary(subsidiaryId) {
			var object = {
				status: STATUS_ERROR,
				message: 'Init',
			}
			try {
				var tmpSearch = search.create({
					type: search.Type.SUBSIDIARY,
					filters:
						[
							search.createFilter({
								name: "internalid",
								operator: search.Operator.ANYOF,
								values: subsidiaryId
							})
						],
					columns:

						[
							// search.createColumn({ name: "subsidiary", label: "subsidiary" }),
							search.createColumn({ name: "legalname", label: "legalname" }),

							search.createColumn({ name: "taxregistrationnumber", label: "taxidnum" }),
							search.createColumn({ name: "formulatext", formula: "{name}", label: "tradename" }),//8
							search.createColumn({ name: "address1", label: "address1" }),
							search.createColumn({ name: "custrecord_pe_distrito", join: "Address", label: "address2" }),
							search.createColumn({ name: "address3", label: "address3" }),
							search.createColumn({ name: "country", label: "country" }),

							search.createColumn({ name: "custrecord_province", join: "Address", label: "state" }),
							search.createColumn({ name: "phone", label: "phone" }),
							search.createColumn({ name: "email", label: "email" }),
							search.createColumn({ name: "custrecord_pe_cod_ubigeo", join: "Address", label: "zip" }),
							search.createColumn({ name: "custrecord_pe_departamento", join: "Address", label: "city" }),
							search.createColumn({ name: "custrecord_pe_cuenta_banco_nacion", label: "ctadetraccion" }),
							search.createColumn({ name: "formulatext", formula: "6", label: "tipoDocumento" }),

							search.createColumn({ name: "custrecord_ts_scotiabank_pen_cc", label: "scotiabankpencc" }),
							search.createColumn({ name: "custrecord_ts_scotiabank_pen_cci", label: "scotiabankpencci" }),
							search.createColumn({ name: "custrecord_ts_scotiabank_usd_cc", label: "scotiabankusdcc" }),
							search.createColumn({ name: "custrecord_ts_scotiabank_usd_cci", label: "scotiabankusdcci" }),
							
							
						]
				});
				var result = tmpSearch.run().getRange({ start: 0, end: 1 });
				var data = {};
				if (result && result.length > 0) {
					result.forEach(function (row) {
						row.columns.forEach(function (column) {
							data[column.label] = row.getValue(column);
						});
					});
				}

				object.status = STATUS_OK;
				object.message = 'Proceso ejecutado correttamente';
				object.subsidiary = data;

			} catch (error) {
				object.status = STATUS_ERROR;
				object.message = 'Error No se puede obtener las subsidiaria: ' + error.message;
			}
			return object;
		}

		function getTransaccionLines(internalId, type) {
			var response = {
				status: STATUS_ERROR,
				message: 'Init',
			}
			try {
				var applyAnty = [];
				var loadRecord = null;

				if (type === FACTURA || type === BOLETA || type === NOTA_DEBITO) {
					try {
						loadRecord = record.load({
							type: record.Type.INVOICE,
							id: internalId,
							isDynamic: true
						});
					} catch (error) {
						loadRecord = record.load({
							type: record.Type.CASH_SALE,
							id: internalId,
							isDynamic: true
						});
					}
				}

				if (type === GUIA_REMISION) {
					loadRecord = record.load({
						type: record.Type.ITEM_FULFILLMENT,
						id: internalId,
						isDynamic: true
					});
				}

				if (type === NOTA_CREDITO) {
					loadRecord = record.load({
						type: record.Type.CREDIT_MEMO,
						id: internalId,
						isDynamic: true
					});
				}

				if (type === COMPROBANTE_RETENCION) {
					loadRecord = record.load({
						type: record.Type.VENDOR_CREDIT,
						id: internalId,
						isDynamic: true
					})
				}

				var total = '';
				var taxtotal = '';
				var codcustomer = '';
				var lineCount = 0;
				if (type === COMPROBANTE_RETENCION) {
					lineCount = loadRecord.getLineCount({ sublistId: 'apply' });
				} else {
					lineCount = loadRecord.getLineCount({ sublistId: 'item' });
				}
				var taxdetails = loadRecord.getLineCount({ sublistId: 'taxdetails' });
				if (type === FACTURA || type === BOLETA || NOTA_DEBITO || type === NOTA_CREDITO ) {

					var total = parseFloat(loadRecord.getValue({ fieldId: 'subtotal' }))+ parseFloat(loadRecord.getValue({ fieldId: 'taxtotal37' }));
					var taxtotal = loadRecord.getValue({ fieldId: 'taxtotal37' });
					var codcustomer = loadRecord.getText({ fieldId: 'entity' });
					codcustomer = codcustomer.split(' ');
					codcustomer = codcustomer[0];

					// add
					var discountTotal = loadRecord.getValue({ fieldId: 'discounttotal' });
					var estgrossprofit = loadRecord.getValue({ fieldId: 'estgrossprofit' });
					var taxTotalInvoice = loadRecord.getValue({ fieldId: 'taxtotal37' });
				
					
					var linkscount = loadRecord.getLineCount({ sublistId: 'links' });
					for (var index = 0; index < linkscount - 1; index++) {
						var totalanticipo = loadRecord.getSublistValue({ sublistId: 'links', fieldId: 'total', line: index });
						var type = loadRecord.getSublistValue({ sublistId: 'links', fieldId: 'type', line: index });
						var intenal = loadRecord.getSublistValue({ sublistId: 'links', fieldId: 'id', line: index });
						if (type == 'Aplicación de depósito' || type == 'Deposit Application') {
							applyAnty.push(intenal);
							applyAnty.push(totalanticipo);
						}

					}
					var taxlines = [];
					var tax = {};
					var taxdetail = '';
					for (var index = 0; index < taxdetails; index++) {

						var taxcode_display = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxcode_display', line: index });
						var taxdetailsreference = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxdetailsreference', line: index });
						if (taxcode_display == 'E-PE' || taxcode_display == 'S-PE') {


							if (taxdetail != '' && taxdetail != taxdetailsreference) {
								taxlines.push(tax)
								tax = {};
							}

							taxdetail = taxdetailsreference;
							tax.taxcode_display = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxcode_display', line: index });
							tax.taxrate = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxrate', line: index });
							tax.taxamount = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxamount', line: index });
						}

						tax.taxrate_type = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxrate', line: index });
						tax.taxcode_type = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxtype_display', line: index });
						tax.taxamount_type = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxamount', line: index });
						tax.taxdetailsreference = loadRecord.getSublistValue({ sublistId: 'taxdetails', fieldId: 'taxdetailsreference', line: index });
						if (index == (taxdetails - 1)) {
							taxlines.push(tax)
						}

					}
				}

				var lines = [];
				for (var i = 0; i < lineCount; i++) {
					var line = {};
					if (type === GUIA_REMISION) {
						line.itemType = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
						line.description = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
						line.codigo = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemname', line: i });
						line.quantity = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });

						line.cantidadLine = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sj_peso_individual_', line: i });
						line.PesoLine = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_gg_peso_', line: i });
						line.item = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
						line.note = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'unitsdisplay', line: i });
						line.get_custcol_pe_unidad_base = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_pe_unidad_base', line: i });
						// line.motivo_traslado = searchResultitemfulfillment[0].getValue({ name: "name", join: "custbody_pe_motivos_de_traslado" });
						line.pesoTotal = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sj_peso_total', line: i });

						line.itemId = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });

					} else if (type === COMPROBANTE_RETENCION) {
						line.apply = loadRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
						line.amountRet = loadRecord.getSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i });
						line.trantype = loadRecord.getSublistValue({ sublistId: 'apply', fieldId: 'trantype', line: i });
						line.doc = loadRecord.getSublistValue({ sublistId: 'apply', fieldId: 'doc', line: i });
					} else {
						line.item = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });

						line.isDiscountLine = nvl(loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_pe_is_discount_line', line: i }), false);
						line.description = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
						line.quantity = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
						line.grossamt = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'grossamt', line: i });

						line.rate = parseFloat(loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }));
						var taxCodeDisplay = taxlines[i].taxcode_display;
						line.taxCodeDisplay = taxCodeDisplay;
						line.amount = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });

						line.itemType = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
						line.taxRate1 = parseFloat(taxlines[i].taxrate);

						line.taxrate1GRa = taxCodeDisplay == TAXT_CODE_GRATUITA ? 0 : parseFloat(taxlines[i].taxrate);
						line.tax1Amt = parseFloat(taxlines[i].taxamount);

						line.montoImpuesto = parseFloat(taxlines[i].taxamount);
						line.isIcbp = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_pe_is_icbp', line: i });

						line.applyWh = (taxlines[i].taxcode_type == 'DET' ? true : false);
						line.applyrent = (taxlines[i].taxcode_type == 'RETIGV' ? true : false);
						line.cuponCode = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_codigo_cupon', line: i });

						var units = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'units', line: i });
						line.units = units;

						line.unitDisplay = nvl(units, loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'units_display', line: i }));
						line.tarifa = parseFloat(loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }));
					}
					lines.push(line)
				}

				response.status = STATUS_OK;
				response.message = 'Proceso completado correctamente';
				response.total = total;
				response.taxtotal = taxtotal;
				
				response.discountTotal = discountTotal;
				response.estgrossprofit = estgrossprofit;
				response.taxTotalInvoice = taxTotalInvoice;
				if (type === COMPROBANTE_RETENCION) {
					response.userTotal = nvl(loadRecord.getValue({ fieldId: 'usertotal' }), 0);
				}
				response.lines = lines;

			} catch (error) {
				response.status = STATUS_ERROR;
				response.message = 'Error No se puede obtener las líneas de la transacción: ' + error.message;
			}
			return response;
		}

		//<I> funciones para la busqueda de transacciones
		function getSearchColumns(documentType) {
			var columns = [];
			if (documentType === FACTURA || documentType === BOLETA || documentType === NOTA_DEBITO) {
				columns = getTransactionColumns();
			}

			if (documentType === NOTA_CREDITO) {
				columns = getCreditMemoColumns();
			}

			if (documentType === GUIA_REMISION) {
				columns = getItemFullFillmentColumns();
			}

			if (documentType === COMPROBANTE_RETENCION) {
				columns = getVendorCreditColumns();
			}

			if (!columns) {
				columns = getTransactionColumns();
			}
			return columns;
		}

		function getSearchType(documentType) {
			var searchType;

			if (documentType === FACTURA || documentType === BOLETA || documentType === NOTA_DEBITO) {
				searchType = search.Type.TRANSACTION;
			}

			if (documentType === NOTA_CREDITO) {
				searchType = search.Type.CREDIT_MEMO;
			}

			if (documentType === GUIA_REMISION) {
				searchType = search.Type.ITEM_FULFILLMENT;
			}

			if (documentType === COMPROBANTE_RETENCION) {
				searchType = search.Type.VENDOR_CREDIT;
			}

			if (!searchType) {
				searchType = search.Type.TRANSACTION;
			}

			return searchType;
		}

		function getSearchFilters(internalId, netsuiteType) {
			var filters = [];
			try {
				var mainlineFilter = search.createFilter({
					name: 'mainline',
					operator: search.Operator.IS,
					values: true
				});
				filters.push(mainlineFilter);

				var internalIdFilter = search.createFilter({
					name: 'internalid',
					operator: search.Operator.ANYOF,
					values: internalId
				});
				filters.push(internalIdFilter);

				var typefilter = search.createFilter({
					name: 'type',
					operator: search.Operator.ANYOF,
					values: netsuiteType
				});
				filters.push(typefilter);

			} catch (error) {
				filters = [];
			}
			return filters;
		}

		function getTransactionColumns() {
			var columns = [
				// IDE---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "formulatext", formula: "CONCAT({custbody_pe_serie.custrecord_pe_serie_impresion}, CONCAT('-', {custbody_pe_number}))", label: "numeracion" }),
				search.createColumn({ name: "trandate", label: "trandate" }),
				search.createColumn({ name: "datecreated", label: "datecreated" }),
				search.createColumn({ name: "custrecord_pe_code_document_type", join: "custbody_pe_document_type", label: "documentTypeCode" }),
				search.createColumn({ name: "symbol", join: "Currency", label: "currency" }),
				search.createColumn({ name: "otherrefnum", join: "createdFrom", label: "V_poCheckNumber" }),
				search.createColumn({ name: "custbody_pe_nro_guia", label: "nro_guia" }),
				// EMI---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "formulanumeric", formula: "6", label: "docTypeEmisor" }), // 6
				search.createColumn({ name: "address1", join: "location", label: "address1" }),
				search.createColumn({ name: "address2", join: "location", label: "address2" }),
				search.createColumn({ name: "billcountrycode", label: "billcountrycode" }),
				search.createColumn({ name: "formulatext", formula: "'0000'", label: "sunatCode" }), // Cod Sunat

				// REC---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "billaddress2", label: "billaddress2" }),
				// CAB---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "custbody_pe_operation_type", label: "T_operationType" }),
				search.createColumn({ name: "custrecord_pe_cod_fact", join: "custbody_pe_ei_operation_type", label: "codeFact" }),
				search.createColumn({ name: "duedate", label: "duedate" }),
				// ADI---------------------------------------------------------------------------------------------------------------------

				// COM---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "custbody_pe_document_type", label: "T_documentType" }),
				search.createColumn({ name: "custbody_pe_serie", label: "T_serie" }),
				// COM---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "formulanumeric", formula: "TO_NUMBER({custbody_pe_number})", label: "V_numero" }), // Formula Numeric
				search.createColumn({ name: "createdfrom", label: "createdfrom" }),
				search.createColumn({ name: "otherrefnum", label: "V_otherrefnum" }),
				// ADI---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "location", label: "T_location" }),
				search.createColumn({ name: "formulatext", formula: "CONCAT({salesRep.firstname}, CONCAT(' ', {salesRep.lastname}))", label: "V_salesRepFullName" }), // SalesRep full name
				// IDE---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "tranid", join: "createdFrom", label: "V_tranid" }),
				// REC---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "custbody_pe_free_operation", label: "V_freeOperation" }),
				// ADI DETRACCION----------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "custbody_pe_ei_forma_pago", label: "T_formaPagoDetr" }),
				search.createColumn({ name: "custbody_pe_concept_detraction", label: "T_conceptDetraction" }),
				//comentado erick

				//search.createColumn({ name: "custcol_4601_witaxamount", label: "V_montoDetrac" }),
				search.createColumn({ name: "custbody_pe_percentage_detraccion", label: "V_porcentajeDetr" }),

				search.createColumn({
					name: "exchangerate",
					join: "accountingTransaction",
					label: "V_exchangerate"
				}),
				// IMM: REFERENCIA
				search.createColumn({ name: "custbody_pe_document_type_ref", label: "V_tipoDocReferencia" }),
				search.createColumn({ name: "custbody_pe_document_series_ref", label: "V_serieReferencia" }),
				search.createColumn({ name: "custbody_pe_document_number_ref", label: "V_numeroReferencia" }),
				search.createColumn({ name: "custbody_pe_document_date_ref", label: "V_fechaReferencia" }),
				search.createColumn({ name: "name", join: "custbody_pe_reason", label: "V_reason" }),
				search.createColumn({ name: "custrecord_pe_codigo_motivo", join: "custbody_pe_reason", label: "V_codMotivo" }),
				search.createColumn({ name: "entity", label: "entity" }),
				search.createColumn({ name: "name", join: "custbody_pe_concept_detraction", label: "V_conceptDetractionName" }),
				search.createColumn({ name: "custrecord_pe_code_detraccion", join: "custbody_pe_concept_detraction", label: "V_codeConceptDetraction" }),
				search.createColumn({ name: "debitfxamount", label: "debitfxamount" }),
				search.createColumn({ name: "memo", label: "memo" }),
				search.createColumn({ name: "location", label: "location" }),
				search.createColumn({ name: "terms", label: "T_terms" }),
				search.createColumn({ name: "custbody_pefacturarelacionadaalanticip", label: "invRelatesToAnticipo" }),
				search.createColumn({ name: "custbody_pe_serie", join: "custbody_pefacturarelacionadaalanticip", label: "V_serieAnticipo" }),
				search.createColumn({ name: "custbody_pe_number", join: "custbody_pefacturarelacionadaalanticip", label: "V_numeroAnticipo" }),
				search.createColumn({ name: "createdfrom", label: "createdfrom" }),
				search.createColumn({ name: "custrecord_pe_code_document_type", join: "custbody_pe_document_type_ref", label: "codeTipooDocRef" }),

				search.createColumn({ name: "tranid", join: "createdfrom", label: "tranid" }), // Pedido
				//comentado erick
				//search.createColumn({ name: "custbody_sj_motiv_venta", join: "createdfrom", label: "T_motivo" }), // Motivo
				search.createColumn({ name: "salesrep", join: "createdfrom", label: "T_salesrep" }), // Vendedor
				//comentado erick
				//search.createColumn({ name: "custbody_sj_origen", label: "V_origen" }),
				//search.createColumn({ name: "custbody_sj_destino", label: "V_destino" }),
				//search.createColumn({ name: "custbody_sj_partida", label: "V_partida" }),
				//search.createColumn({ name: "custbody_sj_incoterm", label: "V_incoterm" }),

				search.createColumn({ name: "shipaddress", join: "createdfrom", label: "V_shipaddress" }),
				search.createColumn({ name: "custbody_pe_ei_operation_type", label: "T_tipoOperacion" }),
				search.createColumn({ name: "salesrep", label: "T_salesrepresent" }), // Vendedor Factura

				search.createColumn({ name: "custbody_pe_donacion", label: "V_isDonation" }),
			];
			return columns;
		}

		function getCreditMemoColumns() {
			var columns = [
				// IDE---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "formulatext", formula: "CONCAT({custbody_pe_serie}, CONCAT('-', {custbody_pe_number}))", label: "numeracion" }),
				search.createColumn({ name: "formulatext", formula: "'07'", label: "formula1" }),
				// EMI---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "formulanumeric", formula: "6", label: "tipoDocId" }),
				search.createColumn({ name: "formulatext", formula: "'0000'", label: "sunatCode" }),
				// DRF---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "formulatext", formula: "CASE WHEN {custbody_pe_document_type_ref} = 'Factura' THEN '01' WHEN {custbody_pe_document_type_ref} = 'Boleta de Venta' THEN '03' END", label: "tipoDocRelacionado" }),
				search.createColumn({ name: "formulatext", formula: "CONCAT({custbody_pe_document_series_ref}, CONCAT('-', {custbody_pe_document_number_ref}))", label: "numeroDocRelacionado" }),
				// COM---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "formulanumeric", formula: "TO_NUMBER({custbody_pe_number})", label: "correlativo" }),
				search.createColumn({ name: "createdfrom", join: "createdFrom", label: "fulfillment" }),
				// ADI---------------------------------------------------------------------------------------------------------------------
				// IDE---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "trandate", label: "trandate" }),
				search.createColumn({ name: "custbody_pe_free_operation", label: "freeOperation" }),
				search.createColumn({ name: "symbol", join: "Currency", label: "currency" }),
				search.createColumn({ name: "otherrefnum", label: "otherrefnum" }),
				search.createColumn({ name: "duedate", join: "createdFrom", label: "duedate" }),

				search.createColumn({ name: "billcountrycode", label: "billcountrycode" }),

				// REC---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "billaddress1", label: "billaddress1" }),
				search.createColumn({ name: "billaddress2", label: "billaddress2" }),
				// DRF---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "custrecord_pe_codigo_motivo", join: "CUSTBODY_PE_REASON", label: "codigoMotivo" }),
				search.createColumn({ name: "name", join: "CUSTBODY_PE_REASON", label: "reasonName" }),

				// COM---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "custbody_pe_document_type", label: "typedoc" }),
				search.createColumn({ name: "custbody_pe_serie", label: "serie" }),

				// ADI---------------------------------------------------------------------------------------------------------------------
				search.createColumn({ name: "custbody_pe_document_date_ref", label: "fechaVencDateAdi" }),
				search.createColumn({ name: "entity", label: "entity" }),

				search.createColumn({ name: "custbody_pe_direccion_entrega_prede", label: "direccionEntrega" }),
				search.createColumn({ name: "salesrep", label: "T_salesrep" }),
				search.createColumn({ name: "createdfrom", join: "createdFrom", label: "createdfrom" }),
				search.createColumn({ name: "type", join: "createdFrom", label: "type" }),
				//search.createColumn({ name: "custbody_sj_motiv_devolucion", label: "T_motivoDevolucion" }),
				search.createColumn({ name: "custbody_pe_fecha_venci_ref", label: "fechaVencRef" }),
				search.createColumn({ name: "custbody_pe_condicion_ref", label: "T_condicionRef" }),
				search.createColumn({ name: "custbody_pe_forma_pago_ref", label: "T_formaPagoRef" }),
				search.createColumn({ name: "custbody16", label: "additionalNotes" })
			];
			return columns;
		}

		function getVendorCreditColumns() {
			var columns = [
				search.createColumn({ name: "formulatext", formula: "CONCAT({custbody_pe_serie_cxp}, CONCAT('-', {custbody_pe_number}))", label: "numeracion" }),
				search.createColumn({ name: "trandate", label: "trandate" }),
				search.createColumn({ name: "custrecord_pe_code_document_type", join: "custbody_pe_document_type", label: "documentTypeCode" }),
				search.createColumn({ name: "symbol", join: "Currency", label: "currency" }),
				search.createColumn({ name: "otherrefnum", join: "createdFrom", label: "otherrefnum" }),
				search.createColumn({ name: "taxidnum", join: "subsidiary", label: "taxidnum" }),
				search.createColumn({ name: "formulatext", formula: "{subsidiary.name}", label: "subsidiary" }),
				search.createColumn({ name: "legalname", join: "subsidiary", label: "legalname" }),
				search.createColumn({ name: "address1", join: "location", label: "address1" }),
				search.createColumn({ name: "address2", join: "location", label: "address2" }),
				search.createColumn({ name: "address1", join: "subsidiary", label: "address1" }),
				search.createColumn({ name: "entity", label: "entity" }),
				search.createColumn({ name: "memo", label: "memo" }),
				search.createColumn({ name: "exchangerate", label: "exchangerate" }),
			];
			return columns;
		}

		function getItemFullFillmentColumns() {
			var columns = [
				search.createColumn({ name: "trandate", label: "trandate" }),
				search.createColumn({ name: "internalid", join: "createdFrom", label: "createdFrom" }),
				search.createColumn({ name: "memo", label: "memo" }),
				search.createColumn({ name: "internalid", join: "customerMain", label: "internalid" }),
				search.createColumn({ name: "custbody_pe_serie", label: "T_serie" }),
				search.createColumn({ name: "name", join: "custbody_pe_delivery_information", label: "deliveryInformation" }),
				search.createColumn({ name: "custbody_pe_reason_details", label: "reasonDetails" }),
				search.createColumn({ name: "custbody_pe_peso_tn", label: "pesoTn" }),
				search.createColumn({ name: "custrecord_pe_motivo_traslado", join: "custbody_pe_modalidad_de_traslado", label: "modalidad" }),
				search.createColumn({ name: "custrecord_pe_motivo_de_traslado", join: "custbody_pe_motivos_de_traslado", label: "motivo" }),
				search.createColumn({ name: "custbody_pe_ruc_vendor", label: "rucVendor" }),
				search.createColumn({ name: "custbody_pe_fecha_inicio_traslado", label: "fechaInicioTraslado" }),
				search.createColumn({ name: "custbody_pe_number", label: "number" }),
				search.createColumn({ name: "custbody_pe_ubigeo_punto_partida", label: "T_puntoPartida" }),
				search.createColumn({ name: "custbody_pe_ubigeo_punto_llegada", label: "T_puntoLlegada" }),
				search.createColumn({ name: "custbody_pe_driver_license", label: "driverLicense" }),
				search.createColumn({ name: "custbody_pe_car_plate", label: "carPlate" }),
				search.createColumn({ name: "custbody_pe_driver_document_number", label: "driverDocumentNumber" }),
				search.createColumn({ name: "custbody_pe_driver_name", label: "driverName" }),
				search.createColumn({ name: "custbody_pe_driver_last_name", label: "driverLastName" }),
				search.createColumn({ name: "custbody_pe_numero_de_registro_mtc", label: "registroMtc" }),
				search.createColumn({ name: "custbody_pe_num_autorizacion_principal", label: "autorizacionPrincipal" }),
				search.createColumn({ name: "custrecord_pe_codigo", join: "custbody_pe_ubigeo_punto_llegada", label: "codLlegada" }),
				search.createColumn({ name: "custrecord_pe_codigo", join: "custbody_pe_ubigeo_punto_partida", label: "codPartida" }),
				search.createColumn({ name: "custbody_pe_delivery_address", label: "direccionEntrega" }),
				search.createColumn({ name: "custrecord_pe_cod_establishment_annex", join: "custbody_pe_location_source", label: "codigoEstablecimiento" }),
				search.createColumn({ name: "custbody_pe_source_address", label: "sourceAddress" }),
				search.createColumn({ name: "custbody_pe_document_number_ref", label: "documentNumberRef" }),
				search.createColumn({ name: "custbody_pefechadeentregareal", label: "fechaEntregaReal" }),
				search.createColumn({ name: "custbody_pe_document_series_ref", label: "serieReferencia" }),
				search.createColumn({ name: "custrecord_pe_code_document_type", join: "custbody_pe_document_type_ref", label: "documentTypeCodeRef" }),
				search.createColumn({ name: "name", join: "custbody_pe_document_type_ref", label: "documentTypeRefName" }),

				search.createColumn({ name: "custrecord_pe_code_operation_type", join: "CUSTBODY_PE_OPERATION_TYPE", label: "operationType" }),
				search.createColumn({ name: "internalid", join: "CUSTBODY_PE_EMPRESA_ADUANERA", label: "empAduaneraId" }),

				search.createColumn({ name: "otherrefnum", join: "createdFrom", label: "otherrefnum" }),
				search.createColumn({ name: "custrecord_pe_driver_address", join: "custbody_pe_delivery_information", label: "driverAddress" }),
				search.createColumn({ name: "custrecord_pe_car_brand", join: "custbody_pe_delivery_information", label: "carBrand" }),
				search.createColumn({ name: "recordType", join: "createdFrom", label: "recordType" }),
				search.createColumn({ name: "custbody_pe_cert_insc_transportista", label: "certificateTransportista" }),

				search.createColumn({ name: "custbody_pe_ubicacion_para_serie", label: "T_ubicacionParaSerie" }),
				search.createColumn({ name: "custrecord_pe_direccion_origen", join: "custbody_pe_ubicacion_para_serie", label: "direccionOrigen" }),
				search.createColumn({ name: "terms", join: "createdFrom", label: "T_terms" }),
				search.createColumn({ name: "altname", join: "custbody_pe_empresa_aduanera", label: "altname" }),
				search.createColumn({ name: "custentity_pe_document_number", join: "custbody_pe_empresa_aduanera", label: "documentNumber" }),
				search.createColumn({ name: "address1", join: "custbody_pe_empresa_aduanera", label: "address1Aduanera" }),
				search.createColumn({ name: "address2", join: "custbody_pe_empresa_aduanera", label: "address2Aduanera" }),
				search.createColumn({ name: "country", join: "custbody_pe_empresa_aduanera", label: "countryAduanera" }),
				search.createColumn({ name: "custbody_pe_nro_precinto", label: "precinto" }),
				search.createColumn({ name: "custbody_pe_nro_precinto_2", label: "precinto2" }),
				search.createColumn({ name: "custbody_pe_nro_precinto_3", label: "precinto3" }),
				search.createColumn({ name: "custbody_pe_nro_precinto_4", label: "precinto4" }),
				search.createColumn({ name: "custbody_pe_nro_contenedor", label: "nroContenedor" }),
				search.createColumn({ name: "custbody_pe_nro_contenedor_2", label: "nroContenedor2" }),
				search.createColumn({ name: "custrecord_pe_carrete", join: "custbody_pe_delivery_information", label: "carrete" }),

				search.createColumn({ name: "custrecord_pe_driver_code_document_num", join: "custbody_pe_conductor", label: "driverCodeDocumentNum" }),
				search.createColumn({ name: "custentity_pe_document_number", join: "custbody_pe_empresa_aduanera", label: "aduaneraDocumentNumber" }),
				search.createColumn({ name: "custbody_pe_num_bultos", label: "nroBultos" }),

				//DATOS DEL PUERTO
				search.createColumn({ name: "custrecord_pe_cod_puerto", join: "custbody_pe_cod_puerto", label: "codePuerto" }),
				search.createColumn({ name: "custrecord_locationtypecode", join: "custbody_pe_cod_puerto", label: "locationCodePuerto" }),
				search.createColumn({ name: "custrecord_pe_nombre_puerto", join: "custbody_pe_cod_puerto", label: "nombrePuerto" }),

				//DATOS DEL AEREOPUERTO   
				search.createColumn({ name: "custrecord_pe_cod_aeropuerto", join: "custbody_pe_codigo_aeropuerto", label: "codeAeropuerto" }),
				search.createColumn({ name: "custrecord_locationtypecodeaero", join: "custbody_pe_codigo_aeropuerto", label: "locationCodeAeropuerto" }),
				search.createColumn({ name: "custrecord_pe_nombre_aeropuerto", join: "custbody_pe_codigo_aeropuerto", label: "nombreAeropuerto" }),

				//DATOS DEL TIPO DE DOC PARA LA EMPRESA ADUANERA
				search.createColumn({ name: "custentity_pe_code_document_type", join: "custbody_pe_empresa_aduanera", label: "documentTypeCodeEmpresaAduanera" }),

				//DATOS PARA AdditionalItemProperty
				search.createColumn({ name: "custbody_pe_document_series_ref", label: "serieReferencia" }),
				search.createColumn({ name: "custbody_pe_document_number_ref", label: "numeroReferencia" }),

				//DATOS PARA Item
				search.createColumn({ name: "name", join: "custbody_pe_motivos_de_traslado", label: "motivoName" }),
				search.createColumn({ name: "custrecord_pe_company_name", join: "custbody_pe_delivery_information", label: "companyName" }),

				search.createColumn({ name: "internalid", join: "customer", label: "customerId" }),
				search.createColumn({ name: "createdfrom", label: "createdfromId" }),
			];
			return columns;
		}
		//<F> funciones para la busqueda de transacciones

		function nvl(value, defaultValue) {
			return (value !== null && value !== undefined && value !== '') ? value : defaultValue;
		}

		function parseArguments(args, paramNames) {
			var options = {};

			if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
				options = args[0];
			} else {
				for (var i = 0; i < paramNames.length; i++) {
					options[paramNames[i]] = args[i];
				}
			}

			return options;
		}

		return {
			getDocument: getDocument,
			getCustomer: getCustomer,
			getSubsidiary: getSubsidiary
		}

	});
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @author rhuaccha
*/
define(['N/log', 'N/file', 'N/record', 'N/search'],
	function (log, file, record, search) {

		const STATUS_OK = true;
		const STATUS_ERROR = false;
		const FACTURA = '01';
		const BOLETA = '03';
		const NOTA_CREDITO = '07';
		const NOTA_DEBITO = '08';
		const GUIA_REMISION = '09';
		const COMPROBANTE_RETENCION = '20';
		const TAX_CODE_GRAVADA = 'S-PE';
		const TAX_CODE_INAFECTA = 'IGV_PE:Inaf-PE';
		const TAX_CODE_EXENTA = 'E-PE';
		const TAXT_CODE_UNDEF = 'IGV_PE:UNDEF-PE';
		const TAX_CODE_EXPORT = 'IGV_PE:X-PE';
		const TAX_CODE_GRATUITA = 'TTG_PE:TTG';
		const EXPORT_CODE = '17';
		const SALESORDER = 'salesorder';

		/**
		 * Function that generates the json file for the document type 09
		 * @param {string|number} internalId trasnaction id
		 * @param {json} document json object of the transaction
		 * @returns {Object}
		 */
		function createVendorCreditRequest() {
			var response = {
				status: STATUS_ERROR,
				message: 'Initi process'
			}
			var trace = 'Actividad 1';
			try {
				var paramNames = ['internalId', 'document'];
				var options = parseArguments(arguments, paramNames);
				var document = options.document;
				trace = 'Actividad 2';
				var vendorObj = getVendor(document.entity);
				console.log("hola");
				var primeraParte = {
					"UBLVersionID": [
						{
							"_": "2.0"
						}
					],
					"CustomizationID": [
						{
							"_": "1.0"
						}
					],
					"Signature": [
						{
							"ID": [
								{
									"_": "IDSignature"
								}
							],
							"SignatoryParty": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": document.subsidiary.taxidnum
												}
											]
										}
									],
									"PartyName": [
										{
											"Name": [
												{
													"_": document.subsidiary.legalname
												}
											]
										}
									]
								}
							],
							"DigitalSignatureAttachment": [
								{
									"ExternalReference": [
										{
											"URI": [
												{
													"_": "IDSignature"
												}
											]
										}
									]
								}
							]
						}
					],
					"ID": [
						{
							"_": document.numeracion
						}
					],
					"IssueDate": [
						{
							"_": formatDate(document.trandate)
						}
					],
					"AgentParty": [
						{
							"PartyIdentification": [
								{
									"ID": [
										{
											"_": document.subsidiary.taxidnum,
											"schemeID": document.subsidiary.tipoDocumento
										}
									]
								}
							],
							"PartyName": [
								{
									"Name": [
										{
											"_": document.subsidiary.tradename
										}
									]
								}
							],
							"PartyLegalEntity": [
								{
									"RegistrationName": [
										{
											"_": document.subsidiary.legalname
										}
									]
								}
							]
						}
					],
					"ReceiverParty": [
						{
							"PartyIdentification": [
								{
									"ID": [
										{
											"_": vendorObj.vendor.documentNumber,
											"schemeID": vendorObj.vendor.codeDocumentType,
										}
									]
								}
							],
							"PartyName": [
								{
									"Name": [
										{
											"_": vendorObj.vendor.altName
										}
									]
								}
							],
							"PostalAddress": [
								{
									"ID": [
										{
											"_": vendorObj.vendor.ubigeo
										}
									],
									"StreetName": [
										{
											"_": vendorObj.vendor.address1
										}
									],
									"CityName": [
										{
											"_": vendorObj.vendor.city
										}
									],
									"CountrySubentity": [
										{
											"_": vendorObj.vendor.departamento
										}
									],
									"District": [
										{
											"_": vendorObj.vendor.distrito
										}
									],
									"Country": [
										{
											"IdentificationCode": [
												{
													"_": vendorObj.vendor.billCountry
												}
											]
										}
									]
								}
							],
							"PartyLegalEntity": [
								{
									"RegistrationName": [
										{
											"_": nvl(vendorObj.vendor.companyName, vendorObj.vendor.altName)
										}
									]
								}
							]
						}
					],
					"SUNATRetentionSystemCode": [
						{
							"_": "01"//Retención 3.00%
						}
					],
					"SUNATRetentionPercent": [
						{
							"_": "3.00"//Tasa
						}
					],
					"Note": [
						{
							"_": document.memo
						}
					],
				};
				trace = 'Actividad 3';
				var retTotal = (parseFloat(document.userTotal) * parseFloat(document.exchangerate)).toFixed(2);
				trace = 'Actividad 4';
				primeraParte.TotalInvoiceAmount = [
					{
						"_": retTotal,
						"currencyID": "PEN" //Siempre PEN
					}
				]
				trace = 'Actividad 5';
				var referencias = [];
				var totalSoloPago = 0;
				trace = 'Actividad 6';
				for (var i = 0; i < document.lines.length; i++) {
					var line = document.lines[i];
					var referencia = {};
					trace = 'Actividad 6.1 - ' + i;
					if (line.apply === true || line.apply === 'T') {
						var amountPag = 0;
						var totalPagoItem = 0;
						var amountRet = line.amountRet;

						trace = 'Actividad 6.2 - ' + i;
						if (line.trantype === 'VendBill') {
							var vendorBillObj = getVendorBill(line.doc);
						}
						trace = 'Actividad 6.3 - ' + i;
						referencia.ID = [
							{
								"_": vendorBillObj.vendorBill.serieRef + '-' + vendorBillObj.vendorBill.correlativoRef,
								"schemeID": vendorBillObj.tipoDocRef.tipoDocReferencia
							}
						]
						referencia.IssueDate = [
							{
								"_": vendorBillObj.vendorBill.fechaRef
							}
						]
						referencia.TotalInvoiceAmount = [
							{
								"_": parseFloat(vendorBillObj.vendorBill.montoTotalRef).toFixed(2),
								"currencyID": vendorBillObj.vendorBill.currencyRef
							}
						]
						trace = 'Actividad 6.4 - ' + i;
						var vendorPayment = getVendorPayment(document.memo);
						var vendorPrepayment = getVendorPrepaymentApplication(document.memo);
						trace = 'Actividad 6.5 - ' + i;

						var paymentId = nvl(vendorPayment.data.internalid, vendorPrepayment.data.internalid);
						var paymentCurrencyId = nvl(vendorPayment.data.moneda, vendorPrepayment.data.moneda);
						var paymentPaidDate = nvl(formatDate(vendorPayment.data.trandate), formatDate(vendorPrepayment.data.trandate));

						trace = 'Actividad 6.6 - ' + i;
						var sublistType = vendorPayment.size > 0 ? 'apply' : 'bill';
						var recordType = vendorPayment.size > 0 ? record.Type.VENDOR_PAYMENT : record.Type.VENDOR_PREPAYMENT_APPLICATION

						var recordPay = record.load({
							type: recordType,
							id: paymentId,
							isDynamic: true
						});
						var applyCountVendPay = recordPay.getLineCount({ sublistId: sublistType });
						trace = 'Actividad 6.7 - ' + i;
						for (var j = 0; j < applyCountVendPay; j++) {
							var apply_ = recordPay.getSublistValue({ sublistId: sublistType, fieldId: 'apply', line: j });
							var doc_ = recordPay.getSublistValue({ sublistId: sublistType, fieldId: 'doc', line: j });
							if ((apply_ == 'T' || apply_ == true) && line.doc == doc_) {
								amountPag = recordPay.getSublistValue({ sublistId: sublistType, fieldId: 'amount', line: j });
								totalPagoItem = parseFloat(amountRet) + parseFloat(amountPag)
								totalSoloPago += parseFloat(amountPag);
							}
						}
						trace = 'Actividad 6.8 - ' + i;
						referencia.Payment = [
							{
								"ID": [
									{
										"_": paymentId
									}
								],
								"PaidAmount": [
									{
										"_": totalPagoItem.toFixed(2),
										"currencyID": paymentCurrencyId
									}
								],
								"PaidDate": [
									{
										"_": paymentPaidDate
									}
								]
							}
						]

						trace = 'Actividad 6.9 - ' + i;
						referencia.SUNATRetentionInformation = [
							{
								"SUNATRetentionAmount": [
									{
										"_": (parseFloat(amountRet) * parseFloat(document.exchangerate)).toFixed(2),
										"currencyID": "PEN"//Siempre PEN
									}
								],
								"SUNATRetentionDate": [
									{
										"_": formatDate(document.trandate)
									}
								],
								"SUNATNetTotalPaid": [
									{
										"_": (parseFloat(amountPag) * parseFloat(document.exchangerate)).toFixed(2),
										"currencyID": "PEN"//Siempre PEN
									}
								],
								"ExchangeRate": [
									{
										"SourceCurrencyCode": [
											{
												"_": vendorBillObj.vendorBill.currencyRef
											}
										],
										"TargetCurrencyCode": [
											{
												"_": "PEN"//Siempre PEN
											}
										],
										"CalculationRate": [
											{
												"_": document.exchangerate
											}
										],
										"Date": [
											{
												"_": formatDate(document.trandate)
											}
										]
									}
								]
							}
						]

						referencias.push(referencia)

					} // END IF APPLY
				} // END FOR
				trace = 'Actividad 7';
				primeraParte.SUNATTotalPaid = [
					{
						"_": (totalSoloPago * parseFloat(document.exchangerate)).toFixed(2),
						"currencyID": "PEN"//Siempre PEN
					}
				]
				primeraParte.SUNATRetentionDocumentReference = referencias;
				trace = 'Actividad 8';
				var jsonBody = {
					"_D": "urn:sunat:names:specification:ubl:peru:schema:xsd:Retention-1",
					"_A": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
					"_B": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
					"_E": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
					"_SUNAT": "urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1",
					"Retention": [primeraParte]
				}

				var finalResponse = createRequest({
					ruc: document.subsidiary.taxidnum,
					tipoDocumento: COMPROBANTE_RETENCION,
					numeracion: document.numeracion,
					jsonBody: jsonBody,
					internalId: options.internalId
				});

				response = finalResponse;

			} catch (error) {
				log.debug({
					title: 'createVendorCreditRequest Error - ' + trace,
					details: error
				});
				response.status = STATUS_ERROR;
				response.message = 'createVendorCreditRequest: ' + error.message + ' - trace: ' + trace;
			}
			return response;
		}

		/**
		 * Function that generates the json file for the document type 09
		 * @param {string|number} internalId trasnaction id
		 * @param {json} document json object of the transaction
		 * @returns {Object}
		 */
		function createItemFulfillmentRequest() {
			var response = {
				status: STATUS_ERROR,
				message: 'Initi process'
			}
			var trace = 'Actividad 1';
			//try {
			var paramNames = ['internalId', 'document'];
			var options = parseArguments(arguments, paramNames);
			var document = options.document;
			log.debug('document', document);
			if (document.operationType === EXPORT_CODE) {
				empAduanera = getEmpAduaneraDetails(empAduaId, options.internalId);
			} else {
				empAduanera = getEmptyEmpAduanera();
			}

			var fechaEmision = formatDate(document.trandate);
			var fechaEmisionEntrega = formatDate(document.fechaEntregaReal);
			var fechatraslado = formatDate(document.fechaInicioTraslado);

			var planta = document.direccionOrigen;
			if (planta) {
				planta = planta.replace(/(\r\n|\n|\r)/gm, " ");
			}

			var llegada = document.puntoLlegada.split(':');
			var partida = document.puntoPartida.split(':');

			var searchLoad;
			var searchResult;
			var searchResultTrx;
			var transferOrden = '';
			trace = 'Actividad 2';
			searchLoad = getTransferOrder(document.createdFrom);
			searchResult = searchLoad.searchSize;
			searchResultTrx = searchLoad.searchSize;

			if (searchResult !== 0) {
				var codigo = search.lookupFields({
					type: search.Type.LOCATION,
					id: searchLoad.transferLocation,
					columns: ['custrecord_pe_cod_establishment_annex']
				});
				transferOrden = codigo.custrecord_pe_cod_establishment_annex;
			}
			trace = 'Actividad 3';
			if (searchResult === 0) {
				searchLoad = getSalesOrder(document.createdFrom);
				searchResult = searchLoad.searchSize;
			}
			trace = 'Actividad 4';
			if (searchResult === 0) {
				searchLoad = getVendorReturnAuthorization(document.createdFrom);
				searchResult = searchLoad.searchSize;
			}
			trace = 'Actividad 5';
			log.debug('searchLoad.entityId', searchLoad.entityId);
			var entityObj = getCustomerAditional(searchLoad.entityId);
			log.debug('entityObj', entityObj);
			if (entityObj.status) {
				var custObj = {
					documentNumber: entityObj.custAditional.documentNumber,
					documentType: entityObj.custAditional.documentType,
					altname: entityObj.custAditional.altname,
					departamento: entityObj.custAditional.departamento,
					column26: '',
					address1: entityObj.custAditional.address1,
					country: entityObj.custAditional.country,
					distrito: entityObj.custAditional.distrito
				}
			} else {
				var custObj = {
					documentNumber: document.customer.taxNumber,
					documentType: document.customer.tipoDocCustmer,
					altname: document.customer.altname,
					departamento: document.customer.departamento,
					column26: '',
					ubigeo: document.customer.codeUbigeo,
					address1: document.customer.address1,
					country: document.customer.country,
					distrito: document.customer.distrito,
					ciudad: document.customer.city,
				}
			}

			trace = 'Actividad 6';
			if (searchResultTrx !== 0) {
				custObj = {
					documentNumber: searchLoad.aditional.taxidnum,
					documentType: '6',
					altname: searchLoad.aditional.legalname,
					departamento: searchLoad.aditional.departamento,
					column26: searchLoad.aditional.state,
					address1: searchLoad.aditional.address1,
					country: searchLoad.aditional.country,
					distrito: searchLoad.aditional.distrito
				}
			}
			trace = 'Actividad 7';

			var suma = 0;


			var detalleItems = [];
			var index = 0;
			trace = 'Actividad 8';
			for (var i = 0; i < document.lines.length; i++) {
				var line = document.lines[i];
				var quantity = line.quantity;

				if (line.itemType === 'Kit') {
				} else {
					suma += quantity;
				}




				var unit = '';

				var itemObj = getItem(line.itemId);

				if (document.motivoName === '09 EXPORTACION') {
					unit = itemObj.item.expoUnit;
				} else {
					unit = itemObj.item.measure;
				}

				var pesoTotal = line.pesoTotal;;
				/*if (!isValid(pesoTotal)) {
					pesoTotal = Number((Number(quantity) * Number(itemObj.item.peso)).toFixed(2));
				}*/

				if (line.itemType === 'Kit') {
				} else {
					detalleItems.push({
						"ID": [
							{
								"_": index + 1
							}
						],
						"Note": [
							{
								"_": itemObj.item.description,
							}

						],
						"DeliveredQuantity": [
							{
								"_": quantity,
								"unitCode": itemObj.item.measure
							}
						],
						"OrderLineReference": [
							{
								"LineID": [
									{
										"_": i + 1
									}
								]
							}
						],
						"Item": [
							{
								"Description": [
									{
										"_": line.description
									}
								],
								"SellersItemIdentification": [
									{
										"ID": [
											{
												"_": line.codigo
											}
										]
									}
								]

							}
						]
					});
					index++;
				}

			} // END FOR

			trace = 'Actividad 9';

			var jsonBody;
			jsonBody = {

				"UBLVersionID": [
					{
						"_": "2.1"
					}
				],
				"CustomizationID": [
					{
						"_": "2.0"
					}
				],
				"ID": [
					{
						"_": document.serie + '-' + document.number
					}
				],
				"IssueDate": [
					{
						"_": fechaEmision,
					}
				],
				"IssueTime": [
					{
						"_": "00:00:00"
					}
				],
				"DespatchAdviceTypeCode": [
					{
						"_": GUIA_REMISION //"09"
					}
				],
				"Note": [
					{
						"_": String(document.memo).toUpperCase()
					}
				],
				"LineCountNumeric": [
					{
						"_": document.lines.length
					}
				]
			};
			trace = 'Actividad 10';




			var lookupResult = search.lookupFields({
				type: search.Type.SALES_ORDER,
				id: document.createdfromId,
				columns: ['type']
			});
			var createValue = '';
			if (Object.keys(lookupResult).length !== 0) {
				createValue = lookupResult.type[0].value;
			}
			trace = 'Actividad 12';
			if (document.motivo === '01' && createValue === 'SalesOrd') {
				var relatedDoc = getRelatedDocument(document.createdfromId);
				log.debug('relatedDoc', relatedDoc);
				if (relatedDoc.data) {
					var addDocRef = {
						"AdditionalDocumentReference": [
							{
								"ID": [
									{
										"_": relatedDoc.data.serie + "-" + relatedDoc.data.numero
									}
								],
								"DocumentTypeCode": [
									{
										"_": relatedDoc.data.tipoDoc
									}
								],
								"IssuerParty": [
									{
										"PartyIdentification": [
											{
												"ID": [
													{
														"_": relatedDoc.data.subsidiary,
														"schemeID": "6"
													}
												]
											}
										]
									}
								]
							}
						]
					}
					jsonBody = fusionarObjetos(jsonBody, addDocRef);
				}

			}

			trace = 'Actividad 13';
			var AdditionalDocumentReference;
			if (document.serieReferencia) {
				AdditionalDocumentReference = {
					"AdditionalDocumentReference": [
						{
							"ID": [
								{
									"_": document.serieReferencia + "-" + document.numeroReferencia
								}
							],
							"DocumentTypeCode": [
								{
									"_": document.documentTypeCodeRef
								}
							],
							"DocumentType": [
								{
									"_": document.documentTypeRefName
								}
							],
							"IssuerParty": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": searchLoad.aditional.taxidnum,
													"schemeID": "6"
												}
											]
										}
									]
								}
							]
						}
					]
				}
				jsonBody = fusionarObjetos(jsonBody, AdditionalDocumentReference);
			}
			AdditionalDocumentReference = {
				"AdditionalDocumentReference": [
					{
						"ID": [
							{
								"_": "118-2022-40-0001"
							}
						],
						"DocumentTypeCode": [
							{
								"_": "50"
							}
						],
						"DocumentType": [
							{
								"_": "Descripcion tipo de documento relacionado"
							}
						]
					}
				]
			};

			var Signature = {
				"Signature": [
					{
						"ID": [
							{
								"_": "IDSignature"
							}
						],
						"SignatoryParty": [
							{
								"PartyIdentification": [
									{
										"ID": [
											{
												"_": document.subsidiary.taxidnum
											}
										]
									}
								],
								"PartyName": [
									{
										"Name": [
											{
												"_": document.subsidiary.legalname
											}
										]
									}
								]
							}
						],
						"DigitalSignatureAttachment": [
							{
								"ExternalReference": [
									{
										"URI": [
											{
												"_": "IDSignature"
											}
										]
									}
								]
							}
						]
					}
				],
				"DespatchSupplierParty": [
					{
						"Party": [
							{
								"PartyIdentification": [
									{
										"ID": [
											{
												"_": document.subsidiary.taxidnum,
												"schemeID": document.subsidiary.tipoDocumento,
											}
										]
									}
								],
								"PostalAddress": [
									{
										"ID": [
											{
												"_": document.subsidiary.zip
											}
										],
										"StreetName": [
											{
												"_": document.subsidiary.address1
											}
										],
										"CitySubdivisionName": [
											{
												"_": "URBANIZACION"
											}
										],
										"CityName": [
											{
												"_": document.subsidiary.city
											}
										],
										"CountrySubentity": [
											{
												"_": document.subsidiary.state
											}
										],
										"District": [
											{
												"_": document.subsidiary.address2
											}
										],
										"Country": [
											{
												"IdentificationCode": [
													{
														"_": document.subsidiary.country
													}
												]
											}
										]
									}
								],
								"PartyLegalEntity": [
									{
										"RegistrationName": [
											{
												"_": document.subsidiary.legalname
											}
										]
									}
								]
							}
						]
					}
				],
				"DeliveryCustomerParty": [
					{
						"Party": [
							{
								"PartyIdentification": [
									{
										"ID": [
											{
												"_": (document.operationType === EXPORT_CODE) ? document.aduaneraDocumentNumber : custObj.documentNumber, //column21,
												"schemeID": (document.operationType === EXPORT_CODE) ? document.documentTypeCodeEmpresaAduanera : custObj.documentType
											}
										]
									}
								],
								"PostalAddress": [
									{
										"ID": [
											{
												"_": (document.operationType === EXPORT_CODE) ? empAduanera.details.zipCode : custObj.ubigeo, //zipCustomer
											}
										],
										"StreetName": [
											{
												"_": (document.operationType === EXPORT_CODE) ? empAduanera.details.direccion : custObj.address1, //column23
											}
										],
										"CitySubdivisionName": [
											{
												"_": "URBANIZACION"
											}
										],
										"CityName": [
											{
												"_": (document.operationType === EXPORT_CODE) ? empAduanera.details.provincia : custObj.ciudad, //column25
											}
										],
										"CountrySubentity": [
											{
												"_": (document.operationType === EXPORT_CODE) ? empAduanera.details.departamento : custObj.departamento, //column26
											}
										],
										"District": [
											{
												"_": (document.operationType === EXPORT_CODE) ? empAduanera.details.distrito : custObj.distrito, //column27
											}
										],
										"Country": [
											{
												"IdentificationCode": [
													{
														"_": (document.operationType === EXPORT_CODE) ? empAduanera.details.pais : custObj.country, //column28
													}
												]
											}
										]
									}
								],
								"PartyLegalEntity": [
									{
										"RegistrationName": [
											{
												"_": (document.operationType === EXPORT_CODE) ? empAduanera.details.nombreProveedor : custObj.altname, //column22
											}
										]
									}
								],
								"Contact": [
									{
										"ElectronicMail": [
											{
												"_": "correo@efact.pe"
											}
										]
									}
								]
							}
						]
					}
				]
			}
			trace = 'Actividad 14';
			var firstArrivalPortLocationId;
			if (document.codePuerto) {
				firstArrivalPortLocationId = document.codePuerto;
			} else {
				firstArrivalPortLocationId = document.codeAeropuerto
			}
			trace = 'Actividad 15';
			var firstArrivalPortLocationTypeCode;
			if (document.locationCodeAeropuerto) {
				firstArrivalPortLocationTypeCode = document.locationCodePuerto;
			} else {
				firstArrivalPortLocationTypeCode = document.locationCodeAeropuerto;
			}
			trace = 'Actividad 16';
			var firstArrivalPortLocationName;
			if (document.nombrePuerto) {
				firstArrivalPortLocationName = document.nombrePuerto;
			} else {
				firstArrivalPortLocationName = document.nombreAeropuerto;
			}
			log.debug('document', document);
			trace = 'Actividad 17';
			if (document.modalidad == '02') {
				if (document.operationType === EXPORT_CODE) {
					Shipment = {
						"Shipment": [
							{
								"ID": [
									{
										"_": "SUNAT_Envio"
									}
								],
								"HandlingCode": [
									{
										"_": document.motivo
									}
								],
								"HandlingInstructions": [
									{
										"_": document.reasonDetails
									}
								],
								"GrossWeightMeasure": [
									{
										"_": (parseFloat(document.pesoTn)).toFixed(2),
										"unitCode": "KGM"
									}
								],
								"TotalTransportHandlingUnitQuantity": [
									{
										"_": document.nroBultos
									}
								],
								"SpecialInstructions": [
									{
										"_": "SUNAT_Envio_IndicadorVehiculoConductoresTransp"
									}
								],
								"ShipmentStage": [
									{
										"TransportModeCode": [
											{
												"_": document.modalidad
											}
										],
										"TransitPeriod": [
											{
												"StartDate": [
													{
														"_": fechatraslado
													}
												]
											}
										],
										"DriverPerson": [
											{
												"ID": [
													{
														"_": document.driverDocumentNumber,
														"schemeID": document.driverCodeDocumentNum
													}
												],
												"FirstName": [
													{
														"_": document.driverName
													}
												],
												"FamilyName": [
													{
														"_": document.driverLastName
													}
												],
												"JobTitle": [
													{
														"_": "Principal"
													}
												],
												"IdentityDocumentReference": [
													{
														"ID": [
															{
																"_": document.driverLicense
															}
														]
													}
												]
											}
										]

									}
								],
								"Delivery": [
									{
										"DeliveryAddress": [
											{
												"ID": [
													{
														"_": document.codLlegada
													}
												],
												'AddressTypeCode': document.motivo == '04' ? [
													{
														"_": transferOrden,
														"listID": custObj.documentNumber

													}
												] : [],
												"CitySubdivisionName": [
													{
														"_": "URBANIZACION"
													}
												],

												"CityName": [
													{
														"_": llegada[0]
													}
												],
												"CountrySubentity": [
													{
														"_": llegada[1]
													}
												],
												"District": [
													{
														"_": llegada[1]
													}
												],
												"AddressLine": [
													{
														"Line": [
															{
																"_": document.direccionEntrega
															}
														]
													}
												],
												"Country": [
													{
														"IdentificationCode": [
															{
																"_": "PE"
															}
														]
													}
												]
											}
										],
										"Despatch": [
											{
												"DespatchAddress": [
													{
														"ID": [
															{
																"_": document.codPartida
															}
														],
														'AddressTypeCode': document.motivo == '04' ? [
															{
																"_": document.codigoEstablecimiento,
																"listID": searchLoad.aditional.taxidnum

															}
														] : [],
														"CitySubdivisionName": [
															{
																"_": "URBANIZACION"
															}
														],
														"CityName": [
															{
																"_": partida[0]
															}
														],
														"CountrySubentity": [
															{
																"_": partida[1]
															}
														],
														"District": [
															{
																"_": partida[2]
															}
														],
														"AddressLine": [
															{
																"Line": [
																	{
																		"_": document.sourceAddress
																	}
																]
															}
														],
														"Country": [
															{
																"IdentificationCode": [
																	{
																		"_": "PE"
																	}
																]
															}
														]
													}
												]
											}
										]
									}
								],
								"TransportHandlingUnit": [
									{
										"TransportEquipment": [
											{
												"ID": [
													{
														"_": document.carPlate
													},
												],
												"ApplicableTransportMeans": [
													{
														"RegistrationNationalityID": [
															{
																"_": document.certificateTransportista
															}
														]
													}
												]
											}
										]
									}
								],
								"FirstArrivalPortLocation": [
									{
										"ID": [
											{
												"_": firstArrivalPortLocationId
											}
										],
										"LocationTypeCode": [
											{
												"_": firstArrivalPortLocationTypeCode
											}
										],
										"Name": [
											{
												"_": firstArrivalPortLocationName
											}
										]
									}
								]
							}
						]
					}
				} else {
					Shipment = {
						"Shipment": [
							{
								"ID": [
									{
										"_": "SUNAT_Envio"
									}
								],
								"HandlingCode": [
									{
										"_": document.motivo
									}
								],
								"HandlingInstructions": [
									{
										"_": document.reasonDetails
									}
								],
								"GrossWeightMeasure": [
									{
										"_": (parseFloat(document.pesoTn)).toFixed(2),
										"unitCode": "KGM"
									}
								],
								"ShipmentStage": [
									{
										"TransportModeCode": [
											{
												"_": document.modalidad
											}
										],
										"TransitPeriod": [
											{
												"StartDate": [
													{
														"_": fechatraslado
													}
												]
											}
										],
										"DriverPerson": [
											{
												"ID": [
													{
														"_": document.driverDocumentNumber,
														"schemeID": document.driverCodeDocumentNum
													}
												],
												"FirstName": [
													{
														"_": document.driverName
													}
												],
												"FamilyName": [
													{
														"_": document.driverLastName
													}
												],
												"JobTitle": [
													{
														"_": "Principal"
													}
												],
												"IdentityDocumentReference": [
													{
														"ID": [
															{
																"_": document.driverLicense
															}
														]
													}
												]
											}
										]
									}
								],
								"Delivery": [
									{
										"DeliveryAddress": [
											{
												"ID": [
													{
														"_": document.codLlegada
													}
												],
												'AddressTypeCode': document.motivo == '04' ? [
													{
														"_": transferOrden,
														"listID": custObj.documentNumber

													}
												] : [],
												"CitySubdivisionName": [
													{
														"_": "URBANIZACION"
													}
												],

												"CityName": [
													{
														"_": llegada[0]
													}
												],
												"CountrySubentity": [
													{
														"_": llegada[1]
													}
												],
												"District": [
													{
														"_": llegada[1]
													}
												],
												"AddressLine": [
													{
														"Line": [
															{
																"_": document.direccionEntrega
															}
														]
													}
												],
												"Country": [
													{
														"IdentificationCode": [
															{
																"_": "PE"
															}
														]
													}
												]
											}
										],
										"Despatch": [
											{
												"DespatchAddress": [
													{
														"ID": [
															{
																"_": document.codPartida
															}
														],
														'AddressTypeCode': document.motivo == '04' ? [
															{
																"_": document.codigoEstablecimiento,
																"listID": searchLoad.aditional.taxidnum

															}
														] : [],
														"CitySubdivisionName": [
															{
																"_": "URBANIZACION"
															}
														],
														"CityName": [
															{
																"_": partida[0]
															}
														],
														"CountrySubentity": [
															{
																"_": partida[1]
															}
														],
														"District": [
															{
																"_": partida[2]
															}
														],
														"AddressLine": [
															{
																"Line": [
																	{
																		"_": document.sourceAddress
																	}
																]
															}
														],
														"Country": [
															{
																"IdentificationCode": [
																	{
																		"_": "PE"
																	}
																]
															}
														]
													}
												]
											}
										]
									}
								],
								"TransportHandlingUnit": [
									{
										"TransportEquipment": [
											{
												"ID": [
													{
														"_": document.carPlate
													},
												],
												"ApplicableTransportMeans": [
													{
														"RegistrationNationalityID": [
															{
																"_": document.certificateTransportista
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				}
			} else {
				if (document.operationType == EXPORT_CODE) {
					Shipment = {
						"Shipment": [
							{
								"ID": [
									{
										"_": "SUNAT_Envio"
									}
								],
								"HandlingCode": [
									{
										"_": document.motivo
									}
								],
								"HandlingInstructions": [
									{
										"_": document.reasonDetails
									}
								],
								"GrossWeightMeasure": [
									{
										"_": document.pesoTn,
										"unitCode": "KGM"
									}
								],
								"TotalTransportHandlingUnitQuantity": [
									{
										"_": document.nroBultos
									}
								],
								"SpecialInstructions": [
									{
										"_": "SUNAT_Envio_IndicadorVehiculoConductoresTransp"
									}
								],
								"ShipmentStage": [
									{
										"TransportModeCode": [
											{
												"_": document.modalidad
											}
										],
										"TransitPeriod": [
											{
												"StartDate": [
													{
														"_": fechatraslado
													}
												]
											}
										],
										"CarrierParty": [
											{
												"PartyIdentification": [
													{
														"ID": [
															{
																"_": document.rucVendor,
																"schemeID": "6"
															}
														]
													}
												],
												"PartyLegalEntity": [
													{
														"RegistrationName": [
															{
																"_": document.companyName
															}
														],
														"CompanyID": [
															{
																"_": nvl(document.registroMtc, '')
															}
														]
													}
												],

											}
										],
										"DriverPerson": [
											{
												"ID": [
													{
														"_": document.driverDocumentNumber,
														"schemeID": document.driverCodeDocumentNum
													}
												],
												"FirstName": [
													{
														"_": document.driverName
													}
												],
												"FamilyName": [
													{
														"_": document.driverLastName
													}
												],
												"JobTitle": [
													{
														"_": "Principal"
													}
												],
												"IdentityDocumentReference": [
													{
														"ID": [
															{
																"_": document.driverLicense
															}
														]
													}
												]
											}
										]
									}
								],
								"Delivery": [
									{
										"DeliveryAddress": [
											{
												"ID": [
													{
														"_": document.codLlegada
													}
												],
												'AddressTypeCode': document.motivo == '04' ? [
													{
														"_": transferOrden,
														"listID": custObj.documentNumber

													}
												] : [],
												"CitySubdivisionName": [
													{
														"_": "URBANIZACION"
													}
												],

												"CityName": [
													{
														"_": llegada[0]
													}
												],
												"CountrySubentity": [
													{
														"_": llegada[1]
													}
												],
												"District": [
													{
														"_": llegada[1]
													}
												],
												"AddressLine": [
													{
														"Line": [
															{
																"_": document.direccionEntrega
															}
														]
													}
												],
												"Country": [
													{
														"IdentificationCode": [
															{
																"_": "PE"
															}
														]
													}
												]
											}
										],
										"Despatch": [
											{
												"DespatchAddress": [
													{
														"ID": [
															{
																"_": document.codPartida
															}
														],
														'AddressTypeCode': document.motivo == '04' ? [
															{
																"_": document.codigoEstablecimiento,
																"listID": searchLoad.aditional.taxidnum

															}
														] : [],
														"CitySubdivisionName": [
															{
																"_": "URBANIZACION"
															}
														],

														"CityName": [
															{
																"_": partida[0]
															}
														],
														"CountrySubentity": [
															{
																"_": partida[1]
															}
														],
														"District": [
															{
																"_": partida[2]
															}
														],
														"AddressLine": [
															{
																"Line": [
																	{
																		"_": document.sourceAddress
																	}
																]
															}
														],
														"Country": [
															{
																"IdentificationCode": [
																	{
																		"_": "PE"
																	}
																]
															}
														]
													}
												]

											}
										]
									}
								],
								"TransportHandlingUnit": [
									{
										"TransportEquipment": [
											{
												"ID": [
													{
														"_": document.carPlate
													},
												],
												"ApplicableTransportMeans": [
													{
														"RegistrationNationalityID": [
															{
																"_": document.certificateTransportista
															}
														]
													}
												]
											}
										]
									}
								],
								"FirstArrivalPortLocation": [
									{
										"ID": [
											{
												"_": firstArrivalPortLocationId
											}
										],
										"LocationTypeCode": [
											{
												"_": firstArrivalPortLocationTypeCode
											}
										],
										"Name": [
											{
												"_": firstArrivalPortLocationName
											}
										]
									}
								]
							}
						]
					}

					if (document.autorizacionPrincipal) {
						Shipment.Shipment[0].ShipmentStage[0].CarrierParty[0].AgentParty = [{
							"PartyLegalEntity": [
								{
									"CompanyID": [
										{
											"_": nvl(document.document.autorizacionPrincipal, ''),
											"schemeID": "06"
										}
									]
								}
							]

						}]
					}
				} else {
					Shipment = {
						"Shipment": [
							{
								"ID": [
									{
										"_": "SUNAT_Envio"
									}
								],
								"HandlingCode": [
									{
										"_": document.motivo
									}
								],
								"HandlingInstructions": [
									{
										"_": document.reasonDetails
									}
								],
								"GrossWeightMeasure": [
									{
										"_": document.pesoTn,
										"unitCode": "KGM"
									}
								],
								"SpecialInstructions": [
									{
										"_": "SUNAT_Envio_IndicadorVehiculoConductoresTransp"
									}
								],
								"ShipmentStage": [
									{
										"TransportModeCode": [
											{
												"_": document.modalidad
											}
										],
										"TransitPeriod": [
											{
												"StartDate": [
													{
														"_": fechatraslado
													}
												]
											}
										],
										"CarrierParty": [
											{
												"PartyIdentification": [
													{
														"ID": [
															{
																"_": document.rucVendor,
																"schemeID": "6"
															}
														]
													}
												],
												"PartyLegalEntity": [
													{
														"RegistrationName": [
															{
																"_": document.companyName
															}
														],
														"CompanyID": [
															{
																"_": nvl(document.registroMtc, '')
															}
														]
													}
												],

											}
										],
										"DriverPerson": [
											{
												"ID": [
													{
														"_": document.driverDocumentNumber,
														"schemeID": document.driverCodeDocumentNum
													}
												],
												"FirstName": [
													{
														"_": document.driverName
													}
												],
												"FamilyName": [
													{
														"_": document.driverLastName
													}
												],
												"JobTitle": [
													{
														"_": "Principal"
													}
												],
												"IdentityDocumentReference": [
													{
														"ID": [
															{
																"_": document.driverLicense
															}
														]
													}
												]
											}
										]
									}
								],
								"Delivery": [
									{
										"DeliveryAddress": [
											{
												"ID": [
													{
														"_": document.codLlegada
													}
												],
												'AddressTypeCode': document.motivo == '04' ? [
													{
														"_": transferOrden,
														"listID": custObj.documentNumber

													}
												] : [],
												"CitySubdivisionName": [
													{
														"_": "URBANIZACION"
													}
												],

												"CityName": [
													{
														"_": llegada[0]
													}
												],
												"CountrySubentity": [
													{
														"_": llegada[1]
													}
												],
												"District": [
													{
														"_": llegada[1]
													}
												],
												"AddressLine": [
													{
														"Line": [
															{
																"_": document.direccionEntrega
															}
														]
													}
												],
												"Country": [
													{
														"IdentificationCode": [
															{
																"_": "PE"
															}
														]
													}
												]
											}
										],
										"Despatch": [
											{
												"DespatchAddress": [
													{
														"ID": [
															{
																"_": document.codPartida
															}
														],
														'AddressTypeCode': document.motivo == '04' ? [
															{
																"_": document.codigoEstablecimiento,
																"listID": searchLoad.aditional.taxidnum

															}
														] : [],
														"CitySubdivisionName": [
															{
																"_": "URBANIZACION"
															}
														],

														"CityName": [
															{
																"_": partida[0]
															}
														],
														"CountrySubentity": [
															{
																"_": partida[1]
															}
														],
														"District": [
															{
																"_": partida[2]
															}
														],
														"AddressLine": [
															{
																"Line": [
																	{
																		"_": document.sourceAddress
																	}
																]
															}
														],
														"Country": [
															{
																"IdentificationCode": [
																	{
																		"_": "PE"
																	}
																]
															}
														]
													}
												]

											}
										]
									}
								],
								"TransportHandlingUnit": [
									{
										"TransportEquipment": [
											{
												"ID": [
													{
														"_": document.carPlate
													},
												],
												"ApplicableTransportMeans": [
													{
														"RegistrationNationalityID": [
															{
																"_": document.certificateTransportista
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
					if (document.autorizacionPrincipal) {
						Shipment.Shipment[0].ShipmentStage[0].CarrierParty[0].AgentParty = [{

							"PartyLegalEntity": [
								{
									"CompanyID": [
										{
											"_": nvl(document.autorizacionPrincipal, ''),
											"schemeID": "06"
										}
									]
								}
							]

						}]
					}
				}

			}

			trace = 'Actividad 18';
			DespatchLine = {
				"DespatchLine": detalleItems
			}
			trace = 'Actividad 19';
			jsonBody = fusionarObjetos(jsonBody, Signature);
			jsonBody = fusionarObjetos(jsonBody, Shipment);
			jsonBody = fusionarObjetos(jsonBody, DespatchLine);

			trace = 'Actividad 20';
			var AdditionalItemPropertyDam = {
				"AdditionalItemProperty": [
					{
						"Name": [
							{
								"_": "Numero de declaracion aduanera (DAM)"
							}
						],
						"NameCode": [
							{
								"_": "7021"
							}
						],
						"Value": [
							{
								"_": document.serieReferencia + '-' + document.numeroReferencia
							}
						]
					}, {
						"Name": [
							{
								"_": "Numero de serie en la DAM o DS"
							}
						],
						"NameCode": [
							{
								"_": "7023"
							}
						],
						"Value": [
							{
								"_": "0001"
							}
						]
					}
				]
			}

			trace = 'Actividad 21';
			if (document.operationType === EXPORT_CODE) {
				for (var i = 0; i < jsonBody.DespatchLine.length; i++) {
					jsonBody.DespatchLine[i].Item[0].AdditionalItemProperty = AdditionalItemPropertyDam.AdditionalItemProperty;
				}
			}

			trace = 'Actividad 22';
			jsonBody = {
				"_D": "urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2",
				"_A": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
				"_B": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
				"_E": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
				"DespatchAdvice": [jsonBody]
			};
			trace = 'Actividad 23';
			var finalResponse = createRequest({
				ruc: document.subsidiary.taxidnum,
				tipoDocumento: GUIA_REMISION,
				numeracion: document.serie + '-' + document.number,
				jsonBody: jsonBody,
				internalId: options.internalId
			});

			response = finalResponse;

			/*} catch (error) {
				log.debug({
					title: 'createItemFulfillmentRequest Error - ' + trace,
					details: error
				});
				response.status = STATUS_ERROR;
				response.message = 'createItemFulfillmentRequest: ' + error.message + ' - trace: ' + trace;
			}*/
			return response;
		}

		/**
		 * Function that generates the json file for the document type 07 Credit memo
		 * @param {string|number} internalId trasnaction id
		 * @param {json} document json object of the transaction
		 * @returns {Object}
		 */
		function createCreditMemoRequest() {
			var response = {
				status: STATUS_ERROR,
				message: 'Initi process'
			}
			var trace = 'Actividad 1';
			//try {
				var paramNames = ['internalId', 'document'];
				var options = parseArguments(arguments, paramNames);
				var document = options.document;
				var taxelement = [];

				trace = 'Actividad 2';
				var fechaEmision = formatDate(document.trandate);

				var newDate = '';
				if (document.fechaVencRef) {
					var dateArr = document.fechaVencRef.split("/");
					var initDate = new Date(dateArr[2], dateArr[1] - 1, dateArr[0]);
					initDate.setDate(initDate.getDate());
					newDate = initDate.toISOString().split('T')[0];
				}

				var fechaVencDateAdi = formatDate(document.fechaVencDateAdi);

				trace = 'Actividad 3';
				var linesObj = processCreditMemoLine(document.lines, document.freeOperation, document.total, document.taxtotal);
                log.debug('linesObj',linesObj);
				if (linesObj.status === STATUS_ERROR) {
					response.status = STATUS_ERROR;
					response.message = 'No se puede procesar la informacion de la Nota de Crédito: ' + linesObj.message;
					return response;
				}
				trace = 'Actividad 4';
				var importeTotal = linesObj.details.importetotal;
				var converter = new NumberToWordsConverter();
				var numberToWords = String(converter.convertNumberToWords(importeTotal, document.currency)).toUpperCase();

				trace = 'Actividad 5';
				var totalVentas = 0;
				var TaxAmount = 0;
				var TaxScheme = 0;
				var apliccaanticipo = 0;
				var anticipotaxtotal = 0;
				var anticiposubtotal = 0;
				var taxcheme;
				var gravadasObj = linesObj.details.gravadas;
				var TaxTypeCode = 'VAT';
				trace = 'Actividad 6';
				if (gravadasObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(gravadasObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestosgra[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestosgra[0].idImpuesto;
					taxcheme = 'IGV';
					if (document.freeOperation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(gravadasObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal);
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 7';
				var exoneradasObj = linesObj.details.exoneradas;
				if (exoneradasObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(exoneradasObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestosexo[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestosexo[0].idImpuesto;
					taxcheme = 'EXO';
					if (document.freeOperation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(exoneradasObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal)
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 8';
				var gratuitaObj = linesObj.details.gratuita;
				if (gratuitaObj != 'Vacio') {

					TaxAmount = linesObj.details.totalimpuestoigratuita[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestoigratuita[0].idImpuesto;
					TaxTypeCode = 'FRE'
					taxcheme = 'GRA';
					var taxableAmount = TaxableAmount(gratuitaObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal)
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 9';
				var inafectasObj = linesObj.details.inafectas;
				if (inafectasObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(inafectasObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestosina[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestosina[0].idImpuesto;
					taxcheme = 'INA';
					TaxTypeCode = 'FRE';
					if (document.freeOperation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(inafectasObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal)
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 10';
				var exportacionObj = linesObj.details.exportacion;
				if (exportacionObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(exportacionObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestoiExport[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestoiExport[0].idImpuesto;
					taxcheme = 'EXP';
					TaxTypeCode = 'FRE';
					if (document.freeOperation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(exportacionObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal)
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 11';
				if (document.freeOperation === true) {
					taxcheme = 'GRA';
					TaxTypeCode = 'FRE';
				}

				var detalleItems = [];
				var totalImpuestos = 0;
				var subtotalCmAmount = 0;
				var valordeventaunitario = 0;
				trace = 'Actividad 12';
				for (var i = 0; i < linesObj.details.det.length; i++) {
					var item = linesObj.details.det[i];
					subtotalCmAmount += item.amount;
					totalImpuestos = totalImpuestos + parseFloat(item.totalImpuestos[0].montoImpuesto);
					valordeventaunitario = parseFloat(item.valorVenta) / parseFloat(item.cantidadItems)

					var importeBruto = parseFloat(item.importeBruto);
					var descuento = 0;

					if (item.cargoDescuento) {
						descuento = parseFloat(item.cargoDescuento[0].importeBruto);
					}
					var campo_AT = importeBruto + descuento;
					campo_AT = campo_AT.toFixed(2);
					trace = 'Actividad 13 - ' + i;
					detalleItems.push({
						"ID": [
							{
								"_": item.numeroItem
							}
						],
						"Note": [
							{
								"_": item.unidad
							}
						],
						"CreditedQuantity": [
							{
								"_": item.cantidadItems,
								"unitCode": item.unidad,
								"unitCodeListID": "UN/ECE rec 20",
								"unitCodeListAgencyName": "United Nations Economic Commission for Europe"
							}
						],
						"LineExtensionAmount": [
							{
								"_": item.valorVenta,
								"currencyID": document.currency
							}
						],
						"BillingReference": [
							{
								"BillingReferenceLine": [
									{
										"ID": [
											{
												"_": campo_AT,
												"schemeID": "AT"
											}
										]
									}
								]
							}
						],
						"PricingReference": [
							{
								"AlternativeConditionPrice": [
									{
										"PriceAmount": [
											{
												"_": document.freeOperation == true ? valordeventaunitario.toFixed(2).toString() : item.precioVentaUnitario,
												"currencyID": document.currency
											}
										],
										"PriceTypeCode": [
											{
												"_": item.tipoprecio,
												"listName": "Tipo de Precio",
												"listAgencyName": "PE:SUNAT",
												"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16"
											}
										]
									}
								]
							}
						],
						"TaxTotal": [
							{
								"TaxAmount": [
									{
										"_": (document.freeOperation == true) ? "0.00" : (item.taxCodeDisplay === TAX_CODE_GRATUITA) ? "0.00" : item.totalImpuestos[0].montoImpuesto, //<I> rhuaccha: 2024-08-29
										"currencyID": document.currency
									}
								],
								"TaxSubtotal": [
									{
										"TaxableAmount": [
											{
												"_": item.totalImpuestos[0].montoBase,
												"currencyID": document.currency
											}
										],
										"TaxAmount": [
											{
												"_": item.taxCodeDisplay === TAX_CODE_GRATUITA ? "0.00" : item.totalImpuestos[0].montoImpuesto, //<I> rhuaccha: 2024-08-29
												"currencyID": document.currency
											}
										],
										"TaxCategory": [
											{
												"Percent": [
													{
														"_": item.taxCodeDisplay === TAX_CODE_GRATUITA ? "0.00" : item.totalImpuestos[0].porcentaje, //<I> rhuaccha: 2024-08-29
													}
												],
												"TaxExemptionReasonCode": [
													{
														"_": item.totalImpuestos[0].tipoAfectacion,
														"listAgencyName": "PE:SUNAT",
														"listName": "Afectacion del IGV",
														"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
													}
												],
												"TaxScheme": [
													{
														"ID": [
															{
																"_": item.totalImpuestos[0].idImpuesto,
																"schemeName": "Codigo de tributos",
																"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
																"schemeAgencyName": "PE:SUNAT"
															}
														],
														"Name": [
															{
																"_": item.taxcheme
															}
														],
														"TaxTypeCode": [
															{
																"_": item.TaxTypeCode
															}
														]
													}
												]
											}
										]
									}
								]
							}
						],
						"Item": [
							{
								"Description": [
									{
										"_": item.descripcionProducto
									}
								],
								"SellersItemIdentification": [
									{
										"ID": [
											{
												"_": item.codigoProducto
											}
										]
									}
								]
							}
						],
						"Price": [
							{
								"PriceAmount": [
									{
										"_": document.freeOperation == true ? "0.00" : item.valorUnitario,
										"currencyID": document.currency
									}
								]
							}
						]
					});
					
				
					//<F> rhuaccha: 2024-09-13
				} // END FOR

				var direccionEntrega = document.direccionEntrega;
				if (direccionEntrega) {
					direccionEntrega = direccionEntrega.replace(/\n/g, ' ');
				}
				trace = 'Actividad 16';

				var createdfromType = document.type;
				var ordenFactura;
				var notaF;

				trace = 'Actividad 17';
				if (createdfromType === 'RtnAuth') {
					if (document.createdfrom) {
						ordenFactura = search.create({
							type: search.Type.INVOICE,
							filters:
								[
									["type", search.Operator.ANYOF, "CustInvc"],
									"AND",
									["internalid", search.Operator.ANYOF, document.createdfrom]
								],
							columns:
								[
									search.createColumn({ name: "tranid", join: "createdFrom" })
								]
						}).run().getRange(0, 1)[0].getValue({ name: "tranid", join: "createdFrom" });
					}
				} else {
					if (document.createdfrom) {
						ordenFactura = search.create({
							type: search.Type.SALES_ORDER,
							filters:
								[
									["type", search.Operator.ANYOF, "SalesOrd"],
									"AND",
									["internalid", search.Operator.ANYOF, document.createdfrom]
								],
							columns:
								[
									search.createColumn({ name: "tranid" })
								]
						}).run().getRange(0, 1)[0].getValue({ name: "tranid" });
					}
				}
				trace = 'Actividad 18';

				if (ordenFactura) {
					notaF = {
						"_": ordenFactura,
						"languageID": "F"
					}
				}
				trace = 'Actividad 19';
				var jsonBody; // Monnetjson;
				jsonBody = {
					"_D": "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
					"_A": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
					"_B": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
					"_E": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
					"CreditNote": [
						{
							"UBLVersionID": [
								{
									"_": "2.1"
								}
							],
							"CustomizationID": [
								{
									"_": "2.0"
								}
							],
							"ID": [
								{
									"_": document.numeracion
								}
							],
							"IssueDate": [
								{
									"_": fechaEmision
								}
							],
							"IssueTime": [
								{
									"_": "00:00:00"
								}
							],
							"Note": [
								{
									"_": numberToWords,
									"languageLocaleID": "1000"
								},
								{
									"_": "OBSERVACIONES GENERALES"
								}
							],
							"DocumentCurrencyCode": [
								{
									"_": document.currency,
									"listID": "ISO 4217 Alpha",
									"listName": "Currency",
									"listAgencyName": "United Nations Economic Commission for Europe"
								}
							],
							"DiscrepancyResponse": [
								{
									"ResponseCode": [
										{
											"_": document.codigoMotivo,
											"listAgencyName": "PE:SUNAT",
											"listName": "Tipo de nota de credito",
											"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo09"
										}
									],
									"Description": [
										{
											"_": document.reasonName
										}
									]
								}
							],
							"BillingReference": [
								{
									"InvoiceDocumentReference": [
										{
											"ID": [
												{
													"_": document.numeroDocRelacionado
												}
											],
											"IssueDate": [
												{
													"_": fechaVencDateAdi
												}
											],
											"DocumentTypeCode": [
												{
													"_": document.tipoDocRelacionado,
													"listName": "Tipo de Documento",
													"listSchemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01",
													"listAgencyName": "PE:SUNAT"
												}
											]
										}
									]
								}
							],
							"Signature": [
								{
									"ID": [
										{
											"_": "IDSignature"
										}
									],
									"SignatoryParty": [
										{
											"PartyIdentification": [
												{
													"ID": [
														{
															"_": document.subsidiary.taxidnum
														}
													]
												}
											],
											"PartyName": [
												{
													"Name": [
														{
															"_": document.subsidiary.legalname
														}
													]
												}
											]
										}
									],
									"DigitalSignatureAttachment": [
										{
											"ExternalReference": [
												{
													"URI": [
														{
															"_": "IDSignature"
														}
													]
												}
											]
										}
									]
								}
							],
							"AccountingSupplierParty": [
								{
									"Party": [
										{
											"PartyIdentification": [
												{
													"ID": [
														{
															"_": document.subsidiary.taxidnum,
															"schemeID": document.subsidiary.tipoDocumento,
															"schemeName": "Documento de Identidad",
															"schemeAgencyName": "PE:SUNAT",
															"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06"
														}
													]
												}
											],
											"PartyName": [
												{
													"Name": [
														{
															"_": document.subsidiary.legalname
														}
													]
												}
											],
											"PartyLegalEntity": [
												{
													"RegistrationName": [
														{
															"_": document.subsidiary.legalname
														}
													],
													"RegistrationAddress": [
														{
															"ID": [
																{
																	"_": document.subsidiary.zip,
																	"schemeAgencyName": "PE:INEI",
																	"schemeName": "Ubigeos"
																}
															],
															"AddressTypeCode": [
																{
																	"_": "0000",
																	"listAgencyName": "PE:SUNAT",
																	"listName": "Establecimientos anexos"
																}
															],
															"CityName": [
																{
																	"_": document.subsidiary.city
																}
															],
															"CountrySubentity": [
																{
																	"_": document.subsidiary.state
																}
															],
															"District": [
																{
																	"_": document.subsidiary.address2
																}
															],
															"AddressLine": [
																{
																	"Line": [
																		{
																			"_": document.subsidiary.address1
																		}
																	]
																}
															],
															"Country": [
																{
																	"IdentificationCode": [
																		{
																			"_": document.subsidiary.country,
																			"listID": "ISO 3166-1",
																			"listAgencyName": "United Nations Economic Commission for Europe",
																			"listName": "Country"
																		}
																	]
																}
															]
														}
													]
												}
											]
										}
									]
								}
							],
							"AccountingCustomerParty": [
								{
									"Party": [
										{
											"PartyIdentification": [
												{
													"ID": [
														{
															"_": document.customer.taxNumber,
															"schemeID": document.customer.tipoDocCustmer,
															"schemeName": "Documento de Identidad",
															"schemeAgencyName": "PE:SUNAT",
															"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06"
														}
													]
												}
											],
											"PartyName": [
												{
													"Name": [
														{
															"_": document.customer.altname
														}
													]
												}
											],
											"PartyLegalEntity": [
												{
													"RegistrationName": [
														{
															"_": document.customer.altname
														}
													],
													"RegistrationAddress": [
														{
															"ID": [
																{
																	"_": nvl(document.customer.codeUbigeo, ''),
																	"schemeAgencyName": "PE:INEI",
																	"schemeName": "Ubigeos"
																}
															],
															"CityName": [
																{
																	"_": document.customer.city
																}
															],
															"CountrySubentity": [
																{
																	"_": document.customer.departamento
																}
															],
															"District": [
																{
																	"_": document.customer.distrito
																}
															],
															"AddressLine": [
																{
																	"Line": [
																		{
																			"_": document.customer.address1
																		}
																	]
																}
															],
															"Country": [
																{
																	"IdentificationCode": [
																		{
																			"_": document.customer.country,
																			"listID": "ISO 3166-1",
																			"listAgencyName": "United Nations Economic Commission for Europe",
																			"listName": "Country"
																		}
																	]
																}
															]
														}
													]
												}
											],
											"Contact": [
												{
													"ElectronicMail": [
														{
															"_": "ercrguro@gmail.com"
														}
													]
												}
											]
										}
									]
								}
							],
							"TaxTotal": [
								{
									"TaxAmount": [
										{
											"_": document.freeOperation === true ? "0.00" : linesObj.details.montototalimpuestos.toString(),
											"currencyID": document.currency
										}
									],
									"TaxSubtotal": taxelement
								}
							],
							"LegalMonetaryTotal": [
								{
									"LineExtensionAmount": [
										{
											"_": document.freeOperation === true ? "0.00" : totalVentas,
											"currencyID": document.currency
										}
									],
									"PayableAmount": [
										{
											"_": document.freeOperation === true ? "0.00" : linesObj.details.importetotal.toString(),
											"currencyID": document.currency
										}
									]
								}
							],
							"CreditNoteLine": detalleItems

						}
					]
				};

				//<I> rhuaccha: 2024-08-26
				if (document.formaPagoRef === 'Credito') {
					var noteArray = jsonBody.CreditNote[0].Note;
					var newObject = {
						"_": "001",
						"languageID": "Q"
					};

					var index = -1;
					for (var i = 0; i < noteArray.length; i++) {
						if (noteArray[i]._ === "OBSERVACIONES GENERALES") {
							index = i;
							break;
						}
					}

					if (index !== -1) {
						noteArray.splice(index, 0, newObject);
					} else {
						noteArray.push(newObject);
					}
				}
				//<I> rhuaccha: 2024-09-03: validate empty fields
				jsonBody.CreditNote[0].Note = jsonBody.CreditNote[0].Note.filter(function (note) {
					var tagArr = ['C', 'G', 'P']
					if (tagArr.indexOf(note.languageID) !== -1) {
						return note._ !== "";
					}
					return true;
				});
				jsonBody.CreditNote[0].Note.push({
					"_": parseFloat(subtotalCmAmount).toFixed(2),
					"languageID": "S"
				});
				//<F> rhuaccha: 2024-08-26

				if (notaF) {
					jsonBody.CreditNote[0].Note.push(notaF);
				}

				var finalResponse = createRequest({
					ruc: document.subsidiary.taxidnum,
					tipoDocumento: NOTA_CREDITO,
					numeracion: document.numeracion,
					jsonBody: jsonBody,
					internalId: options.internalId
				});

				response = finalResponse;

			/*} catch (error) {
				log.debug({
					title: 'createCreditMemoRequest Error - ' + trace,
					details: error
				});
				response.status = STATUS_ERROR;
				response.message = 'createCreditMemoRequest: ' + error.message + ' - trace: ' + trace;
			}*/
			return response;
		}

		/**
		 * Method for processing invoices, boleta and debit notes
		 * @param {string|number} internalId
		 * @param {json} document json object of the transaction
		 * @param {string} recordType netsuite record type
		 * @returns {Object}
		 */
		function createInvoiceRequest() {
			var response = {
				status: STATUS_ERROR,
				message: 'Initi process'
			}
			var trace = 'Actividad 1';
			try {
				var paramNames = ['internalId', 'document', 'recordType', 'typeCode'];
				var options = parseArguments(arguments, paramNames);

				var document = options.document; // new line

				var anticipo = document.invRelatesToAnticipo;
				var anticipotaxtotal = 0;
				var anticipototal = 0;
				var anticiposubtotal = 0;
				var anticipoObj;
				if (anticipo) {
					anticipoObj = getAnticipo(anticipo);
					anticipotaxtotal = anticipoObj.anticipo.anticipoSubtotal;
					anticipototal = anticipoObj.anticipo.anticipoTotal;
					anticiposubtotal = parseFloat(anticipototal) - parseFloat(anticipotaxtotal);

					var anticipodoc = anticipoObj.anticipo.anticipoDoc;
					var anticipotype = anticipoObj.anticipo.anticipoType;
					var anticipocurrency = anticipoObj.anticipo.anticipoCurrency;
					var anticipofechaEmision = formatDate(anticipoObj.anticipo.anticipoFechaEmision);
				}

				var fechaEmision = formatDate(document.trandate);

				var horaEmision = document.datecreated;
				horaEmision = horaEmision.split(' ');
				horaEmision = horaEmision[1] + ':00';

				var codTipoDocumento = document.documentTypeCode;

				if (codTipoDocumento === NOTA_DEBITO) {
					var fechaEmisionRef = formatDate(document.fechaReferencia);
				}

				var discountTotal = 0;
				var estgrossprofit = 0;
				var taxTotalInvoice = 0;

				if (options.recordType === 'invoice') {
					if (codTipoDocumento == FACTURA || codTipoDocumento == BOLETA) {
						var discountTotalTmp = document.discountTotal;
						var estgrossprofitTmp = document.estgrossprofit;
						var taxTotalInvoiceTmp = document.taxTotalInvoice;

						if (discountTotalTmp) {
							discountTotal = (-1) * parseFloat(discountTotalTmp);
						}
						if (estgrossprofitTmp) {
							estgrossprofit = parseFloat(estgrossprofitTmp);
						}
						if (taxTotalInvoiceTmp) {
							taxTotalInvoice = parseFloat(taxTotalInvoiceTmp);
						}
					}
				}

				var custDocumenType = document.customer.tipoDocCustmer;
				var customerName = document.customer.companyname;

				if (custDocumenType === '1') {
					customerName = document.customer.firstname + ' ' + document.customer.lastname;
				}

				var dueDate = document.duedate;
				if (dueDate !== '') {
					dueDate = formatDate(dueDate);
				} else {
					dueDate = fechaEmision;
				}

				var conceptDetr = document.conceptDetraction;
				if (conceptDetr.length > 0) {
					conceptDetr = conceptDetr.split(' ')[0];
				}
				var montoDetr = 0;
				var porcentajeDetr = document.porcentajeDetr;
				porcentajeDetr = porcentajeDetr.replace(/%/g, '');

				var linesObj = processInvoiceLine(document.lines, document.freeOperation, document.isDonation, document.total, document.taxtotal);
				log.debug('linesObj', linesObj);
				trace = 'Actividad 2';
				if (linesObj.status === STATUS_ERROR) {
					response.status = STATUS_ERROR;
					response.message = 'No se puede procesar la informacion de la factura: ' + linesObj.message;
					return response;
				}

				var gravadasObj = linesObj.details.gravadas;
				montoDetr = linesObj.details.montoDetracion;
				var montoLetras = linesObj.details.importetotal;

				var taxelement = [];
				var totalVentas = 0;
				var TaxAmount = 0;
				var TaxScheme = 0;
				var apliccaanticipo = 0
				var taxcheme;
				var TaxTypeCode = 'VAT';
				trace = 'Actividad 3';
				if (gravadasObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(gravadasObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestosgra[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestosgra[0].idImpuesto;
					taxcheme = 'IGV';
					if (document.freeOperation == true || document.isDonation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(gravadasObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal);
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 4';
				var exoneradasObj = linesObj.details.exoneradas;
				if (exoneradasObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(exoneradasObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestosexo[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestosexo[0].idImpuesto;
					taxcheme = 'EXO';
					if (document.freeOperation == true || document.isDonation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(exoneradasObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal);
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 4.1';
				var gratuitaObj = linesObj.details.gratuita;
				if (gratuitaObj != 'Vacio') {
					TaxAmount = linesObj.details.totalimpuestoigratuita[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestoigratuita[0].idImpuesto;
					TaxTypeCode = 'FRE'
					taxcheme = 'GRA';
					var taxableAmount = TaxableAmount(gratuitaObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal);
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 4.2';
				var inafectasObj = linesObj.details.inafectas;

				if (inafectasObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(inafectasObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestosina[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestosina[0].idImpuesto;
					taxcheme = 'INA';
					TaxTypeCode = 'FRE';
					if (document.freeOperation == true || document.isDonation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(inafectasObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal);
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}

				trace = 'Actividad 4.3';
				var exportacionObj = linesObj.details.exportacion;
				if (exportacionObj != 'Vacio') {
					totalVentas = totalVentas + parseFloat(exportacionObj.totalVentas);
					TaxAmount = linesObj.details.totalimpuestoiExport[0].montoImpuesto;
					TaxScheme = linesObj.details.totalimpuestoiExport[0].idImpuesto;
					taxcheme = 'EXP';
					TaxTypeCode = 'FRE';
					if (document.freeOperation == true || document.isDonation == true) {
						taxcheme = 'GRA';
						TaxTypeCode = 'FRE'
					}
					var taxableAmount = TaxableAmount(exportacionObj.totalVentas, document.currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal);
					taxelement.push(taxableAmount);
					apliccaanticipo = 1;
				}
				trace = 'Actividad 4.4';

				var detalleItems = [];
				var totalImpuestos = 0;
				var valordeventaunitario = 0;
				var subtotalAmount = 0;
				var sumaDescuentosParciales = 0;
				trace = 'Actividad 5';
				log.debug('trace', trace);
				for (var i = 0; i < linesObj.details.det.length; i++) {
					var item = linesObj.details.det[i];
					subtotalAmount += item.amount;
					totalImpuestos = totalImpuestos + parseFloat(item.totalImpuestos[0].montoImpuesto);
					valordeventaunitario = parseFloat(item.valorVenta) / parseFloat(item.cantidadItems)
					var importeBruto = parseFloat(item.importeBruto);
					var descuento = 0;
					trace = 'Actividad 6 - ' + i;
					if (item.cargoDescuento) {
						descuento = parseFloat(item.cargoDescuento[0].importeBruto);
					}
					var campo_AT = importeBruto + descuento;
					campo_AT = campo_AT.toFixed(2);
					trace = 'Actividad 7 - ' + i;
					detalleItems.push({
						"ID": [
							{
								"_": item.numeroItem
							}
						],
						"Note": [
							{
								"_": item.unidad
							}
						],
						"InvoicedQuantity": [
							{
								"_": item.cantidadItems,
								"unitCode": item.unidad,
								"unitCodeListID": "UN/ECE rec 20",
								"unitCodeListAgencyName": "United Nations Economic Commission for Europe"
							}
						],
						"LineExtensionAmount": [
							{
								"_": item.valorVenta,
								"currencyID": document.currency
							}
						]
					});
					trace = 'Actividad 8 - ' + i;

					trace = 'Actividad 14 - ' + i;
					var PricingReference = [];
					PricingReference.push({
						"AlternativeConditionPrice": [
							{
								"PriceAmount": [
									{
										"_": document.freeOperation == true ? valordeventaunitario.toFixed(2).toString() : item.precioVentaUnitario,
										"currencyID": document.currency
									}
								],
								"PriceTypeCode": [
									{
										"_": item.tipoprecio,
										"listName": "Tipo de Precio",
										"listAgencyName": "PE:SUNAT",
										"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16"
									}
								]
							}
						]
					})
					detalleItems[i].PricingReference = PricingReference;
					trace = 'Actividad 15 - ' + i;
					if (item.cargoDescuento) {
						detalleItems[i].AllowanceCharge = [{
							"ChargeIndicator": [
								{
									"_": item.cargoDescuento[0].indicadorCargoDescuento,
								}
							],
							"AllowanceChargeReasonCode": [
								{
									"_": item.cargoDescuento[0].codigoCargoDescuento,
									"listAgencyName": "PE:SUNAT",
									"listName": "Cargo/descuento",
									"listschemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo53"
								}
							],
							"Amount": [
								{
									"_": item.cargoDescuento[0].montoCargoDescuento,
									"currencyID": document.currency
								}
							],
							"BaseAmount": [
								{
									"_": item.cargoDescuento[0].montoBaseCargoDescuento,
									"currencyID": document.currency
								}
							]
						}];

						sumaDescuentosParciales += parseFloat("0" + item.cargoDescuento[0].montoCargoDescuento)
					}
					trace = 'Actividad 16 - ' + i;
					if (item.taxcheme === "GRA") {
						if (codTipoDocumento === FACTURA || codTipoDocumento === BOLETA) {
							if (document.freeOperation === false) {
								detalleItems[i].TaxTotal = [
									{
										"TaxAmount": [
											{
												"_": "0.00",
												"currencyID": document.currency
											}
										],
										"TaxSubtotal": [
											{
												"TaxableAmount": [
													{
														"_": item.totalImpuestos[0].montoBase,
														"currencyID": document.currency
													}
												],
												"TaxAmount": [
													{
														"_": "0.00",
														"currencyID": document.currency
													}
												],
												"TaxCategory": [
													{
														"Percent": [
															{
																"_": item.totalImpuestos[0].porcentaje
															}
														],
														"TaxExemptionReasonCode": [
															{
																"_": item.totalImpuestos[0].tipoAfectacion,
																"listAgencyName": "PE:SUNAT",
																"listName": "Afectacion del IGV",
																"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
															}
														],
														"TaxScheme": [
															{
																"ID": [
																	{
																		"_": item.totalImpuestos[0].idImpuesto,
																		"schemeName": "Codigo de tributos",
																		"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
																		"schemeAgencyName": "PE:SUNAT"
																	}
																],
																"Name": [
																	{
																		"_": item.taxcheme
																	}
																],
																"TaxTypeCode": [
																	{
																		"_": item.TaxTypeCode
																	}
																]
															}
														]
													}
												]
											}
										]
									}
								]
							} else {
								detalleItems[i].TaxTotal = [
									{
										"TaxAmount": [
											{
												"_": document.freeOperation == true ? "0.00" : item.totalImpuestos[0].montoImpuesto,
												"currencyID": document.currency
											}
										],
										"TaxSubtotal": [
											{
												"TaxableAmount": [
													{
														"_": item.totalImpuestos[0].montoBase,
														"currencyID": document.currency
													}
												],
												"TaxAmount": [
													{
														"_": item.totalImpuestos[0].montoImpuesto,
														"currencyID": document.currency
													}
												],
												"TaxCategory": [
													{
														"Percent": [
															{
																"_": item.totalImpuestos[0].porcentaje
															}
														],
														"TaxExemptionReasonCode": [
															{
																"_": item.totalImpuestos[0].tipoAfectacion,
																"listAgencyName": "PE:SUNAT",
																"listName": "Afectacion del IGV",
																"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
															}
														],
														"TaxScheme": [
															{
																"ID": [
																	{
																		"_": item.totalImpuestos[0].idImpuesto,
																		"schemeName": "Codigo de tributos",
																		"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
																		"schemeAgencyName": "PE:SUNAT"
																	}
																],
																"Name": [
																	{
																		"_": item.taxcheme
																	}
																],
																"TaxTypeCode": [
																	{
																		"_": item.TaxTypeCode
																	}
																]
															}
														]
													}
												]
											}
										]
									}
								]
							}
						} else {
							detalleItems[i].TaxTotal = [
								{
									"TaxAmount": [
										{
											"_": document.freeOperation == true ? "0.00" : item.totalImpuestos[0].montoImpuesto,
											"currencyID": document.currency
										}
									],
									"TaxSubtotal": [
										{
											"TaxableAmount": [
												{
													"_": item.totalImpuestos[0].montoBase,
													"currencyID": document.currency
												}
											],
											"TaxAmount": [
												{
													"_": item.totalImpuestos[0].montoImpuesto,
													"currencyID": document.currency
												}
											],
											"TaxCategory": [
												{
													"Percent": [
														{
															"_": item.totalImpuestos[0].porcentaje
														}
													],
													"TaxExemptionReasonCode": [
														{
															"_": item.totalImpuestos[0].tipoAfectacion,
															"listAgencyName": "PE:SUNAT",
															"listName": "Afectacion del IGV",
															"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
														}
													],
													"TaxScheme": [
														{
															"ID": [
																{
																	"_": item.totalImpuestos[0].idImpuesto,
																	"schemeName": "Codigo de tributos",
																	"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
																	"schemeAgencyName": "PE:SUNAT"
																}
															],
															"Name": [
																{
																	"_": item.taxcheme
																}
															],
															"TaxTypeCode": [
																{
																	"_": item.TaxTypeCode
																}
															]
														}
													]
												}
											]
										}
									]
								}
							]
						}
					} else {
						trace = 'Actividad 17 - ' + i;
						detalleItems[i].TaxTotal = [
							{
								"TaxAmount": [
									{
										"_": document.freeOperation == true ? "0.00" : item.totalImpuestos[0].montoImpuesto,
										"currencyID": document.currency
									}
								],
								"TaxSubtotal": [
									{
										"TaxableAmount": [
											{
												"_": item.totalImpuestos[0].montoBase,
												"currencyID": document.currency
											}
										],
										"TaxAmount": [
											{
												"_": item.totalImpuestos[0].montoImpuesto,
												"currencyID": document.currency
											}
										],
										"TaxCategory": [
											{
												"Percent": [
													{
														"_": item.totalImpuestos[0].porcentaje
													}
												],
												"TaxExemptionReasonCode": [
													{
														"_": item.totalImpuestos[0].tipoAfectacion,
														"listAgencyName": "PE:SUNAT",
														"listName": "Afectacion del IGV",
														"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
													}
												],
												"TaxScheme": [
													{
														"ID": [
															{
																"_": item.totalImpuestos[0].idImpuesto,
																"schemeName": "Codigo de tributos",
																"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
																"schemeAgencyName": "PE:SUNAT"
															}
														],
														"Name": [
															{
																"_": item.taxcheme
															}
														],
														"TaxTypeCode": [
															{
																"_": item.TaxTypeCode
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
					trace = 'Actividad 18 - ' + i;
					detalleItems[i].Item = [
						{
							"Description": [
								{
									"_": getItemDescription(item.descripcionProducto, item.taxCodeDisplay, item.cuponCode)
								}
							],
							"SellersItemIdentification": [
								{
									"ID": [
										{
											"_": item.codigoProducto
										}
									]
								}
							]
						}
					]
					trace = 'Actividad 19 - ' + i;
					detalleItems[i].Price = [
						{
							"PriceAmount": [
								{
									"_": (document.freeOperation || document.isDonation) ? "0.00" : item.valorUnitario,
									"currencyID": document.currency
								}
							]
						}
					]

				}
				var totalVentaAplly = parseFloat(totalVentas) + parseFloat(totalImpuestos);
				if (linesObj.details.applywh == true) {
					montoLetras = totalVentaAplly;
				}
				if (linesObj.details.applyrent == true) {
					montoLetras = totalVentaAplly;
				}

				var converter = new NumberToWordsConverter();
				var numberToWords = String(converter.convertNumberToWords(montoLetras, document.currency)).toUpperCase();
				trace = 'Actividad 20';
				var primeraParte = {};
				if (sumaDescuentosParciales > 0 || discountTotal > 0) {
					var totalDescuento = sumaDescuentosParciales + discountTotal;
					primeraParte = generateHeader(document.numeracion, fechaEmision, totalDescuento);
				} else {
					primeraParte = generateHeader(document.numeracion, fechaEmision, null);
				}
				var dueDateObj = generateDueDate(dueDate);
				var InvoiceTypeCode = generateInvoiceTypeCode(codTipoDocumento, document.codeFact);
				trace = 'Actividad 21';
				var note = {
					"Note": [
						{
							"_": numberToWords,
							"languageLocaleID": "1000"
						}
					],

					"DocumentCurrencyCode": [
						{
							"_": document.currency,
							"listID": "ISO 4217 Alpha",
							"listName": "Currency",
							"listAgencyName": "United Nations Economic Commission for Europe"
						}
					]
				}
				trace = 'Actividad 22';
			
					note.Note.push(
						{
							"_": document.memo + " // " + (linesObj.details.applyrent == true ? ((parseFloat(totalVentaAplly) * 0.03) * document.exchangerate).toFixed(2) + ' PEN' : '') +
								" Cuenta Bancaria a nombre de IDICO PERU S.A. " +
								"Scotiabank S/: " + document.subsidiary.scotiabankpencc + " // " +
								document.subsidiary.scotiabankpencci +
								" Scotiabank USD: " + document.subsidiary.scotiabankusdcc + " // " +
								document.subsidiary.scotiabankusdcci
						}
					)
				




				if (document.freeOperation === true || document.isDonation === true) {
					note.Note.push(
						{
							"_": "TRANSFERENCIA GRATUITA DE UN BIEN Y/O SERVICIO PRESTADO GRATUITAMENTE",
							"languageLocaleID": "1002"
						}

					)
				}
				log.debug('Detracción', linesObj.details.applywh);
				if (linesObj.details.applywh == true) {
					log.debug('Detracción - 2', linesObj.details.applywh);
					note.Note.push(
						{
							"_": "Operación sujeta a detracción",
							"languageLocaleID": "2006"
						}
					)
				}



				// note.Note.push({
				// 	"_": "Cuenta Bancaria a nombre de IDICO PERU S.A. " + 
				// 	"Scotiabank S/: ",
				// 	"languageID": "Observaciones"
				// });
				// Fin notas
				trace = 'Actividad 27';
				var discrep = {
					"DiscrepancyResponse": [
						{
							"ResponseCode": [
								{
									"_": document.codMotivo,
									"listAgencyName": "PE:SUNAT",
									"listName": "Tipo de nota de debito",
									"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo10"
								}
							],
							"Description": [
								{
									"_": document.reason
								}
							]
						}
					],
					"BillingReference": [
						{
							"InvoiceDocumentReference": [
								{
									"ID": [
										{
											"_": document.serieReferencia + '-' + document.numeroReferencia
										}
									],
									"IssueDate": [
										{
											"_": document.fechaReferencia
										}
									],
									"DocumentTypeCode": [
										{
											"_": document.codeTipooDocRef,
											"listName": "Tipo de Documento",
											"listSchemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01",
											"listAgencyName": "PE:SUNAT"
										}
									]
								}
							]
						}
					]
				};
				trace = 'Actividad 28';
				var asignature = {
					"Signature": [
						{
							"ID": [
								{
									"_": "IDSignature"
								}
							],
							"SignatoryParty": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": document.subsidiary.taxidnum
												}
											]
										}
									],
									"PartyName": [
										{
											"Name": [
												{
													"_": document.subsidiary.legalname
												}
											]
										}
									]
								}
							],
							"DigitalSignatureAttachment": [
								{
									"ExternalReference": [
										{
											"URI": [
												{
													"_": "IDSignature"
												}
											]
										}
									]
								}
							]
						}
					],
					"AccountingSupplierParty": [
						{
							"Party": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": document.subsidiary.taxidnum,
													"schemeID": document.subsidiary.tipoDocumento,
													"schemeName": "Documento de Identidad",
													"schemeAgencyName": "PE:SUNAT",
													"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06"
												}
											]
										}
									],
									"PartyName": [
										{
											"Name": [
												{
													"_": document.subsidiary.legalname
												}
											]
										}
									],
									"PartyLegalEntity": [
										{
											"RegistrationName": [
												{
													"_": document.subsidiary.legalname
												}
											],
											"RegistrationAddress": [
												{
													"ID": [
														{
															"_": document.subsidiary.zip,
															"schemeAgencyName": "PE:INEI",
															"schemeName": "Ubigeos"
														}
													],
													"AddressTypeCode": [
														{
															"_": "0000",
															"listAgencyName": "PE:SUNAT",
															"listName": "Establecimientos anexos"
														}
													],
													"CityName": [
														{
															"_": document.subsidiary.city
														}
													],
													"CountrySubentity": [
														{
															"_": document.subsidiary.state
														}
													],
													"District": [
														{
															"_": document.subsidiary.address2
														}
													],
													"AddressLine": [
														{
															"Line": [
																{
																	"_": document.subsidiary.address1
																}
															]
														}
													],
													"Country": [
														{
															"IdentificationCode": [
																{
																	"_": document.subsidiary.country,
																	"listID": "ISO 3166-1",
																	"listAgencyName": "United Nations Economic Commission for Europe",
																	"listName": "Country"
																}
															]
														}
													]
												}
											]
										}
									]
								}
							]
						}
					],
					"AccountingCustomerParty": [
						{
							"Party": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": document.customer.taxNumber,
													"schemeID": document.customer.tipoDocCustmer,
													"schemeName": "Documento de Identidad",
													"schemeAgencyName": "PE:SUNAT",
													"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06"
												}
											]
										}
									],
									"PartyName": [
										{
											"Name": [
												{
													"_": customerName
												}
											]
										}
									],
									"PartyLegalEntity": [
										{
											"RegistrationName": [
												{
													"_": customerName
												}
											],
											"RegistrationAddress": [
												{
													"ID": [
														{
															"_": document.customer.codeUbigeo,
															"schemeAgencyName": "PE:INEI",
															"schemeName": "Ubigeos"
														}
													],
													"CityName": [
														{
															"_": document.customer.city
														}
													],
													"CountrySubentity": [
														{
															"_": document.customer.departamento
														}
													],
													"District": [
														{
															"_": document.customer.distrito
														}
													],
													"AddressLine": [
														{
															"Line": [
																{
																	"_": document.customer.address1
																}
															]
														}
													],
													"Country": [
														{
															"IdentificationCode": [
																{
																	"_": document.customer.country,
																	"listID": "ISO 3166-1",
																	"listAgencyName": "United Nations Economic Commission for Europe",
																	"listName": "Country"
																}
															]
														}
													]
												}
											]
										}
									],
									"Contact": [
										{
											"ElectronicMail": [
												{
													"_": "correo@efact.pe"
												}
											]
										}
									]
								}
							]
						}
					]
				};
				trace = 'Actividad 29';
				if (codTipoDocumento == FACTURA || codTipoDocumento == BOLETA) {
					//asignature.AllowanceCharge = []
					if (linesObj.details.otherCharge.exist === 'Y' && document.tipoOperacion === "Exportación de Bienes") {
						var peCargo = search.lookupFields({
							type: search.Type.ITEM,
							id: linesObj.details.otherCharge.itemId,
							columns: ['custitem_pe_cargo_descuento_otro']
						});

						var codigo = search.lookupFields({
							type: "customrecord_pe_cargo_desc_otro",
							id: peCargo.custitem_pe_cargo_descuento_otro[0].value,
							columns: ['custrecord_pe_cargo_codigo_sunat']
						});
						asignature.AllowanceCharge = [
							{
								"ChargeIndicator": [
									{
										"_": "true"
									}
								],
								"AllowanceChargeReasonCode": [
									{
										"_": codigo.custrecord_pe_cargo_codigo_sunat,
										"listAgencyName": "PE:SUNAT",
										"listName": "Cargo/descuento",
										"listSchemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo53"
									}
								],
								"Amount": [
									{
										"_": linesObj.details.otherCharge.importeBruto, // discounttotal,
										"currencyID": document.currency
									}
								]
							}
						]
					}
				};
				trace = 'Actividad 30';
				if (codTipoDocumento == FACTURA) {
					asignature.PaymentTerms = [
						{
							"ID": [
								{
									"_": "FormaPago"
								}
							],
							"PaymentMeansID": [
								{
									"_": document.formaPagoDetr
								}
							]
						}
					]

					if (document.formaPagoDetr.toUpperCase() === 'CREDITO') {
						var paymentTermAmount = 0;
						if (linesObj.details.applywh == true) {
							paymentTermAmount = Number(totalVentaAplly);
						} else if (anticipo) {
							paymentTermAmount = (Number(linesObj.details.importetotal) - Number(anticipototal));
						} else {
							paymentTermAmount = (document.freeOperation || document.isDonation) ? 0 : Number(linesObj.details.importetotal);
						}
						asignature.PaymentTerms[0].Amount = [
							{
								"_": (parseFloat(paymentTermAmount) - (parseFloat(totalVentaAplly) * 0.03)).toFixed(2),
								"currencyID": document.currency
							}
						];
						asignature.PaymentTerms.push({
							"ID": [
								{
									"_": "FormaPago"
								}
							],
							"PaymentMeansID": [
								{
									"_": "Cuota001"
								}
							],
							"Amount": [
								{
									"_": (parseFloat(paymentTermAmount) - (parseFloat(totalVentaAplly) * 0.03)).toFixed(2),
									"currencyID": document.currency
								}
							],
							"PaymentDueDate": [
								{
									"_": dueDate // dueDate
								}
							]
						});
					}
				}
				trace = 'Actividad 31';
				if (anticipo) {
					asignature.PrepaidPayment = [
						{
							"ID": [
								{
									"_": "01",
									"SchemeName": "Anticipo",
									"schemeAgencyName": "PE:SUNAT"
								}
							],
							"PaidAmount": [
								{
									"_": anticipototal,
									"currencyID": anticipocurrency
								}
							],
							"PaidDate": [
								{
									"_": anticipofechaEmision
								}
							]
						}
					]
					asignature.PaymentTerms = [
						{
							"ID": [
								{
									"_": "FormaPago"
								}
							],
							"PaymentMeansID": [
								{
									"_": document.formaPagoDetr
								}
							]
						}
					]
					asignature.AllowanceCharge = [
						{
							"ChargeIndicator": [
								{
									"_": "false"
								}
							],
							"AllowanceChargeReasonCode": [
								{
									"_": "04",
									"listAgencyName": "PE:SUNAT",
									"listName": "Cargo/descuento",
									"listSchemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo53"
								}
							],
							"Amount": [
								{
									"_": anticiposubtotal.toFixed(2),
									"currencyID": anticipocurrency
								}
							]
						}
					]
				}
				if (linesObj.details.applyrent == true) {
					asignature.AllowanceCharge = [
						{
							"ChargeIndicator": [
								{
									"_": "false"
								}
							],
							"AllowanceChargeReasonCode": [
								{
									"_": "62",
									"listAgencyName": "PE:SUNAT",
									"listName": "Cargo/descuento",
									"listSchemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo53"
								}
							],
							"MultiplierFactorNumeric": [
								{
									"_": "0.03"
								}
							],
							"Amount": [
								{
									"_": (parseFloat(totalVentaAplly) * 0.03).toFixed(2),
									"currencyID": document.currency
								}
							],
							"BaseAmount": [
								{
									"_": totalVentaAplly.toFixed(2),
									"currencyID": document.currency
								}
							],
							"PerUnitAmount": [
								{
									"_": (parseFloat(totalVentaAplly) - (parseFloat(totalVentaAplly) * 0.03)).toFixed(2),
									"currencyID": document.currency
								}
							]

						}
					]
				}
				trace = 'Actividad 32';
				asignature.TaxTotal = [
					{
						"TaxAmount": [
							{
								"_": (document.freeOperation || document.isDonation) ? '0.00' : (parseFloat(linesObj.details.montototalimpuestos) - parseFloat(anticipotaxtotal)).toFixed(2), //<I> rhuaccha: 2024-08-12
								"currencyID": document.currency
							}
						],
						"TaxSubtotal": taxelement
					}
				];
				var PaymentMeans = {
					"Signature": [
						{
							"ID": [
								{
									"_": "IDSignature"
								}
							],
							"SignatoryParty": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": document.subsidiary.taxidnum
												}
											]
										}
									],
									"PartyName": [
										{
											"Name": [
												{
													"_": document.subsidiary.legalname
												}
											]
										}
									]
								}
							],
							"DigitalSignatureAttachment": [
								{
									"ExternalReference": [
										{
											"URI": [
												{
													"_": "IDSignature"
												}
											]
										}
									]
								}
							]
						}
					],
					"AccountingSupplierParty": [
						{
							"Party": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": document.subsidiary.taxidnum,
													"schemeID": document.subsidiary.tipoDocumento, // column07
													"schemeName": "Documento de Identidad",
													"schemeAgencyName": "PE:SUNAT",
													"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06"
												}
											]
										}
									],
									"PartyName": [
										{
											"Name": [
												{
													"_": document.subsidiary.legalname
												}
											]
										}
									],
									"PartyLegalEntity": [
										{
											"RegistrationName": [
												{
													"_": document.subsidiary.legalname
												}
											],
											"RegistrationAddress": [
												{
													"ID": [
														{
															"_": document.subsidiary.zip,
															"schemeAgencyName": "PE:INEI",
															"schemeName": "Ubigeos"
														}
													],
													"AddressTypeCode": [
														{
															"_": "0000",
															"listAgencyName": "PE:SUNAT",
															"listName": "Establecimientos anexos"
														}
													],
													"CityName": [
														{
															"_": document.subsidiary.city,
														}
													],
													"CountrySubentity": [
														{
															"_": document.subsidiary.state,
														}
													],
													"District": [
														{
															"_": document.subsidiary.address2
														}
													],
													"AddressLine": [
														{
															"Line": [
																{
																	"_": document.subsidiary.address1
																}
															]
														}
													],
													"Country": [
														{
															"IdentificationCode": [
																{
																	"_": document.subsidiary.country,
																	"listID": "ISO 3166-1",
																	"listAgencyName": "United Nations Economic Commission for Europe",
																	"listName": "Country"
																}
															]
														}
													]
												}
											]
										}
									]
								}
							]
						}
					],
					"AccountingCustomerParty": [
						{
							"Party": [
								{
									"PartyIdentification": [
										{
											"ID": [
												{
													"_": document.customer.taxNumber,
													"schemeID": document.customer.tipoDocCustmer,
													"schemeName": "Documento de Identidad",
													"schemeAgencyName": "PE:SUNAT",
													"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06"
												}
											]
										}
									],
									"PartyName": [
										{
											"Name": [
												{
													"_": customerName
												}
											]
										}
									],
									"PartyLegalEntity": [
										{
											"RegistrationName": [
												{
													"_": customerName
												}
											],
											"RegistrationAddress": [
												{
													"ID": [
														{
															"_": document.customer.codeUbigeo,
															"schemeAgencyName": "PE:INEI",
															"schemeName": "Ubigeos"
														}
													],
													"CityName": [
														{
															"_": document.customer.city
														}
													],
													"CountrySubentity": [
														{
															"_": document.customer.state
														}
													],
													"District": [
														{
															"_": document.customer.address2
														}
													],
													"AddressLine": [
														{
															"Line": [
																{
																	"_": document.customer.address1
																}
															]
														}
													],
													"Country": [
														{
															"IdentificationCode": [
																{
																	"_": document.customer.country,
																	"listID": "ISO 3166-1",
																	"listAgencyName": "United Nations Economic Commission for Europe",
																	"listName": "Country"
																}
															]
														}
													]
												}
											]
										}
									],
									"Contact": [
										{
											"ElectronicMail": [
												{
													"_": "correo@efact.pe"
												}
											]
										}
									]
								}
							]
						}
					],
					"PaymentMeans": [
						{
							"ID": [
								{
									"_": "Detraccion"
								}
							],
							"PaymentMeansCode": [
								{
									"_": '001',
									"listAgencyName": "PE:SUNAT",
									"listName": "Medio de pago",
									"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo59"
								}
							],
							"PayeeFinancialAccount": [
								{
									"ID": [
										{
											"_": document.subsidiary.ctadetraccion
										}
									]
								}
							]
						}
					],
					"PaymentTerms": [
						{
							"ID": [
								{
									"_": "Detraccion"
								}
							],
							"PaymentMeansID": [
								{
									"_": document.codeConceptDetraction,
									"schemeName": "Codigo de detraccion",
									"schemeAgencyName": "PE:SUNAT",
									"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo54"
								}
							],
							"Note": [
								{
									"_": document.debitfxamount
								}
							],
							"PaymentPercent": [
								{
									"_": document.porcentajeDetr.replace(/%/g, '')
								}
							],
							"Amount": [
								{
									"_": ((parseFloat(totalVentaAplly) *(parseFloat(document.porcentajeDetr.replace(/%/g, ''))/100) ) * document.exchangerate).toFixed(2).toString(),
									"currencyID": "PEN"
								}
							]
						}
					],
					"TaxTotal": [
						{
							"TaxAmount": [
								{
									"_": (document.freeOperation || document.isDonation) ? '0.00' : linesObj.details.montototalimpuestos.toString(),
									"currencyID": document.currency
								}
							],
							"TaxSubtotal": [
								{
									"TaxableAmount": [
										{
											"_": totalVentas,
											"currencyID": document.currency
										}
									],
									"TaxAmount": [
										{
											//"_": totalImpuertos.toString(),
											"_": linesObj.details.montototalimpuestos.toString(),
											"currencyID": document.currency
										}
									],
									"TaxCategory": [
										{
											"TaxScheme": [
												{
													"ID": [
														{
															"_": TaxScheme,
															"schemeName": "Codigo de tributos",
															"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
															"schemeAgencyName": "PE:SUNAT"
														}
													],
													"Name": [
														{
															"_": taxcheme
														}
													],
													"TaxTypeCode": [
														{
															"_": TaxTypeCode
														}
													]
												}
											]
										}
									]
								}
							]
						}
					]
				}

				trace = 'Actividad 34';
				var DocumentCurrencyCode = {
					"DocumentCurrencyCode": [
						{
							"_": document.currency,
							"listID": "ISO 4217 Alpha",
							"listName": "Currency",
							"listAgencyName": "United Nations Economic Commission for Europe"
						}
					],
					"LineCountNumeric": [
						{
							"_": linesObj.details.det.length
						}
					],
					"OrderReference": [
						{
							"ID": [
								{
									"_": document.otherrefnum
								}
							]
						}
					],
				}

				var jsonBody; // monnetJson
				trace = 'Actividad 35';
				if (codTipoDocumento === FACTURA || codTipoDocumento === BOLETA) {
					primeraParte = fusionarObjetos(primeraParte, dueDateObj);
					primeraParte = fusionarObjetos(primeraParte, InvoiceTypeCode);
					primeraParte = fusionarObjetos(primeraParte, note);
					primeraParte = fusionarObjetos(primeraParte, DocumentCurrencyCode);
					trace = 'Actividad 36';
					if (options.recordType === 'invoice' && document.nro_guia) {
						/*var invoiceRecord = record.load({
							type: record.Type.SALES_ORDER,
							id: document.createdfrom
						});
						var linecount = invoiceRecord.getLineCount({ sublistId: 'links' });

						for (var i = 0; i < linecount; i++) {
							var translatedValue = invoiceRecord.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });

							if (translatedValue == "Item Fulfillment" || translatedValue == "Ejecución de orden de artículo") {
								var itemsfullRecord = record.load({
									type: record.Type.ITEM_FULFILLMENT,
									id: invoiceRecord.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i })
								});*/

								var DespatchDocumentReference = {
									"DespatchDocumentReference": [
										{
											"ID": [
												{
													"_": document.nro_guia
												}
											],
											"DocumentTypeCode": [
												{
													"_": "09",
													"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01",
													"listAgencyName": "PE:SUNAT",
													"listName": "Tipo de Documento"
												}
											]
										}],
								}
								primeraParte = fusionarObjetos(primeraParte, DespatchDocumentReference);

							//}
						//}
					}
					trace = 'Actividad 37';
					if (anticipo) {
						var AdditionalDocumentReference = {
							"AdditionalDocumentReference": [
								{
									"ID": [
										{
											"_": document.invRelatesToAnticipo,
										}
									],
									"DocumentTypeCode": [
										{
											"_": "02",
											"listName": "Documento Relacionado",
											"listAgencyName": "PE:SUNAT",
											"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo12"
										}
									],
									"DocumentStatusCode": [
										{
											"_": "01",
											"listName": "Anticipo",
											"listAgencyName": "PE:SUNAT"
										}
									],
									"IssuerParty": [
										{
											"PartyIdentification": [
												{
													"ID": [
														{
															"_": anticipodoc,
															"schemeID": anticipotype,
															"SchemeName": "Documento de Identidad",
															"schemeAgencyName": "PE:SUNAT",
															"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06"
														}
													]
												}
											]
										}
									]
								}
							],
						}
						primeraParte = fusionarObjetos(primeraParte, AdditionalDocumentReference);

					}
					trace = 'Actividad 38';
					if (linesObj.details.applywh == true) {
						primeraParte = fusionarObjetos(primeraParte, PaymentMeans);

						var ultimaParte = {
							"LegalMonetaryTotal": [
								{
									"LineExtensionAmount": [
										{
											"_": (document.freeOperation || document.isDonation) ? '0.00' : totalVentas,
											"currencyID": document.currency
										}
									],
									"TaxInclusiveAmount": [
										{
											"_": totalVentaAplly.toFixed(2),
											"currencyID": document.currency
										}
									],
									"PayableAmount": [
										{
											"_": totalVentaAplly.toFixed(2),
											"currencyID": document.currency
										}
									]
								}
							],
							"InvoiceLine": detalleItems
						}
						primeraParte = fusionarObjetos(primeraParte, ultimaParte);
					}else if (linesObj.details.applyrent == true) {
						primeraParte = fusionarObjetos(primeraParte, asignature);
						var ultimaParte = {
							"LegalMonetaryTotal": [
								{
									"LineExtensionAmount": [
										{
											"_": (document.freeOperation || document.isDonation) ? '0.00' : (parseFloat(totalVentas)).toFixed(2),
											"currencyID": document.currency
										}
									],
									"TaxInclusiveAmount": [
										{
											"_": totalVentaAplly.toFixed(2),
											"currencyID": document.currency
										}
									],
									"PayableAmount": [
										{
											"_": totalVentaAplly.toFixed(2),
											"currencyID": document.currency
										}
									]
								}
							],
							"InvoiceLine": detalleItems
						}
						primeraParte = fusionarObjetos(primeraParte, ultimaParte);
					} else {
						trace = 'Actividad 39';
						primeraParte = fusionarObjetos(primeraParte, asignature);
						if (anticipo) {
							var ultimaParte = {
								"LegalMonetaryTotal": [
									{
										"LineExtensionAmount": [
											{
												// "_": column43 == true ? '0.00' : totalVentas,
												"_": (discountTotal > 0) ? estgrossprofit : ((column43 || isDonation) ? '0.00' : totalVentas).toFixed(2),//IMorales 20231012
												"currencyID": document.currency
											}
										],
										"TaxInclusiveAmount": [
											{
												"_": (document.freeOperation || document.isDonation) ? '0.00' : linesObj.details.importetotal.toString(),
												"currencyID": document.currency
											}
										],
										"PrepaidAmount": [
											{
												"_": anticipototal,
												"currencyID": document.currency
											}
										],
										"PayableAmount": [
											{
												"_": (parseFloat(linesObj.details.importetotal) - parseFloat(anticipototal)).toFixed(2),
												"currencyID": document.currency
											}
										]
									}
								],
								"InvoiceLine": detalleItems
							}
						} else { // mod
							if (linesObj.details.otherCharge.exist === 'Y' && document.tipoOperacion === "Exportación de Bienes") {
								var ultimaParte = {
									"LegalMonetaryTotal": [
										{
											"LineExtensionAmount": [
												{
													// "_": column43 == true ? '0.00' : totalVentas,
													"_": (discountTotal > 0) ? estgrossprofit : ((document.freeOperation || document.isDonation) ? '0.00' : totalVentas),
													"currencyID": document.currency
												}
											],
											"TaxInclusiveAmount": [
												{
													"_": (document.freeOperation || document.isDonation) ? '0.00' : parseFloat(Number(linesObj.details.importetotal) - Number(linesObj.details.otherCharge.importeBruto)).toFixed(2),
													"currencyID": document.currency
												}
											],
											"ChargeTotalAmount": [
												{
													"_": linesObj.details.otherCharge.importeBruto,
													"currencyID": document.currency
												}
											],
											"PayableAmount": [
												{
													"_": (document.freeOperation || document.isDonation) ? '0.00' : linesObj.details.importetotal.toString(),
													// "_": (column43 || isDonation) ? '0.00' : parseFloat(Number(detail.importetotal) + Number(detail.otherCharge.importeBruto)).toFixed(2),
													"currencyID": document.currency
												}
											]
										}
									],
									"InvoiceLine": detalleItems
								}
							} else {
								log.debug('estgrossprofit', estgrossprofit);
								log.debug('totalVentas', totalVentas);
								var ultimaParte = {
									"LegalMonetaryTotal": [
										{
											"LineExtensionAmount": [
												{
													// "_": column43 == true ? '0.00' : totalVentas,
													"_": (discountTotal > 0) ? estgrossprofit : ((document.freeOperation || document.isDonation) ? '0.00' : totalVentas.toFixed(2)),//IMorales 20231012
													"currencyID": document.currency
												}
											],
											"TaxInclusiveAmount": [
												{
													"_": (document.freeOperation || document.isDonation) ? '0.00' : linesObj.details.importetotal.toString(),
													"currencyID": document.currency
												}
											],
											"PayableAmount": [
												{
													"_": (document.freeOperation || document.isDonation) ? '0.00' : linesObj.details.importetotal.toString(),
													"currencyID": document.currency
												}
											]
										}
									],
									"InvoiceLine": detalleItems
								}

							}
						}

						primeraParte = fusionarObjetos(primeraParte, ultimaParte);
					}
					trace = 'Actividad 40';
					jsonBody = {
						"_D": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
						"_A": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
						"_B": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
						"_E": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
						"Invoice": [primeraParte]
					}
				} else if (codTipoDocumento == NOTA_DEBITO) {
					var detallenotaDEbito = new Array();
					trace = 'Actividad 41';
					for (var i = 0; i < linesObj.details.det.length; i++) {
						var item = linesObj.details.det[i]; // add
						totalImpuestos = totalImpuestos + parseFloat(linesObj.details.det[i].totalImpuestos[0].montoImpuesto);
						detallenotaDEbito.push({
							"ID": [
								{
									"_": item.numeroItem
								}
							],
							"Note": [
								{
									"_": item.unidad
								}
							],
							"DebitedQuantity": [
								{
									"_": item.cantidadItems,
									"unitCode": item.unidad,
									"unitCodeListID": "UN/ECE rec 20",
									"unitCodeListAgencyName": "United Nations Economic Commission for Europe"
								}
							],
							"LineExtensionAmount": [
								{
									"_": item.valorVenta,
									"currencyID": document.currency
								}
							],
							"BillingReference": [
								{
									"BillingReferenceLine": [

									]
								}
							],
							"PricingReference": [
								{
									"AlternativeConditionPrice": [
										{
											"PriceAmount": [
												{
													"_": item.precioVentaUnitario,
													"currencyID": document.currency
												}
											],
											"PriceTypeCode": [
												{
													"_": "01",
													"listName": "Tipo de Precio",
													"listAgencyName": "PE:SUNAT",
													"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16"
												}
											]
										}
									]
								}
							],
							"TaxTotal": [
								{
									"TaxAmount": [
										{
											"_": item.totalImpuestos[0].montoImpuesto,
											"currencyID": document.currency
										}
									],
									"TaxSubtotal": [
										{
											"TaxableAmount": [
												{
													"_": item.totalImpuestos[0].montoBase,
													"currencyID": document.currency
												}
											],
											"TaxAmount": [
												{
													"_": item.totalImpuestos[0].montoImpuesto,
													"currencyID": document.currency
												}
											],
											"TaxCategory": [
												{
													"Percent": [
														{
															"_": item.totalImpuestos[0].porcentaje
														}
													],
													"TaxExemptionReasonCode": [
														{
															"_": item.totalImpuestos[0].tipoAfectacion,
															"listAgencyName": "PE:SUNAT",
															"listName": "Afectacion del IGV",
															"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07"
														}
													],
													"TaxScheme": [
														{
															"ID": [
																{
																	"_": item.totalImpuestos[0].idImpuesto,
																	"schemeName": "Codigo de tributos",
																	"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
																	"schemeAgencyName": "PE:SUNAT"
																}
															],
															"Name": [
																{
																	"_": item.taxcheme
																}
															],
															"TaxTypeCode": [
																{
																	"_": item.TaxTypeCode
																}
															]
														}
													]
												}
											]
										}
									]
								}
							],
							"Item": [
								{
									"Description": [
										{
											"_": item.descripcionProducto
										}
									],
									"SellersItemIdentification": [
										{
											"ID": [
												{
													"_": item.codigoProducto
												}
											]
										}
									]
								}
							],
							"Price": [
								{
									"PriceAmount": [
										{
											"_": item.valorUnitario,
											"currencyID": document.currency
										}
									]
								}
							]
						});

						importeBruto = parseFloat(item.importeBruto);
						descuento = 0;
						if (item.cargoDescuento) {
							descuento = parseFloat(item.cargoDescuento[0].importeBruto);
						}
						campo_AT = importeBruto + descuento;
						campo_AT = campo_AT.toFixed(2);
						detallenotaDEbito[i].BillingReference[0].BillingReferenceLine.push({
							ID: [
								{
									"_": campo_AT,
									"schemeID": "AT"
								}
							]
						});
						//<I> rhuaccha: 2024-09-20
						detallenotaDEbito[i].BillingReference[0].BillingReferenceLine.push({
							ID: [
								{
									"_": item.unitDisplay,
									"schemeID": "AU"
								}
							]
						});
						detallenotaDEbito[i].BillingReference[0].BillingReferenceLine.push(
							{
								ID: [
									{
										"_": parseFloat(item.tarifa).toFixed(2),
										"schemeID": "AV"
									}
								]
							}
						);
					}
					trace = 'Actividad 42';
					primeraParte = fusionarObjetos(primeraParte, note);
					primeraParte = fusionarObjetos(primeraParte, discrep);
					primeraParte = fusionarObjetos(primeraParte, asignature);
					var RequestedMonetaryTotal = {
						"RequestedMonetaryTotal": [
							{
								"LineExtensionAmount": [
									{
										"_": totalVentas,
										"currencyID": document.currency
									}
								],
								"PayableAmount": [
									{
										"_": linesObj.details.importetotal.toString(),
										"currencyID": document.currency
									}
								]
							}
						],
						"DebitNoteLine": detallenotaDEbito
					}
					trace = 'Actividad 43';
					primeraParte = fusionarObjetos(primeraParte, RequestedMonetaryTotal);
					jsonBody = {
						"_D": "urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2",
						"_A": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
						"_B": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
						"_E": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
						"DebitNote": [primeraParte]
					}
				}
				trace = 'Actividad 44';
				if (codTipoDocumento === FACTURA || codTipoDocumento === BOLETA) {
					if (document.freeOperation === true || document.isDonation === true) {
						jsonBody.Invoice[0].TaxTotal[0].TaxSubtotal[0].TaxAmount[0]._ = totalImpuestos.toString();
						jsonBody.Invoice[0].LegalMonetaryTotal[0].LineExtensionAmount[0]._ = "0.00";
						delete jsonBody.Invoice[0].UBLExtensions;
						delete jsonBody.Invoice[0].AllowanceCharge;
					}
				}
				trace = 'Actividad 45';
				var finalResponse = createRequest({
					ruc: document.subsidiary.taxidnum,
					tipoDocumento: codTipoDocumento,
					numeracion: document.numeracion,
					jsonBody: jsonBody,
					internalId: options.internalId
				});

				response = finalResponse;

			} catch (error) {
				log.debug({
					title: 'createInvoiceRequest Error - ' + trace,
					details: error
				});
				response.status = STATUS_ERROR;
				response.message = 'Error: ' + error.message;
			}
			return response;
		}

		function processCreditMemoLine(lines, freeOperation, total, taxTotal) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Init'
			}
			try {
				var json = [];
				var jsonGravadas = ['Vacio'];
				var jsonInafectas = ['Vacio'];
				var jsonExportacion = ['Vacio'];
				var jsonGrat = ['Vacio'];
				var jsonExoneradas = ['Vacio'];
				var jsonTotalImpuestosGRA = [];
				var jsonTotalImpuestosINA = [];
				var jsonTotalImpuestosEXO = [];
				var jsonTotalImpuestoICBPER = [];
				var jsonTotalImpuestoEXPORT = [];
				var jsonTotalImpuestoGRAT = [];
				var jsonCargoDescuento = [];
				var jsonTotalDescuentos = [];
				var jsonReturn = [];
				var sumtotalVentasGRA = 0.0;
				var summontoImpuestoGRA = 0.0;
				var sumtotalVentasINA = 0.0;
				var summontoImpuestoINA = 0.0;
				var sumtotalVentasEXO = 0.0;
				var summontoImpuestoEXO = 0.0;
				var sumtotalVentasEXPORT = 0.0;
				var sumtotalVentasGRAT = 0.0;
				var summontoImpuestoEXPORT = 0.0;
				var summontoImpuestoGRAT = 0.0;
				var montoDetracion = 0;
				var applyAnty = [];
				var montoDetracionValor = 0;
				var montobasecargodescuento = '';
				var anydiscoutnigv = '';
				var applyDetr = false;

				for (var i = 0; i < lines.length; i++) {
					var line = lines[i]; // add
					var jsonTotalImpuestos = [];
					var jsonCargoDescuentoLines = [];
					var precioVentaUnitario = 0.0;
					var idImpuesto = '';
					var codigo = '';
					var taxcheme = '';
					var TaxTypeCode = 'VAT';
					var tipoAfectacion = '';
					var itemtypeDiscount = 'notExist';
					var anydiscountline = '';

					var indicadorcargodescuento = '';
					var codigocargocdescuento = '';
					var factorcargodescuento = 0.0;
					var montocargodescuento = 0.0;
					var round = 0.0;
					var taxcodeDisplayDiscount = '';

					var amount = line.amount;
					var tax1amt = line.tax1Amt;
					var directtax1amt = tax1amt
					var directamount = amount

					var itemlookup = search.lookupFields({
						type: search.Type.ITEM,
						id: line.item,
						columns: ['itemid']
					});
					var itemDisplay = itemlookup.itemid;

					if (applyDetr == false) {
						applyDetr = line.applyWh;
					}
					var unitsDisplay = getUnitDisplay(line.units);
					var unit = getUnit(line.item);
					var itemType = line.itemType;

					if (itemType == 'Discount') {
						montoDetracionValor = line.amount
						montoDetracion = montoDetracion + (montoDetracionValor * -1);
					}

					if (itemType == 'InvtPart' || itemType == 'Service' || itemType == 'NonInvtPart' || itemType == 'Assembly' || itemType == 'Kit') {
						precioVentaUnitario = (line.rate + (line.rate * (line.taxrate1GRa / 100)));
						round = precioVentaUnitario.toString().split('.');
						if (typeof round[1] != 'undefined') {
							precioVentaUnitario = round[1].length > 7 ? precioVentaUnitario.toFixed(2) : precioVentaUnitario;
						}

						if (line.taxCodeDisplay === TAX_CODE_GRAVADA) {  // GRAVADAS
							if (freeOperation == true) {
								idImpuesto = '9996'; // Gratuito
								codigo = '1004'; // Total valor de venta – Operaciones gratuitas
								tipoAfectacion = '15'; // Gravado – Retiro por premio
								sumtotalVentasGRA += line.amount;
								summontoImpuestoGRA += line.montoImpuesto;
								jsonGravadas = {
									codigo: codigo,
									totalVentas: sumtotalVentasGRA
								}
								taxcheme = 'GRA';
								TaxTypeCode = 'FRE';
							} else {
								idImpuesto = '1000'; // Igv impuesto general a las ventas
								codigo = '1001'; // Total valor de venta - operaciones gravadas
								tipoAfectacion = '10'; // Gravado - Operación Onerosa
								sumtotalVentasGRA += line.amount;
								summontoImpuestoGRA += line.montoImpuesto;
								taxcheme = 'IGV';
							}
							try {
								var nextLine = lines[i + 1]
								itemtypeDiscount = nextLine.itemType
								taxcodeDisplayDiscount = nextLine.taxCodeDisplay;
							} catch (error) { }

							if (itemtypeDiscount === 'Discount' && taxcodeDisplayDiscount !== TAXT_CODE_UNDEF) {
								anydiscountline = 'any';
							} else {
								jsonGravadas = {
									codigo: codigo,
									totalVentas: sumtotalVentasGRA

								}
								jsonTotalImpuestosGRA = [{
									idImpuesto: idImpuesto,
									montoImpuesto: summontoImpuestoGRA.toFixed(2),
									taxcheme: taxcheme,
									TaxTypeCode: TaxTypeCode
								}];
							}
						}

						if (line.taxCodeDisplay === TAX_CODE_EXENTA) { // EXONERADAS
							if (freeOperation == true) {
								idImpuesto = '9996'; // Gratuito
								codigo = '1004'; // Total valor de venta - operaciones exoneradas
								tipoAfectacion = '21'; // Exonerado – Transferencia Gratuita
								sumtotalVentasEXO += line.amount;
								summontoImpuestoEXO += line.montoImpuesto;
								jsonExoneradas = {
									codigo: codigo,
									totalVentas: sumtotalVentasEXO.toFixed(2)
								}
								taxcheme = 'GRA';
								TaxTypeCode = 'FRE';
							} else {
								idImpuesto = '9997'; //Exonerado
								codigo = '1003'; // Total valor de venta - operaciones exoneradas
								tipoAfectacion = '20'; // Exonerado - Operación Onerosa
								sumtotalVentasEXO += line.amount;
								summontoImpuestoEXO += line.montoImpuesto;
								taxcheme = 'EXO';
							}

							try {
								var nextLine = lines[i + 1]
								itemtypeDiscount = nextLine.itemType
								taxcodeDisplayDiscount = nextLine.taxCodeDisplay;
							} catch (error) { }

							if (itemtypeDiscount === 'Discount' && taxcodeDisplayDiscount !== TAXT_CODE_UNDEF) {
								anydiscountline = 'any';
							} else {
								jsonExoneradas = {
									codigo: codigo,
									totalVentas: sumtotalVentasEXO.toFixed(2)
								}
							}

							jsonTotalImpuestosEXO = [{
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoEXO.toFixed(2),
								taxcheme: taxcheme,
								TaxTypeCode: TaxTypeCode
							}];
						}

						if (line.taxCodeDisplay === TAX_CODE_INAFECTA) { // INAFECTAS
							if (freeOperation === true) {
								idImpuesto = '9996'; // Gratuito
								codigo = '1004'; // Total valor de venta - operaciones inafectas
								tipoAfectacion = '35'; // Inafecto – Retiro por premio
								sumtotalVentasINA += line.amount;
								summontoImpuestoINA += line.montoImpuesto;
								jsonInafectas = {
									codigo: codigo,
									totalVentas: sumtotalVentasINA.toFixed(2)
								}
								taxcheme = 'GRA';
								TaxTypeCode = 'FRE'
							} else {
								idImpuesto = '9998'; // Inafecto
								codigo = '1002'; // Total valor de venta - operaciones inafectas
								tipoAfectacion = '30'; // Inafecto - Operación Onerosa
								sumtotalVentasINA += line.amount;
								summontoImpuestoINA += line.montoImpuesto;
								taxcheme = 'INA';
								TaxTypeCode = 'FRE';
							}
							try {
								var nextLine = lines[i + 1]
								itemtypeDiscount = nextLine.itemType
								taxcodeDisplayDiscount = nextLine.taxCodeDisplay;
							} catch (error) { }

							if (itemtypeDiscount == 'Discount' && taxcodeDisplayDiscount != TAXT_CODE_UNDEF) {
								anydiscountline = 'any';
							} else {
								jsonInafectas = {
									codigo: codigo,
									totalVentas: sumtotalVentasINA.toFixed(2)
								}
							}
							jsonTotalImpuestosINA = [{
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoINA.toFixed(2),
								taxcheme: taxcheme,
								TaxTypeCode: TaxTypeCode
							}];
						}

						if (line.taxCodeDisplay === TAX_CODE_EXPORT) { // EXPORTACION
							idImpuesto = '9995'; // Gratuito
							codigo = '1004'; // Total valor de venta - operaciones inafectas
							tipoAfectacion = '40'; // TaxExemptionReasonCode
							sumtotalVentasEXPORT += line.amount;
							summontoImpuestoEXPORT += line.montoImpuesto;
							jsonExportacion = {
								codigo: codigo,
								totalVentas: sumtotalVentasEXPORT.toFixed(2)
							}
							jsonTotalImpuestoEXPORT.push({
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoEXPORT.toFixed(2),
								taxcheme: taxcheme,
								TaxTypeCode: TaxTypeCode
							});
							taxcheme = 'EXP';
							TaxTypeCode = 'FRE'
						}

						if (line.taxCodeDisplay === TAX_CODE_GRATUITA) { // GRATUITA
							idImpuesto = '9996'; // Gratuito
							codigo = '1004'; // Total valor de venta - operaciones inafectas
							tipoAfectacion = '31'; // TaxExemptionReasonCode
							sumtotalVentasGRAT += amount;
							summontoImpuestoGRAT += montoimpuesto;
							jsonGrat = {
								codigo: codigo,
								totalVentas: sumtotalVentasGRAT.toFixed(2)
							}
							jsonTotalImpuestoGRAT = [{
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoGRAT.toFixed(2),
								taxcheme: taxcheme,
								TaxTypeCode: TaxTypeCode
							}];
							taxcheme = 'GRA';
							TaxTypeCode = 'FRE'
						}

						if (anydiscountline === 'any') {
							var discountLine = lines[i + 1];

							var rateDiscountLine = parseFloat(discountLine.rate);
							var amountDiscountLine = discountLine.amount;
							var tax1amtDiscountLine = discountLine.tax1Amt;
							var grossamtDiscountLine = discountLine.grossamt;

							tax1amtDiscountLine = parseFloat(tax1amtDiscountLine.toString().replace('-', ''));
							rateDiscountLine = rateDiscountLine.toString().replace('-', '').replace('%', '');
							factorcargodescuento = rateDiscountLine / 100;
							round = factorcargodescuento.toString().split('.');

							if (typeof round[1] != 'undefined') {
								round[1].length > 5 ? factorcargodescuento = factorcargodescuento.toFixed(5) : factorcargodescuento
							}

							amountDiscountLine = parseFloat(amountDiscountLine.toString().replace('-', ''));
							montocargodescuento = parseFloat(amountDiscountLine) * parseFloat(factorcargodescuento);
							var dsctoVentaUnitario = parseFloat(precioVentaUnitario) * parseFloat(factorcargodescuento);
							precioVentaUnitario = parseFloat(precioVentaUnitario) - dsctoVentaUnitario;

							var montobasecargodscto = amount
							amount = amount - amountDiscountLine;
							tax1amt = tax1amt - tax1amtDiscountLine;

							if (line.taxCodeDisplay === TAX_CODE_GRAVADA) { // GRAVADAS
								indicadorcargodescuento = 'false'; // (cargo = true , Descuento = false)
								codigocargocdescuento = '00'; // Descuentos que afectan la base imponible del IGV
								sumtotalVentasGRA -= amountDiscountLine;
								jsonGravadas = {
									codigo: codigo,
									totalVentas: sumtotalVentasGRA,
									taxcheme: taxcheme,
									TaxTypeCode: TaxTypeCode
								}
								summontoImpuestoGRA -= tax1amtDiscountLine;
								jsonTotalImpuestosGRA.push({
									idImpuesto: idImpuesto,
									montoImpuesto: summontoImpuestoGRA.toFixed(2)
								});
							}
							if (line.taxCodeDisplay === TAX_CODE_EXENTA) {
								indicadorcargodescuento = 'false'; // (cargo = true , Descuento = false)
								codigocargocdescuento = '00';
								sumtotalVentasEXO -= amountDiscountLine;
								jsonExoneradas = {
									codigo: codigo,
									totalVentas: sumtotalVentasEXO.toFixed(2),
									taxcheme: taxcheme,
									TaxTypeCode: TaxTypeCode
								}
							}
							if (line.taxCodeDisplay === TAX_CODE_INAFECTA) {
								indicadorcargodescuento = 'false'; // (cargo = true , Descuento = false)
								codigocargocdescuento = '00'; // Descuentos que no afectan la base imponible del IGV
								sumtotalVentasINA -= amountDiscountLine;
								jsonInafectas = {
									codigo: codigo,
									totalVentas: sumtotalVentasINA.toFixed(2),
									taxcheme: taxcheme,
									TaxTypeCode: TaxTypeCode
								}
							}
							jsonCargoDescuentoLines.push({
								indicadorCargoDescuento: indicadorcargodescuento,
								codigoCargoDescuento: codigocargocdescuento,
								factorCargoDescuento: factorcargodescuento.toString(),
								montoCargoDescuento: amountDiscountLine.toFixed(2),
								montoBaseCargoDescuento: montobasecargodscto.toString(),
								importeBruto: grossamtDiscountLine
							});
						}

						if (tax1amt === 0) {
							tax1amt = directtax1amt
						}
						if (amount === 0) {
							amount = directamount
						}

						jsonTotalImpuestos.push({
							idImpuesto: idImpuesto,
							montoImpuesto: line.tax1Amt.toFixed(2),
							tipoAfectacion: tipoAfectacion,
							montoBase: amount.toFixed(2).toString(),
							porcentaje: line.taxRate1.toString()
						});

						if (unit === "") {
							unit = "NIU"//IMorales 20230814
						}

						if (freeOperation === true) {
							json.push({
								numeroItem: (i + 1).toString(),
								codigoProducto: itemDisplay,
								descripcionProducto: line.description,
								cantidadItems: line.quantity.toString(),
								unidad: unit,
								tipoprecio: '02',
								valorUnitario: line.rate.toString(),
								precioVentaUnitario: parseFloat(precioVentaUnitario).toFixed(2).toString(),
								totalImpuestos: jsonTotalImpuestos,
								valorVenta: amount.toFixed(2).toString(),
								valorRefOpOnerosas: rateopfree.toFixed(2).toString(),
								montoTotalImpuestos: '0.00',
								taxcheme: taxcheme,
								TaxTypeCode: TaxTypeCode,
								importeBruto: line.grossamt,
								taxCodeDisplay: line.taxCodeDisplay,
								unitDisplay: nvl(unitsDisplay, line.unitDisplay), //<I> rhuaccha: 2024-09-13
								tarifa: line.tarifa,
								amount: line.amount //<I> rhuaccha: 2024-09-16
							});
						} else if (anydiscountline === 'any') {
							json.push({
								numeroItem: (i + 1).toString(),
								codigoProducto: itemDisplay,
								descripcionProducto: line.description,
								cantidadItems: line.quantity.toString(),
								unidad: unit,
								tipoprecio: '01',
								valorUnitario: line.rate.toString(),
								precioVentaUnitario: parseFloat(precioVentaUnitario).toFixed(2).toString(),
								cargoDescuento: jsonCargoDescuentoLines,
								totalImpuestos: jsonTotalImpuestos,
								valorVenta: amount.toFixed(2).toString(),
								montoTotalImpuestos: parseFloat(tax1amt).toFixed(2),
								taxcheme: taxcheme,
								TaxTypeCode: TaxTypeCode,
								importeBruto: line.grossamt,
								taxCodeDisplay: line.taxCodeDisplay,
								unitDisplay: nvl(unitsDisplay, line.unitDisplay), //<I> rhuaccha: 2024-09-13
								tarifa: line.tarifa,
								amount: line.amount //<I> rhuaccha: 2024-09-16
							});
						} else {
							json.push({
								numeroItem: (i + 1).toString(),
								codigoProducto: itemDisplay,
								descripcionProducto: line.description,
								cantidadItems: line.quantity.toString(),
								unidad: unit,
								tipoprecio: line.taxCodeDisplay == TAX_CODE_GRATUITA ? '02' : '01',
								valorUnitario: line.taxCodeDisplay == TAX_CODE_GRATUITA ? '0.00' : line.rate.toString(),
								precioVentaUnitario: parseFloat(precioVentaUnitario).toFixed(2).toString(),
								totalImpuestos: jsonTotalImpuestos,
								valorVenta: amount.toFixed(2).toString(),
								montoTotalImpuestos: tax1amt.toString(),
								taxcheme: taxcheme,
								TaxTypeCode: TaxTypeCode,
								importeBruto: line.grossamt,
								taxCodeDisplay: line.taxCodeDisplay, //<I> rhuaccha: 2024-08-29
								unitDisplay: nvl(unitsDisplay, line.unitDisplay), //<I> rhuaccha: 2024-09-13
								tarifa: line.tarifa,
								amount: line.amount //<I> rhuaccha: 2024-09-16
							});
						}

					} else if (itemType === 'Subtotal') {
						montobasecargodescuento = amount;
					} else if (itemType === 'Discount' && line.isDiscountLine === false && taxcode_display !== TAXT_CODE_UNDEF) {

						if (line.taxCodeDisplay === TAX_CODE_GRAVADA) {  // GRAVADAS
							indicadorcargodescuento = 'false'; // (cargo = true , Descuento = false)
							codigocargocdescuento = '02'; // Descuentos globales que afectan la base imponible del IGV
							anydiscoutnigv = 'any';
						} else {
							indicadorcargodescuento = 'false'; // (cargo = true , Descuento = false)
							codigocargocdescuento = '03'; // Descuentos globales que no afectan la base imponible del IGV
						}
						var rate = line.rate.toString().replace('-', '').replace('%', '');
						factorcargodescuento = rate / 100
						round = factorcargodescuento.toString().split('.');
						if (typeof round[1] != 'undefined') {
							round[1].length > 5 ? factorcargodescuento = factorcargodescuento.toFixed(5) : factorcargodescuento
						}
						amount = amount.toString().replace('-', '')
						jsonTotalDescuentos.push({
							codigo: "2005",
							totalDescuentos: amount
						});

						jsonCargoDescuento.push({
							indicadorCargoDescuento: indicadorcargodescuento,
							codigoCargoDescuento: codigocargocdescuento,
							factorCargoDescuento: factorcargodescuento.toString(),
							montoCargoDescuento: amount,
							montoBaseCargoDescuento: montobasecargodescuento.toString()
						});
					}
				} // END FOR

				if (anydiscoutnigv == 'any') {

				} else {
					if (jsonGravadas != 'Vacio') {
						jsonGravadas = {
							codigo: jsonGravadas.codigo,
							totalVentas: jsonGravadas.totalVentas.toFixed(2)
						}
					}
				}

				jsonReturn = {
					det: json,
					gravadas: jsonGravadas,
					inafectas: jsonInafectas,
					exoneradas: jsonExoneradas,
					exportacion: jsonExportacion,
					gratuita: jsonGrat,
					totalimpuestosgra: jsonTotalImpuestosGRA,
					totalimpuestosina: jsonTotalImpuestosINA,
					totalimpuestosexo: jsonTotalImpuestosEXO,
					totalimpuestoicbper: jsonTotalImpuestoICBPER,
					totalimpuestoiExport: jsonTotalImpuestoEXPORT,
					totalimpuestoigratuita: jsonTotalImpuestoGRAT,
					importetotal: total.toFixed(2),
					montototalimpuestos: taxTotal.toFixed(2),
					// codigocliente: codcustomer,
					anydiscoutnigv: anydiscoutnigv,
					applywh: applyDetr,
					applyanty: applyAnty,
					montoDetracion: montoDetracion.toFixed(2).toString()
				}

				if (jsonCargoDescuento.length != 0) {
					if (codigocargocdescuento == '03') {
						jsonReturn.totaldescuentos = jsonTotalDescuentos;
					}
					jsonReturn.cargodescuento = jsonCargoDescuento;
				}

				responseObj.status = STATUS_OK;
				responseObj.message = 'Proceso completado correctamente';
				responseObj.details = jsonReturn;


			} catch (error) {
				
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Error processCreditMemoLine: ' + error.message;
			}
			return responseObj;
		}

		function processInvoiceLine(lines, freeOperation, isDonation, total, taxtotal) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Init'
			}
			var trace = 'Actividad 1';
			try {
				var json = [];
				var jsonGravadas = ['Vacio'];
				var jsonInafectas = ['Vacio'];
				var jsonExportacion = ['Vacio'];
				var jsonGrat = ['Vacio'];
				var jsonExoneradas = ['Vacio'];
				var jsonTotalImpuestosGRA = new Array();
				var jsonTotalImpuestosINA = new Array();
				var jsonTotalImpuestosEXO = new Array();
				var jsonTotalImpuestoICBPER = new Array();
				var jsonTotalImpuestoEXPORT = new Array();
				var jsonTotalImpuestoGRAT = new Array();
				var jsonCargoDescuento = new Array();
				var jsonTotalDescuentos = new Array();
				var jsonReturn = new Array();
				var sumtotalVentasGRA = 0.0;
				var summontoImpuestoGRA = 0.0;
				var sumtotalVentasINA = 0.0;
				var summontoImpuestoINA = 0.0;
				var sumtotalVentasEXO = 0.0;
				var summontoImpuestoEXO = 0.0;
				var sumtotalVentasEXPORT = 0.0;
				var sumtotalVentasGRAT = 0.0;
				var summontoImpuestoEXPORT = 0.0;
				var summontoImpuestoGRAT = 0.0;
				var montoDetracion = 0;
				var applyAnty = new Array();
				var montoDetracionValor = 0
				// Params for subtotal
				var montobasecargodescuento = '';
				//Flag discount
				var anydiscoutnigv = '';
				var applyDetr = false;
				var applyrent = false;
				var otherCharge = {
					exist: 'N'
				};
				var totalLineDisc = 0;
				trace = 'Actividad 2';
				for (var i = 0; i < lines.length; i++) {
					var line = lines[i]; // add
					var jsonTotalImpuestos = [];
					var jsonCargoDescuentoLines = [];
					var precioVentaUnitario = 0.0;
					var idImpuesto = '';
					var codigo = '';
					var taxCheme = '';
					var TaxTypeCode = 'VAT';
					var tipoAfectacion = '';
					var itemTypeDiscount = 'notExist';
					var anyDiscountLine = '';

					var indicadorCargoDescuento = '';
					var codigoCargoDescuento = '';
					var factorCargoDescuento = 0.0;
					var montoCargoDescuento = 0.0;
					var round = 0.0;
					var taxcodeDisplayDiscount = '';

					var amount = line.amount;
					var tax1amt = line.tax1Amt;

					var directtax1amt = tax1amt
					var directamount = amount

					var itemlookup = search.lookupFields({
						type: search.Type.ITEM,
						id: line.item,
						columns: ['itemid']
					});
					var itemDisplay = itemlookup.itemid;

					var unitsDisplay = getUnitDisplay(line.units);
					var unit = getUnit(line.item);
					var rateopfree = line.rate;

					if (applyDetr === false) {
						applyDetr = line.applyWh;
					}

					applyrent = line.applyrent;
					var itemType = line.itemType;
					if (itemType === 'Discount') {
						montoDetracionValor = line.amount;
						montoDetracion = montoDetracion + (montoDetracionValor * -1);
					}
					trace = 'Actividad 3';
					if (itemType == 'InvtPart' || itemType == 'Service' || itemType == 'NonInvtPart' || itemType == 'Assembly' || itemType == 'Kit') {
						precioVentaUnitario = (line.rate + (line.rate * (line.taxrate1GRa / 100)));
						round = precioVentaUnitario.toString().split('.');
						trace = 'Actividad 4';
						if (typeof round[1] != 'undefined') {
							precioVentaUnitario = round[1].length > 7 ? precioVentaUnitario.toFixed(2) : precioVentaUnitario;
						}
						trace = 'Actividad 5';
						if (line.taxCodeDisplay === TAX_CODE_GRAVADA) {
							// GRAVADAS
							if (freeOperation === true) {
								idImpuesto = '9996'; // Gratuito
								codigo = '1004'; // Total valor de venta – Operaciones gratuitas
								tipoAfectacion = '15'; // Gravado – Retiro por premio
								sumtotalVentasGRA += line.amount;
								summontoImpuestoGRA += line.tax1Amt;
								jsonGravadas = {
									codigo: codigo,
									totalVentas: sumtotalVentasGRA
								}
								taxCheme = 'GRA';
								TaxTypeCode = 'FRE';
							} else {
								idImpuesto = '1000'; // Igv impuesto general a las ventas
								codigo = '1001'; // Total valor de venta - operaciones gravadas
								tipoAfectacion = '10'; // Gravado - Operación Onerosa
								sumtotalVentasGRA += line.amount;
								summontoImpuestoGRA += line.tax1Amt;
								taxCheme = 'IGV';
							}

							try {
								var nextLine = lines[i + 1]
								itemTypeDiscount = nextLine.itemType
								taxcodeDisplayDiscount = nextLine.taxCodeDisplay;
							} catch (error) { }
							trace = 'Actividad 6';
							if (itemTypeDiscount === 'Discount' && taxcodeDisplayDiscount != TAXT_CODE_UNDEF) {
								anyDiscountLine = 'any';
							} else {
								jsonGravadas = {
									codigo: codigo,
									totalVentas: sumtotalVentasGRA

								}
								jsonTotalImpuestosGRA = [{
									idImpuesto: idImpuesto,
									montoImpuesto: summontoImpuestoGRA.toFixed(2),
									taxcheme: taxCheme,
									TaxTypeCode: TaxTypeCode
								}];
							}
						}
						trace = 'Actividad 7';
						if (line.taxCodeDisplay === TAX_CODE_EXENTA) { // EXONERADAS
							if (freeOperation == true) {
								idImpuesto = '9996'; // Gratuito
								codigo = '1004'; // Total valor de venta - operaciones exoneradas
								tipoAfectacion = '21'; // Exonerado – Transferencia Gratuita
								sumtotalVentasEXO += line.amount;
								summontoImpuestoEXO += line.tax1Amt;
								jsonExoneradas = {
									codigo: codigo,
									totalVentas: sumtotalVentasEXO.toFixed(2)
								}
								taxCheme = 'GRA';
								TaxTypeCode = 'FRE';

							} else {
								idImpuesto = '9997'; //Exonerado
								codigo = '1003'; // Total valor de venta - operaciones exoneradas
								tipoAfectacion = '20'; // Exonerado - Operación Onerosa
								sumtotalVentasEXO += amount;
								summontoImpuestoEXO += line.tax1Amt;
								taxCheme = 'EXO';
							}
							try {
								var nextLine = lines[i + 1]
								itemTypeDiscount = nextLine.itemType
								taxcodeDisplayDiscount = nextLine.taxCodeDisplay;
							} catch (error) { }

							if (itemTypeDiscount === 'Discount' && taxcodeDisplayDiscount !== TAXT_CODE_UNDEF) {
								anyDiscountLine = 'any';
							} else {
								jsonExoneradas = {
									codigo: codigo,
									totalVentas: sumtotalVentasEXO.toFixed(2)

								}
							}
							jsonTotalImpuestosEXO = [{
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoEXO.toFixed(2),
								taxcheme: taxCheme,
								TaxTypeCode: TaxTypeCode
							}];
						}
						trace = 'Actividad 8';
						if (line.taxCodeDisplay === TAX_CODE_INAFECTA) { // INAFECTAS
							if (freeOperation == true || isDonation == true) {
								idImpuesto = '9996'; // Gratuito
								codigo = '1004'; // Total valor de venta - operaciones inafectas
								tipoAfectacion = isDonation ? '37' : (freeop ? '35' : ''); // '35'; // Inafecto – Retiro por premio
								sumtotalVentasINA += amount;
								summontoImpuestoINA += line.tax1Amt;
								jsonInafectas = {
									codigo: codigo,
									totalVentas: sumtotalVentasINA.toFixed(2)
								}
								taxCheme = 'GRA';
								TaxTypeCode = 'FRE'

							} else {
								idImpuesto = '9998'; // Inafecto
								codigo = '1002'; // Total valor de venta - operaciones inafectas
								tipoAfectacion = '30'; // Inafecto - Operación Onerosa
								sumtotalVentasINA += amount;
								summontoImpuestoINA += line.tax1Amt;
								taxCheme = 'INA';
								TaxTypeCode = 'FRE';
							}
							try {
								var nextLine = lines[i + 1]
								itemTypeDiscount = nextLine.itemType
								taxcodeDisplayDiscount = nextLine.taxCodeDisplay;
							} catch (error) { }

							if (itemTypeDiscount == 'Discount' && taxcodeDisplayDiscount != TAXT_CODE_UNDEF) {
								anyDiscountLine = 'any';
							} else {
								jsonInafectas = {
									codigo: codigo,
									totalVentas: sumtotalVentasINA.toFixed(2)
								}
							}
							jsonTotalImpuestosINA = [{
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoINA.toFixed(2),
								taxcheme: taxCheme,
								TaxTypeCode: TaxTypeCode
							}];
						}
						trace = 'Actividad 10';
						if (line.taxCodeDisplay === TAX_CODE_EXPORT) {
							idImpuesto = '9995'; // Gratuito
							codigo = '1004'; // Total valor de venta - operaciones inafectas
							tipoAfectacion = '40'; // TaxExemptionReasonCode
							sumtotalVentasEXPORT += line.amount;
							summontoImpuestoEXPORT += line.tax1Amt;
							jsonExportacion = {
								codigo: codigo,
								totalVentas: sumtotalVentasEXPORT.toFixed(2)

							}
							jsonTotalImpuestoEXPORT.push({
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoEXPORT.toFixed(2),
								taxcheme: taxCheme,
								TaxTypeCode: TaxTypeCode
							});
							taxCheme = 'EXP';
							TaxTypeCode = 'FRE'
						}
						trace = 'Actividad 11';
						if (line.taxCodeDisplay === TAX_CODE_GRATUITA) {
							idImpuesto = '9996'; // Gratuito
							codigo = '1004'; // Total valor de venta - operaciones inafectas
							tipoAfectacion = '31'; // TaxExemptionReasonCode
							sumtotalVentasGRAT += line.amount;
							summontoImpuestoGRAT += line.tax1Amt;
							jsonGrat = {
								codigo: codigo,
								totalVentas: sumtotalVentasGRAT.toFixed(2)

							}

							jsonTotalImpuestoGRAT = [{
								idImpuesto: idImpuesto,
								montoImpuesto: summontoImpuestoGRAT.toFixed(2),
								taxcheme: taxCheme,
								TaxTypeCode: TaxTypeCode
							}];
							taxCheme = 'GRA';
							TaxTypeCode = 'FRE'
						}
						trace = 'Actividad 12';
						if (anyDiscountLine === 'any') {
							var discountLine = lines[i + 1];
							var rateDiscountLine = parseFloat(discountLine.rate);
							var amountDiscountLine = discountLine.amount;
							var tax1amtDiscountLine = discountLine.tax1amt;
							var grossamtDiscountLine = discountLine.grossamt;

							tax1amtDiscountLine = parseFloat(tax1amtDiscountLine.toString().replace('-', ''));
							rateDiscountLine = rateDiscountLine.toString().replace('-', '').replace('%', '');
							factorCargoDescuento = rateDiscountLine / 100;
							round = factorCargoDescuento.toString().split('.');

							if (typeof round[1] != 'undefined') {
								round[1].length > 5 ? factorCargoDescuento = factorCargoDescuento.toFixed(5) : factorCargoDescuento
							}

							amountDiscountLine = parseFloat(amountDiscountLine.toString().replace('-', ''));
							montoCargoDescuento = parseFloat(amountDiscountLine) * parseFloat(factorCargoDescuento);

							var dsctoVentaUnitario = parseFloat(precioVentaUnitario) * parseFloat(factorCargoDescuento);
							precioVentaUnitario = parseFloat(precioVentaUnitario) - dsctoVentaUnitario;

							var montobasecargodscto = amount;
							amount = amount - amountDiscountLine;
							tax1amt = tax1amt - tax1amtDiscountLine;

							if (line.taxCodeDisplay === TAX_CODE_GRAVADA) {  // GRAVADAS
								indicadorCargoDescuento = 'false'; // (cargo = true , Descuento = false)
								codigoCargoDescuento = '00'; // Descuentos que afectan la base imponible del IGV
								sumtotalVentasGRA -= amountDiscountLine;
								jsonGravadas = {
									codigo: codigo,
									totalVentas: sumtotalVentasGRA,
									taxcheme: taxCheme,
									TaxTypeCode: TaxTypeCode
								}
								summontoImpuestoGRA -= tax1amtDiscountLine;
								jsonTotalImpuestosGRA = [{
									idImpuesto: idImpuesto,
									montoImpuesto: parseFloat(summontoImpuestoGRA).toFixed(2)
								}];

							}
							if (line.taxCodeDisplay === TAX_CODE_EXENTA) {
								indicadorCargoDescuento = 'false'; // (cargo = true , Descuento = false)
								codigoCargoDescuento = '00'; // Descuentos que no afectan la base imponible del IGV
								sumtotalVentasEXO -= amountDiscountLine;
								jsonExoneradas = {
									codigo: codigo,
									totalVentas: sumtotalVentasEXO.toFixed(2),
									taxcheme: taxCheme,
									TaxTypeCode: TaxTypeCode
								}
							}
							if (line.taxCodeDisplay === TAX_CODE_INAFECTA) {
								indicadorCargoDescuento = 'false'; // (cargo = true , Descuento = false)
								codigoCargoDescuento = '00'; // Descuentos que no afectan la base imponible del IGV
								sumtotalVentasINA -= amountDiscountLine;
								jsonInafectas = {
									codigo: codigo,
									totalVentas: sumtotalVentasINA.toFixed(2),
									taxcheme: taxCheme,
									TaxTypeCode: TaxTypeCode
								}
							}
							jsonCargoDescuentoLines.push({
								indicadorCargoDescuento: indicadorCargoDescuento,
								codigoCargoDescuento: codigoCargoDescuento,
								factorCargoDescuento: factorCargoDescuento.toString(),
								montoCargoDescuento: amountDiscountLine.toFixed(2),
								montoBaseCargoDescuento: montobasecargodscto.toString(),
								importeBruto: grossamtDiscountLine
							});
						}
						trace = 'Actividad 13 ' + tax1amt;
						if (tax1amt === 0) {
							tax1amt = directtax1amt
						}
						if (amount === 0) {
							amount = directamount
						}
						trace = 'Actividad 14';
						jsonTotalImpuestos.push({
							idImpuesto: idImpuesto,
							montoImpuesto: tax1amt.toFixed(2),
							tipoAfectacion: tipoAfectacion,
							montoBase: amount.toFixed(2).toString(),
							porcentaje: line.taxRate1.toString()
						});
						trace = 'Actividad 15';
						if (unit === "") {
							unit = "NIU"
						}

						if (freeOperation === true || isDonation === true) {
							json.push({
								numeroItem: (i + 1).toString(),
								codigoProducto: itemDisplay,
								descripcionProducto: line.description,
								cantidadItems: line.quantity.toString(),
								unidad: unit,
								tipoprecio: '02',
								valorUnitario: line.rate.toString(),
								precioVentaUnitario: parseFloat(precioVentaUnitario).toFixed(2).toString(),
								totalImpuestos: jsonTotalImpuestos,
								valorVenta: line.amount.toFixed(2).toString(),
								valorRefOpOnerosas: rateopfree.toFixed(2).toString(),
								montoTotalImpuestos: '0.00',
								taxcheme: taxCheme,
								TaxTypeCode: TaxTypeCode,
								importeBruto: line.grossamt,
								taxCodeDisplay: line.taxCodeDisplay,
								unitDisplay: nvl(unitsDisplay, line.unitDisplay),
								tarifa: parseFloat(line.rate),
								amount: line.amount,
								cuponCode: line.cuponCode
							});
						} else if (anyDiscountLine === 'Y') {
							json.push({
								numeroItem: (i + 1).toString(),
								codigoProducto: itemDisplay,
								descripcionProducto: line.description,
								cantidadItems: line.quantity.toString(),
								unidad: unit,
								tipoprecio: '01',
								valorUnitario: line.rate.toString(),
								precioVentaUnitario: parseFloat(precioVentaUnitario).toFixed(2).toString(),
								cargoDescuento: jsonCargoDescuentoLines,
								totalImpuestos: jsonTotalImpuestos,
								valorVenta: amount.toFixed(2).toString(),
								montoTotalImpuestos: parseFloat(tax1amt).toFixed(2),
								taxcheme: taxCheme,
								TaxTypeCode: TaxTypeCode,
								importeBruto: line.grossamt,
								taxCodeDisplay: line.taxCodeDisplay,
								unitDisplay: nvl(unitsDisplay, line.unitDisplay),
								tarifa: parseFloat(line.rate),
								amount: line.amount,
								cuponCode: line.cuponCode
							});
						} else {
							json.push({
								numeroItem: (i + 1).toString(),
								codigoProducto: itemDisplay,
								descripcionProducto: line.description,
								cantidadItems: line.quantity.toString(),
								unidad: unit,
								tipoprecio: line.taxCodeDisplay === TAX_CODE_GRATUITA ? '02' : '01',
								valorUnitario: line.taxCodeDisplay === TAX_CODE_GRATUITA ? '0.00' : line.rate.toString(),
								precioVentaUnitario: parseFloat(precioVentaUnitario).toFixed(2).toString(),
								totalImpuestos: jsonTotalImpuestos,
								valorVenta: amount.toFixed(2).toString(),
								montoTotalImpuestos: tax1amt.toString(),
								taxcheme: taxCheme,
								TaxTypeCode: TaxTypeCode,
								importeBruto: line.grossamt,
								taxCodeDisplay: line.taxCodeDisplay,
								unitDisplay: nvl(unitsDisplay, line.unitDisplay),
								tarifa: parseFloat(line.rate),
								amount: line.amount,
								cuponCode: line.cuponCode
							});
						}
						trace = 'Actividad 16';
					} else if (itemType === 'Subtotal') {
						montobasecargodescuento = line.amount; //subtotal
					} else if (itemType === 'Discount' && line.isDiscountLine === false && line.taxCodeDisplay !== TAXT_CODE_UNDEF) {

						if (taxcode_display == TAX_CODE_GRAVADA) {  // GRAVADAS
							indicadorCargoDescuento = 'false'; // (cargo = true , Descuento = false)
							codigoCargoDescuento = '02'; // Descuentos globales que afectan la base imponible del IGV
							anydiscoutnigv = 'any';
						} else {
							indicadorCargoDescuento = 'false'; // (cargo = true , Descuento = false)
							codigoCargoDescuento = '03'; // Descuentos globales que no afectan la base imponible del IGV
						}
						var rate = line.rate.toString().replace('-', '').replace('%', '');
						factorCargoDescuento = rate / 100
						round = factorCargoDescuento.toString().split('.');
						if (typeof round[1] != 'undefined') {
							round[1].length > 5 ? factorCargoDescuento = factorCargoDescuento.toFixed(5) : factorCargoDescuento
						}

						amount = amount.toString().replace('-', '')
						jsonTotalDescuentos.push({
							codigo: "2005",
							totalDescuentos: amount
						});
						jsonCargoDescuento.push({
							indicadorCargoDescuento: indicadorCargoDescuento,
							codigoCargoDescuento: codigoCargoDescuento,
							factorCargoDescuento: factorCargoDescuento.toString(),
							montoCargoDescuento: amount,
							montoBaseCargoDescuento: montobasecargodescuento.toString()
						});
					} else if (itemType === 'OthCharge') {
						otherCharge.exist = 'Y';
						otherCharge.type = itemType;
						otherCharge.itemId = line.item;
						otherCharge.importeBruto = line.grossamt;
					}


					if (itemType === 'Discount') {
						totalLineDisc += Math.abs(Number(line.amount)); //<I> rhuaccha: 2024-09-16
					}

				}

				if (anydiscoutnigv === 'any') {

				} else {
					if (jsonGravadas != 'Vacio') {
						jsonGravadas = {
							codigo: jsonGravadas.codigo,
							totalVentas: jsonGravadas.totalVentas.toFixed(2)
						}
					}
				}
				trace = 'Actividad 17';

				var jsonValue = {
					det: json,
					gravadas: jsonGravadas,
					inafectas: jsonInafectas,
					exoneradas: jsonExoneradas,
					exportacion: jsonExportacion,
					gratuita: jsonGrat,
					totalimpuestosgra: jsonTotalImpuestosGRA,
					totalimpuestosina: jsonTotalImpuestosINA,
					totalimpuestosexo: jsonTotalImpuestosEXO,
					totalimpuestoicbper: jsonTotalImpuestoICBPER,
					totalimpuestoiExport: jsonTotalImpuestoEXPORT,
					totalimpuestoigratuita: jsonTotalImpuestoGRAT,
					importetotal: (parseFloat(total)).toFixed(2),
					montototalimpuestos: (parseFloat(taxtotal)).toFixed(2),
					// codigocliente: codcustomer,
					anydiscoutnigv: anydiscoutnigv,
					applywh: applyDetr,
					applyrent: applyrent,
					applyanty: applyAnty,
					montoDetracion: (parseFloat(montoDetracion)).toFixed(2).toString(),
					otherCharge: otherCharge,
					totalLineDisc: totalLineDisc
				}

				if (jsonCargoDescuento.length != 0) {
					if (codigoCargoDescuento == '03') {
						jsonValue.totaldescuentos = jsonTotalDescuentos;
					}
					jsonValue.cargodescuento = jsonCargoDescuento;
				}

				responseObj.status = STATUS_OK;
				responseObj.message = 'Proceso completado correctamente';
				responseObj.details = jsonValue;

			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Error processInvoiceLine: ' + error.message + ' Trace : ' + trace;
			}
			return responseObj;
		}

		function getAnticipo(internalId) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Init',
				anticipo: {}
			}
			try {
				var anticipoSearch = search.create({
					type: search.Type.TRANSACTION,
					filters:
						[
							["type", search.Operator.ANYOF, "CustInvc"],
							"AND",
							["internalid", search.Operator.ANYOF, internalId],
							"AND",
							["mainline", search.Operator.IS, "T"]
						],
					columns:
						[
							search.createColumn({ name: "custentity_pe_document_number", join: "customer" }),
							search.createColumn({ name: "custentity_pe_code_document_type", join: "customer" }),
							search.createColumn({ name: "taxtotal" }),
							search.createColumn({ name: "total" }),
							search.createColumn({ name: "trandate" }),
							search.createColumn({ name: "symbol", join: "Currency" }),

						]
				});
				var resultSet = anticipoSearch.run().getRange({ start: 0, end: 1 });

				if (resultSet.length !== 0) {
					var anticipoTaxTotal = 0;
					var anticipoTotal = 0;
					var anticipoSubtotal = 0;
					var anticipoDoc = resultSet[0].getValue({ name: "custentity_pe_document_number", join: "customer" });
					var anticipoType = resultSet[0].getValue({ name: "custentity_pe_code_document_type", join: "customer" });
					anticipoTaxTotal = resultSet[0].getValue({ name: "taxtotal" });
					anticipoTotal = resultSet[0].getValue({ name: "total" });
					anticipoSubtotal = parseFloat(anticipoTotal) - parseFloat(anticipoTaxTotal);
					var anticipoCurrency = resultSet[0].getValue({ name: "symbol", join: "Currency" });
					var anticipoFechaEmision = resultSet[0].getValue({ name: "trandate" });
					anticipoFechaEmision = formatDate(anticipoFechaEmision);

					responseObj.status = STATUS_OK;
					responseObj.message = 'Proceso completado correctamente';
					responseObj.anticipo = {
						anticipoDoc: anticipoDoc,
						anticipoType: anticipoType,
						anticipoSubtotal: anticipoSubtotal,
						anticipoCurrency: anticipoCurrency,
						anticipoFechaEmision: anticipoFechaEmision,
						anticipoTaxTotal: anticipoTaxTotal,
						anticipoTotal: anticipoTotal
					}
				}

			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Error: ' + error.message;
			}
			return responseObj;
		}

		function getUnit(itemid) {
			var unit = '';
			try {
				var getunit = search.lookupFields({
					type: search.Type.ITEM,
					id: itemid,
					columns: ['custitem_pe_cod_measure_unit']
				});
				var unit = getunit.custitem_pe_cod_measure_unit;
			} catch (e) {
				unit = "";
			}
			return unit;
		}

		function getUnitDisplay(internalId) {
			var value = '';
			try {
				var lookup = search.lookupFields({
					type: 'unitstype',
					id: internalId,
					columns: ['name', 'unitname']
				});

				if (Object.keys(lookup).length !== 0) {
					value = nvl(lookup.unitname, lookup.name);
				}

			} catch (error) {
				value = '';
			}
			return value;
		}

		function getEmpAduaneraDetails(internalId, greId) {
			var obj = {
				status: false,
				message: 'INIT'
			}
			try {
				var tmpSearch = search.create({
					type: "vendor",
					filters:
						[
							["internalid", "anyof", internalId]
						],
					columns:
						[
							search.createColumn({ name: "entityid", label: "0. IDProveedor" }),
							search.createColumn({ name: "altname", label: "1.Nombre" }),
							search.createColumn({ name: "custentity_pe_vendor_name", label: "2.NombreProv" }),
							// search.createColumn({ name: "custentity_pe_document_number", label: "3.NumDocumento" }),
							search.createColumn({
								name: "custrecord_pe_departamento",
								join: "Address",
								label: "3.Departamento"
							}),
							search.createColumn({
								name: "custrecord_pe_distrito",
								join: "Address",
								label: "4.Distrito"
							}),
							search.createColumn({
								name: "address2",
								join: "Address",
								label: "5.Provincia"
							}),
							search.createColumn({
								name: "address1",
								join: "Address",
								label: "6.Direccion"
							}),
							search.createColumn({
								name: "countrycode",
								join: "Address",
								label: "7.Pais"
							}),
							search.createColumn({
								name: "zipcode",
								join: "Address",
								label: "8.ZipCode"
							}),
							search.createColumn({
								name: "phone",
								label: "9.Phone"
							})
						]
				});
				var result = tmpSearch.run().getRange({ start: 0, end: 1 });

				if (result && result.length > 0) {
					obj = {
						status: true,
						message: 'INIT',
						details: {
							idProveedor: nvl(result[0].getValue(tmpSearch.columns[0]), ''),
							nombreProveedor: nvl(result[0].getValue(tmpSearch.columns[2]), ''),
							departamento: nvl(result[0].getValue(tmpSearch.columns[3]), ''),
							provincia: nvl(result[0].getValue(tmpSearch.columns[5]), ''),
							distrito: nvl(result[0].getValue(tmpSearch.columns[4]), ''),
							direccion: nvl(result[0].getValue(tmpSearch.columns[6]), ''),
							pais: nvl(result[0].getValue(tmpSearch.columns[7]), ''),
							zipCode: nvl(result[0].getValue(tmpSearch.columns[8]), ''),
							phone: nvl(result[0].getValue(tmpSearch.columns[9]), ''),//<I> rhuaccha: 2024-09-13
						}
					}
				}

			} catch (error) {
				logError(greId, 'Error getEmpAduaneraDetails', JSON.stringify(error.message));
				obj = {
					status: false,
					message: 'Error: ' + error.message
				}
			}
			return obj;
		}

		function getEmptyEmpAduanera() {
			return {
				status: true,
				message: '-',
				details: {
					idProveedor: '',
					nombreProveedor: '',
					departamento: '',
					provincia: '',
					distrito: '',
					direccion: '',
					pais: '',
					zipCode: '',
					phone: ''
				}
			};
		}

		function getTransferOrder(internalid) {
			var responseObj = {
				status: false,
				message: 'Error',
				searchSize: 0,
				entityId: '',
			};
			try {
				var tmpSearch = search.create({
					type: search.Type.TRANSFER_ORDER,
					filters:
						[
							["type", search.Operator.ANYOF, "TrnfrOrd"],
							"AND",
							["internalid", search.Operator.ANYOF, internalid]
						],
					columns:
						[
							search.createColumn({ name: "legalname", join: "subsidiary", label: "10 Legal Name" }),
							search.createColumn({ name: "taxidnum", join: "subsidiary", label: "taxidnum" }),
							search.createColumn({ name: "zip", join: "subsidiary", label: "zip" }),
							search.createColumn({ name: "address1", join: "subsidiary" }),
							search.createColumn({ name: "city", join: "subsidiary" }),
							search.createColumn({ name: "transferlocation" }),
							search.createColumn({ name: "state", join: "subsidiary" }),
							search.createColumn({ name: "address2", join: "subsidiary", label: "address2" }),
							search.createColumn({ name: "country", join: "subsidiary", label: "country" }),
							search.createColumn({ name: "entity" }),
						]
				});
				var resultSet = tmpSearch.run().getRange({ start: 0, end: 200 });

				responseObj.status = true;
				responseObj.message = 'Proceso completado correctamente';
				responseObj.searchSize = resultSet.length;
				if (resultSet.length !== 0) {
					responseObj.entityId = nvl(resultSet[0].getValue({ name: "entity" }), 0);
					responseObj.transferLocation = resultSet[0].getValue({ name: "transferlocation" });
					responseObj.aditional = {
						legalname: resultSet[0].getValue({ name: "legalname" }),
						taxidnum: resultSet[0].getValue({ name: "taxidnum" }),
						zip: resultSet[0].getValue({ name: "zip" }),
						address1: resultSet[0].getValue({ name: "address1" }),
						city: resultSet[0].getValue({ name: "city" }),
						state: resultSet[0].getValue({ name: "state" }),
						address2: resultSet[0].getValue({ name: "address2" }),
						country: resultSet[0].getValue({ name: "country" }),
					}
				}

			} catch (error) {
				responseObj.status = false;
				responseObj.message = 'Error: ' + error.message;
				responseObj.searchSize = '';
				responseObj.entityId = '';
			}
			return responseObj;
		}

		function getSalesOrder(internalid) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Error',
				searchSize: 0,
				entityId: '',
			};
			try {
				var tmpSearch = search.create({
					type: search.Type.SALES_ORDER,
					filters:
						[
							["type", search.Operator.ANYOF, "SalesOrd"],
							"AND",
							["internalid", search.Operator.ANYOF, internalid],
							"AND",
							["mainline", search.Operator.IS, "T"]
						],
					columns:
						[
							search.createColumn({ name: "legalname", join: "subsidiary", label: "10 Legal Name" }),
							search.createColumn({ name: "taxidnum", join: "subsidiary", label: "taxidnum" }),
							search.createColumn({ name: "zip", join: "subsidiary", label: "zip" }),
							search.createColumn({ name: "address1", join: "subsidiary" }),
							search.createColumn({ name: "city", join: "subsidiary" }),
							search.createColumn({ name: "state", join: "subsidiary" }),
							search.createColumn({ name: "address2", join: "subsidiary", label: "address2" }),
							search.createColumn({ name: "country", join: "subsidiary", label: "country" }),
							search.createColumn({ name: "vatregnumber", join: "customer" }),
							search.createColumn({ name: "internalid" }),
							search.createColumn({ name: "tranid" }),
							search.createColumn({ name: "entity" }),
						]
				});
				var resultSet = tmpSearch.run().getRange({ start: 0, end: 200 });

				responseObj.status = STATUS_OK;
				responseObj.message = 'Proceso completado correctamente';
				responseObj.searchSize = resultSet.length;
				if (resultSet.length !== 0) {
					responseObj.entityId = nvl(resultSet[0].getValue({ name: "entity" }), 0);
					responseObj.aditional = {
						legalname: resultSet[0].getValue({ name: "legalname" }),
						taxidnum: resultSet[0].getValue({ name: "taxidnum" }),
						zip: resultSet[0].getValue({ name: "zip" }),
						address1: resultSet[0].getValue({ name: "address1" }),
						city: resultSet[0].getValue({ name: "city" }),
						state: resultSet[0].getValue({ name: "state" }),
						address2: resultSet[0].getValue({ name: "address2" }),
						country: resultSet[0].getValue({ name: "country" })
					}
				}

			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Error: ' + error.message;
				responseObj.searchSize = 0;
				responseObj.entityId = '';
			}
			return responseObj;
		}

		function getVendorReturnAuthorization(internalid) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Error',
				searchSize: 0,
				entityId: '',
			};
			try {
				var tmpSearch = search.create({
					type: search.Type.VENDOR_RETURN_AUTHORIZATION,
					filters:
						[
							["type", search.Operator.ANYOF, "VendAuth"],
							"AND",
							["internalid", search.Operator.ANYOF, internalid],
							"AND",
							["mainline", search.Operator.IS, "T"]
						],
					columns:
						[
							search.createColumn({ name: "legalname", join: "subsidiary", label: "10 Legal Name" }),
							search.createColumn({ name: "taxidnum", join: "subsidiary", label: "taxidnum" }),
							search.createColumn({ name: "zip", join: "subsidiary", label: "zip" }),
							search.createColumn({ name: "address1", join: "subsidiary" }),
							search.createColumn({ name: "city", join: "subsidiary" }),
							search.createColumn({ name: "state", join: "subsidiary" }),
							search.createColumn({ name: "address2", join: "subsidiary", label: "address2" }),
							search.createColumn({ name: "country", join: "subsidiary", label: "country" }),
							search.createColumn({ name: "vatregnumber", join: "customer" }),
							search.createColumn({ name: "internalid" }),
							search.createColumn({ name: "tranid" }),
							search.createColumn({ name: "entity" }),
						]
				});
				var resultSet = tmpSearch.run().getRange({ start: 0, end: 200 });

				responseObj.status = STATUS_OK;
				responseObj.message = 'Proceso completado correctamente';
				responseObj.searchSize = resultSet.length;
				if (resultSet.length !== 0) {
					responseObj.entityId = nvl(resultSet[0].getValue({ name: "entity" }), 0);
					responseObj.aditional = {
						legalname: resultSet[0].getValue({ name: "legalname" }),
						taxidnum: resultSet[0].getValue({ name: "taxidnum" }),
						zip: resultSet[0].getValue({ name: "zip" }),
						address1: resultSet[0].getValue({ name: "address1" }),
						city: resultSet[0].getValue({ name: "city" }),
						state: resultSet[0].getValue({ name: "state" }),
						address2: resultSet[0].getValue({ name: "address2" }),
						country: resultSet[0].getValue({ name: "country" }),
					}
				}

			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Error: ' + error.message;
				responseObj.searchSize = 0;
				responseObj.entityId = '';
			}
			return responseObj;
		}

		function getCustomerAditional(internalid) {
			var responseObj = {
				status: false,
				message: 'Error',
				custAditional: {}
			};
			try {
				var tmpSearch = search.create({
					type: search.Type.ENTITY,
					filters:
						[
							["internalid", search.Operator.ANYOF, internalid],
							"AND",
							["address.isdefaultshipping", "is", "T"],
						],
					columns:
						[
							search.createColumn({ name: "custrecord_pe_cod_ubigeo", join: "Address", label: "PE Cod Ubigeo" }),//0
							search.createColumn({ name: "custrecord_pe_distrito", join: "Address", label: "distrito" }),
							search.createColumn({ name: "custrecord_pe_departamento", join: "Address", label: "departamento" }),
							search.createColumn({ name: "city", join: "Address", label: "city" }),
							search.createColumn({ name: "custrecord_pe_cod_doc_type", join: "custentity_pe_document_type" }),
							search.createColumn({ name: "address1", join: "address", label: " Address 1" }),
							search.createColumn({ name: "custentity_pe_document_number" }),
							search.createColumn({ name: "altname" }),
							search.createColumn({ name: "country" })
						]
				});
				var resultSet = tmpSearch.run().getRange({ start: 0, end: 1 });

				if (resultSet.length !== 0) {
					var aditional = {};
					aditional.altname = resultSet[0].getValue({ name: "altname" });
					aditional.country = resultSet[0].getValue({ name: "country" });
					aditional.documentNumber = resultSet[0].getValue({ name: "custentity_pe_document_number" });
					aditional.documentType = resultSet[0].getValue({ name: "custrecord_pe_cod_doc_type", join: "custentity_pe_document_type" });
					aditional.ubigeo = resultSet[0].getValue({ name: "custrecord_pe_cod_ubigeo", join: "Address", label: "PE Cod Ubigeo" });
					aditional.distrito = resultSet[0].getValue({ name: "custrecord_pe_distrito", join: "Address", label: "distrito" });
					aditional.departamento = resultSet[0].getValue({ name: "custrecord_pe_departamento", join: "Address", label: "departamento" });
					aditional.ciudad = resultSet[0].getValue({ name: "city", join: "Address", label: "city" });
					aditional.address1 = resultSet[0].getValue({ name: "address1", join: "address", label: " Address 1" });

					responseObj.status = true;
					responseObj.message = 'Proceso completado correctamente';
					responseObj.custAditional = aditional
				}

			} catch (error) {
				responseObj.status = false;
				responseObj.message = 'Error: ' + error.message;
			}
			return responseObj;
		}

		function getAllUnitMesureForItemFulfilment() {
			var Items = []
			var datos = search.create({
				type: search.Type.UNITS_TYPE, //"unitstype",
				filters:
					[
						["baseunit", search.Operator.IS, "T"]
					],
				columns:
					[
						search.createColumn({ name: "name", label: "Nombre" }),
						search.createColumn({ name: "abbreviation", label: "Abreviatura" }),
						search.createColumn({ name: "baseunit", label: "Es unidad base" })
					]
			});
			var searchResult = datos.run().getRange({ start: 0, end: 1000 });
			for (var i = 0; i < searchResult.length; i++) {
				Items.push({
					name: searchResult[i].getValue({ name: "name" }),
					abbreviation: searchResult[i].getValue({ name: "abbreviation" }),
					baseUnit: searchResult[i].getValue({ name: "baseunit" })
				})
			}
			return Items;
		}

		function getItem(internalid) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Error',
				item: {}
			};
			try {
				var tmpSearch = search.create({
					type: search.Type.ITEM,
					filters:
						[
							["internalid", 'anyof', internalid],
						],
					columns:
						[

							search.createColumn({ name: "custitem_pe_cod_measure_unit", label: "1.Measure" }),
							search.createColumn({ name: "custitem_pe_measurement_unit", label: "3.Measure" }),


						]
				});
				var resultSet = tmpSearch.run().getRange({ start: 0, end: 1 });

				if (resultSet.length !== 0) {
					responseObj.status = STATUS_OK;
					responseObj.message = 'Proceso completado correctamente';
					responseObj.item = {

						measure: resultSet[0].getValue({ name: "custitem_pe_cod_measure_unit" }),
						description: resultSet[0].getText({ name: "custitem_pe_measurement_unit" }),
					}
				}

			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Error: ' + error.message;
			}
			return responseObj;
		}

		function getRelatedDocument(createFromId) {
			var resultObj = {
				status: false,
				message: 'init',
				data: {}
			}
			try {
				var tmpSearch = search.create({
					type: search.Type.TRANSACTION,
					filters: [
						['type', 'anyof', 'CustInvc'],
						'AND',
						['createdfrom', 'is', createFromId],
						'AND',
						['mainline', 'is', 'T']
					],
					columns: [
						search.createColumn({
							name: 'tranid',
							sort: search.Sort.DESC
						}),
						search.createColumn({
							name: 'custrecord_pe_code_document_type',
							join: 'custbody_pe_document_type',
							label: 'Tipo de Documento'
						}),
						search.createColumn({
							name: 'custrecord_pe_serie_impresion',
							join: 'custbody_pe_serie',
							label: 'Serie'
						}),
						search.createColumn({
							name: 'custbody_pe_number',
							label: 'Numero'
						}),
						search.createColumn({
							name: 'taxidnum',
							join: 'subsidiary',
							label: 'RUC'
						}),
					]
				});

				var latestInvoice = null;
				tmpSearch.run().each(function (result) {
					latestInvoice = {
						tranId: result.getValue({
							name: 'tranid'
						}),
						tipoDoc: result.getValue({
							name: 'custrecord_pe_code_document_type',
							join: 'custbody_pe_document_type'
						}),
						serie: result.getValue({
							name: 'custrecord_pe_serie_impresion',
							join: 'custbody_pe_serie'
						}),
						numero: result.getValue({
							name: 'custbody_pe_number'
						}),
						subsidiary: result.getValue({
							name: 'taxidnum',
							join: 'subsidiary'
						}),
					};
					return false; // solo obtener la primera iteración
				});
				resultObj.status = true;
				resultObj.message = 'Proceso completado correctamente.';
				resultObj.data = latestInvoice;
			} catch (error) {
				resultObj.status = false;
				resultObj.message = error.message
			}
			return resultObj;
		}

		function getVendor(internalId) {
			var response = {
				status: STATUS_ERROR,
				message: 'Init',
				vendor: {}
			}
			try {
				var tmpSearch = search.create({
					type: search.Type.VENDOR,
					filters:
						[
							["internalid", search.Operator.ANYOF, internalId],
							"AND",
							["address.isdefaultshipping", search.Operator.IS, "T"]
						],
					columns:
						[
							search.createColumn({
								name: "custrecord_pe_cod_ubigeo",
								join: "Address",
								label: "PE Cod Ubigeo"
							}),
							search.createColumn({
								name: "custrecord_pe_distrito",
								join: "Address",
								label: "distrito"
							}),
							search.createColumn({
								name: "custrecord_pe_departamento",
								join: "Address",
								label: "departamento"
							}),
							search.createColumn({
								name: "city",
								join: "Address",
								label: "city"
							}),
							search.createColumn({
								name: "address1",
								join: "Address",
								label: " Address 1"
							}),
							search.createColumn({
								name: "formulatext",
								formula: "{custentity_pe_document_number}",
								label: "Fórmula (texto)"
							}),
							search.createColumn({
								name: "formulatext",
								formula: "{altname}",
								label: "Fórmula (texto)"
							}),
							search.createColumn({
								name: "formulatext",
								formula: "{companyname}",
								label: "Fórmula (texto)"
							}),
							search.createColumn({
								name: "formulatext",
								formula: "{custentity_pe_code_document_type}",
								label: "Fórmula (texto)"
							}),
							search.createColumn({
								name: "billcountry",
								label: "billCountry"
							}),
						]
				});

				var resultSet = tmpSearch.run().getRange({ start: 0, end: 1 });

				if (resultSet.length > 0) {
					var columns = resultSet[0].columns;
					var vendorObj = {
						ubigeo: resultSet[0].getValue(columns[0]),
						distrito: resultSet[0].getValue(columns[1]),
						departamento: resultSet[0].getValue(columns[2]),
						city: resultSet[0].getValue(columns[3]),
						address1: resultSet[0].getValue(columns[4]),
						documentNumber: resultSet[0].getValue(columns[5]),
						altName: resultSet[0].getValue(columns[6]),
						companyName: resultSet[0].getValue(columns[7]),
						codeDocumentType: resultSet[0].getValue(columns[8]),
						billCountry: resultSet[0].getValue(columns[9])
					}
					response.status = STATUS_OK;
					response.message = 'Proceso completado correctamente';
					response.vendor = vendorObj;
				}

			} catch (error) {
				response.status = STATUS_ERROR;
				response.message = 'Error: ' + error.message;
			}
			return response;
		}

		function getVendorBill(internalId) {
			var response = {
				status: STATUS_ERROR,
				message: 'Init'
			}
			try {
				var loadRecord = record.load({
					type: record.Type.VENDOR_BILL,
					id: internalId,
					isDynamic: true
				});
				var fechaRef = loadRecord.getValue({ fieldId: 'trandate' });
				var dia = fechaRef.getDate();
				var mes = fechaRef.getMonth() + 1;
				var anio = fechaRef.getFullYear();
				fechaRef = anio + '-' + padLeft(mes, 2, '0') + '-' + padLeft(dia, 2, '0');

				var vendorBillObj = {
					serieRef: loadRecord.getValue({ fieldId: 'custbody_pe_serie_cxp' }),
					correlativoRef: loadRecord.getValue({ fieldId: 'custbody_pe_number' }),
					tipoRef: loadRecord.getValue({ fieldId: 'custbody_pe_document_type' }),
					fechaRef: fechaRef,
					montoTotalRef: loadRecord.getValue({ fieldId: 'usertotal' }),
					// currencyRef: loadRecord.getText({ fieldId: 'currency' }),
					currencyRef: loadRecord.getText({ fieldId: 'currencysymbol' }),
				}

				var openRecordRefTipo = record.load({
					type: 'customrecord_pe_fiscal_document_type',
					id: loadRecord.getValue({ fieldId: 'custbody_pe_document_type' }),
					isDynamic: true
				});

				var recordTipoRef = {
					tipoDocReferencia: openRecordRefTipo.getValue('custrecord_pe_code_document_type'),
				}

				response.status = STATUS_OK;
				response.message = 'Proceso completado correctamente';
				response.vendorBill = vendorBillObj;
				response.tipoDocRef = recordTipoRef;

			} catch (error) {
				response.status = STATUS_ERROR;
				response.message = 'Error: ' + error.message;
			}
			return response;
		}

		function getVendorPayment(transactionNumber) {
			var response = {
				status: STATUS_ERROR,
				message: 'Init',
				vendor: {}
			}
			try {
				var tmpSearch = search.create({
					type: search.Type.VENDOR_PAYMENT,
					filters: [
						['transactionnumber', search.Operator.IS, transactionNumber]
					],
					columns: [
						search.createColumn({ name: 'internalid', label: 'internalid' }),
						search.createColumn({ name: 'total', label: 'total' }),
						search.createColumn({ name: "symbol", join: "Currency", label: "moneda" }),
						search.createColumn({ name: 'trandate', label: 'trandate' }),
					]
				});

				var resultSet = tmpSearch.run().getRange({ start: 0, end: 1 });

				if (resultSet.length !== 0) {
					response.status = STATUS_OK;
					response.message = 'Proceso completado correctamente';
					response.size = resultSet.length;
					response.data = {
						internalid: resultSet[0].getValue({ name: "internalid" }),
						total: resultSet[0].getValue({ name: "total" }),
						moneda: resultSet[0].getValue({ name: "symbol", join: "Currency" }),
						trandate: resultSet[0].getValue({ name: "trandate" }),
					}
				} else {
					response.status = STATUS_OK;
					response.message = 'Proceso completado correctamente';
					response.size = resultSet.length;
					response.data = {
						internalid: '',
						total: '',
						moneda: '',
						trandate: '',
					}
				}

			} catch (error) {
				response.status = STATUS_ERROR;
				response.message = 'Error: ' + error.message;
			}
			return response;
		}

		function getVendorPrepaymentApplication(transactionNumber) {
			var response = {
				status: STATUS_ERROR,
				message: 'Init',
				vendor: {}
			}
			try {
				var tmpSearch = search.create({
					type: search.Type.VENDOR_PREPAYMENT_APPLICATION,
					filters: [
						['transactionnumber', search.Operator.IS, transactionNumber]
					],
					columns: [
						search.createColumn({ name: 'internalid', label: 'internalid' }),
						search.createColumn({ name: 'total', label: 'total' }),
						search.createColumn({ name: "symbol", join: "Currency", label: "moneda" }),
						search.createColumn({ name: 'trandate', label: 'trandate' }),
					]
				});

				var resultSet = tmpSearch.run().getRange({ start: 0, end: 1 });
				if (resultSet.length !== 0) {
					response.status = STATUS_OK;
					response.message = 'Proceso completado correctamente';
					response.size = resultSet.length;
					response.data = {
						internalid: resultSet[0].getValue({ name: "internalid" }),
						total: resultSet[0].getValue({ name: "total" }),
						moneda: resultSet[0].getValue({ name: "symbol", join: "Currency" }),
						trandate: resultSet[0].getText({ name: "trandate" }),
					}
				} else {
					response.status = STATUS_OK;
					response.message = 'Proceso completado correctamente';
					response.size = resultSet.length;
					response.data = {
						internalid: '',
						total: '',
						moneda: '',
						trandate: ''
					}
				}

			} catch (error) {
				response.status = STATUS_ERROR;
				response.message = 'Error: ' + error.message;
			}
			return response;
		}

		function updateRecordField(transTypeCode, internalid, ticket, fileId) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Init'
			}
			try {
				var recordType = '';
				switch (transTypeCode) {
					case FACTURA:
					case BOLETA:
						recordType = record.Type.INVOICE;
						break;

					case NOTA_CREDITO:
						recordType = record.Type.CREDIT_MEMO;
						break;

					case GUIA_REMISION:
						recordType = record.Type.ITEM_FULFILLMENT;
						break;
					default:
						break;
				}
				var tmpVar = {
					internalid: internalid,
					ticket: ticket,
					fileId: fileId,
				}
				log.debug('updateRecordField', tmpVar);
				var updateDoc = record.submitFields({
					type: recordType,
					id: internalid,
					values: {
						'custbody_pe_ei_printed_xml_req': fileId,
						'custbody_pe_fe_ticket_id': ticket
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields: true
					}
				});
				responseObj.status = STATUS_OK;
				responseObj.message = 'Proceso completado correctamente.';
			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'updateRecordField: ' + error.message;
			}
			return responseObj;
		}

		// FUNCIONES PARA GENERAR JSON
		function addNote(jsonObject, value, languageID) {
			if (value) {
				jsonObject.Note.push({ "_": value, "languageID": languageID });
			}
		}

		function generateHeader(numeracion, fechaEmision, montoDescuento) {
			var header = {};
			if (montoDescuento) {
				header.UBLExtensions = [
					{
						"UBLExtension": [
							{
								"ExtensionContent": [
									{
										"TotalDiscount": [
											{
												"_": montoDescuento
											}
										]
									}
								]
							}
						]
					}
				];
			}
			header.UBLVersionID = [
				{
					"_": "2.1"
				}
			];
			header.CustomizationID = [
				{
					"_": "2.0"
				}
			];
			header.ID = [
				{
					"_": numeracion
				}
			];
			header.IssueDate = [
				{
					"_": fechaEmision
				}
			];
			header.IssueTime = [
				{
					"_": "00:00:00"
				}
			];
			return header;
		}

		function generateDueDate(column32) {
			var duedate = {
				"DueDate": [
					{
						"_": column32
					}
				]
			}
			return duedate;
		}

		function generateInvoiceTypeCode(codTipoDocumento, tipodedoc) {
			var InvoiceTypeCode = {
				"InvoiceTypeCode": [
					{
						"_": codTipoDocumento,
						"listName": "Tipo de Documento",
						"listSchemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51",
						"listID": tipodedoc,
						"name": "Tipo de Operacion",
						"listURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01",
						"listAgencyName": "PE:SUNAT"
					}
				]
			}
			return InvoiceTypeCode
		}

		function TaxableAmount(totalVentas, currency, TaxAmount, TaxScheme, taxcheme, TaxTypeCode, apliccaanticipo, anticipotaxtotal, anticiposubtotal) {
			var primeraParte = {
				"TaxableAmount": [
					{
						"_": apliccaanticipo != 0 ? totalVentas : (parseFloat(totalVentas) - parseFloat(anticiposubtotal)).toFixed(2),
						"currencyID": currency
					}
				],
				"TaxAmount": [
					{
						"_": apliccaanticipo != 0 ? TaxAmount : (parseFloat(TaxAmount) - parseFloat(anticipotaxtotal)).toFixed(2),
						"currencyID": currency
					}
				],
				"TaxCategory": [
					{
						"TaxScheme": [
							{
								"ID": [
									{
										"_": TaxScheme,
										"schemeName": "Codigo de tributos",
										"schemeURI": "urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05",
										"schemeAgencyName": "PE:SUNAT"
									}
								],
								"Name": [
									{
										"_": taxcheme
									}
								],
								"TaxTypeCode": [
									{
										"_": TaxTypeCode
									}
								]
							}
						]
					}
				]
			}
			if (TaxScheme == "9996") primeraParte.TaxAmount[0]._ = "0.0"

			return primeraParte;
		}

		function fusionarObjetos(obj1, obj2) {
			var resultado = {};
			// Copiar las propiedades del primer objeto
			for (var clave1 in obj1) {
				if (obj1.hasOwnProperty(clave1)) {
					resultado[clave1] = obj1[clave1];
				}
			}
			// Copiar las propiedades del segundo objeto, sobrescribiendo las existentes
			for (var clave2 in obj2) {
				if (obj2.hasOwnProperty(clave2)) {
					resultado[clave2] = obj2[clave2];
				}
			}
			return resultado;
		}

		function saveJsonFile(fileName, content) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Init'
			}
			try {
				var folder = '';
				var tmpSearch = search.create({
					type: search.Type.FOLDER,
					filters:
						[
							["name", search.Operator.IS, 'Docs'],
						],
					columns:
						[
							search.createColumn({ name: "internalid", label: "0.InternalId" }),
						]
				});
				var resultSet = tmpSearch.run().getRange({ start: 0, end: 50 });

				if (resultSet === '' || resultSet === null) {
					var tmpfolder = search.create({
						type: search.Type.FOLDER,
						columns: [
							search.createColumn({ name: "internalid", label: "0.InternalId" }),
						],
						filters: [
							["name", search.Operator.IS, 'TS NET Scripts']
						]
					});
					var objResultfolder = tmpfolder.run().getRange(0, 50);
					var varRecordFolder = record.create({
						type: 'folder'
					});
					varRecordFolder.setValue('name', 'Docs');
					varRecordFolder.setValue('parent', objResultfolder[0].getValue('internalid'));
					folder = varRecordFolder.save();
				} else {
					folder = resultSet[0].getValue('internalid')
				}
				log.debug('folder: ' + folder);
				var fileObj = file.create({
					name: fileName + '.json',
					fileType: file.Type.JSON,
					contents: JSON.stringify(content),
					folder: folder,
					isOnline: true
				});
				var fileId = fileObj.save();

				responseObj.status = STATUS_OK;
				responseObj.message = 'OK';
				responseObj.fileId = fileId;

			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Error: ' + error.message;
			}
			return responseObj;
		}

		// NUMBER TO WORDS
		function NumberToWordsConverter() {
			var arrUnit = [
				"Uno", "Un", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Cero",
				"Once", "Doce", "Trece", "Catorce", "Quince", "Dieciseis", "Diecisiete", "Dieciocho", "Diecinueve"
			];
			var arrTens = [
				"", "Diez", "Veinte", "Treinta", "Cuarenta", "Cincuenta", "Sesenta", "Setenta", "Ochenta", "Noventa"
			];
			var arrHundreds = [
				"Cien", "Ciento", "Doscientos", "Trescientos", "Cuatrocientos", "Quinientos", "Seiscientos", "Setecientos", "Ochocientos", "Novecientos"
			];
			var arrThousands = ["Mil", "Millon", "Billon"];
			var vvSpace = " ";

			function numberToWords(pnNumber, pnParam) {
				var vnNumber = Math.abs(pnNumber);
				var vvText = "";

				if (vnNumber === 100) {
					vvText = arrHundreds[0];
				} else {
					var vnCurrent = Math.floor(vnNumber / 100);
					vnNumber -= vnCurrent * 100;

					if (vnCurrent !== 0) {
						vvText = arrHundreds[vnCurrent];
					}

					if (vnNumber > 10 && vnNumber < 20) {
						vnCurrent = Math.floor(vnNumber);
						vvText += vvSpace + (vnCurrent === 10 ? arrTens[1] : arrUnit[vnCurrent]);
					} else {
						vnCurrent = Math.floor(vnNumber / 10);
						vnNumber -= vnCurrent * 10;

						if (vnCurrent !== 0) {
							vvText += vvSpace + arrTens[vnCurrent];
						}

						vnCurrent = Math.floor(vnNumber);
						if (vnCurrent !== 0) {
							vvText += vvSpace + (vnCurrent === 1 && pnParam === 1 ? arrUnit[1] : arrUnit[vnCurrent]);
						}
					}
				}

				return vvText;
			}

			function amountToWords(pnNumber) {
				var vnNumber = Math.abs(pnNumber);
				var vvText = "";

				if (vnNumber === 0) {
					vvText = vvSpace + arrUnit[10];
				} else {
					var vnCurrent = Math.floor(vnNumber / 1e9);
					vnNumber -= vnCurrent * 1e9;

					if (vnCurrent !== 0) {
						vvText += numberToWords(vnCurrent, 0) + vvSpace + arrThousands[2] + vvSpace;
					}

					vnCurrent = Math.floor(vnNumber / 1e6);
					vnNumber -= vnCurrent * 1e6;

					if (vnCurrent !== 0) {
						vvText += numberToWords(vnCurrent, 0) + vvSpace + arrThousands[1] + vvSpace;
						if (vnCurrent === 1) {
							vvText += "es";
						}
					}

					vnCurrent = Math.floor(vnNumber / 1e3);
					vnNumber -= vnCurrent * 1e3;

					if (vnCurrent !== 0) {
						vvText += numberToWords(vnCurrent, 0) + vvSpace + arrThousands[0] + vvSpace;
					}

					if (vnNumber !== 120) {
						vvText += numberToWords(vnNumber, 1);
					}
				}

				return vvText;
			}

			function padStart(value, length, padding) {
				var pad = new Array(length + 1).join(padding || '0');
				return pad.substring(0, pad.length - value.length) + value;
			}

			function convertNumberToWords(pnAmount, pvMoneda) {
				var vnNumber = pnAmount;
				var vvText = amountToWords(vnNumber);
				var vvDecimalText = (Math.round((vnNumber % 1) * 100)).toString(); // .padStart(2, '0') + "/100";
				vvDecimalText = padStart(vvDecimalText, 2, '0') + "/100";
				var vvWith = "CON";
				var vvMoneda = pvMoneda === "PEN" ? "SOLES" : pvMoneda === "USD" ? "DOLARES" : "";

				vvText = vvText + vvSpace + vvWith + vvSpace + vvDecimalText + vvSpace + vvMoneda;

				return vvText.trim();
			}

			return {
				convertNumberToWords: convertNumberToWords
			};
		}

		//<I> Funciones Utils
		function createRequest(ruc, tipoDocumento, numeracion, jsonBody, internalId) {
			var responseObj = {
				status: STATUS_ERROR,
				message: 'Init',
			}
			try {
				var paramNames = ['ruc', 'tipoDocumento', 'numeracion', 'jsonBody', 'internalId'];
				var options = parseArguments(arguments, paramNames);

				var fileName = options.ruc + '-' + options.tipoDocumento + '-' + options.numeracion;
				var ticket = options.tipoDocumento + '-' + options.numeracion;

				var fileObj = saveJsonFile(fileName, options.jsonBody);

				if (fileObj.status === STATUS_ERROR) {
					responseObj.status = STATUS_ERROR;
					responseObj.message = 'Error: ' + fileObj.message;
					return responseObj;
				}

				updateRecordField(options.tipoDocumento, options.internalId, ticket, fileObj.fileId);

				responseObj.status = STATUS_OK;
				responseObj.message = 'Proceso completado correctamente.';
				responseObj.details = 'Transaccion generada correctamente. Ticket :' + ticket;
			} catch (error) {
				responseObj.status = STATUS_ERROR;
				responseObj.message = 'Save Request - ' + error.message;
			}
			return responseObj;
		}

		function padLeft(value, length, padChar) {
			value = value.toString();
			padChar = padChar || '0';
			while (value.length < length) {
				value = padChar + value;
			}
			return value;
		}

		function shouldAddToJson(column43, isDonation) {
			return !(column43 || isDonation);
		}

		function getItemDescription(description, taxCode, cuponCode) {
			var value = '';
			try {
				if (taxCode === 'TTG_PE:TTG') {
					value = description + ' - BONIFICACIÓN';
					if (isValid(cuponCode)) {
						value = value + ' - ' + cuponCode;
					}
				} else {
					value = description;
				}

			} catch (error) {
				value = description;
			}
			return value;
		}

		function nvl(value, defaultValue) {
			return (value !== null && value !== undefined && value !== '') ? value : defaultValue;
		}

		function formatDate(fecha) {
			if (fecha) {
				var partes = fecha.split('/');
				return partes[2] + '-' + padLeft(partes[0], 2, '0') + '-' + padLeft(partes[1], 2, '0');
			} else {
				return '';
			}
		}

		function isValid(value) {
			return value !== null && value !== undefined && value !== '';
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
			createInvoiceRequest: createInvoiceRequest,
			createCreditMemoRequest: createCreditMemoRequest,
			createItemFulfillmentRequest: createItemFulfillmentRequest,
			createVendorCreditRequest: createVendorCreditRequest
		}
	}
);
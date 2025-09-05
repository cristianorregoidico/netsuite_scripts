/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * Version  Date            	Author          		Details
 * 1.0      25/04/2025    	Cristian Orrego    	    Initial version		
 */
define(['N/ui/message', 'N/record', 'N/log', 'N/ui/dialog'], function(message, record, log, dialog) {
    function saveRecord(context) {
        // Define the validation start date (format: YYYY-MM-DD)
        var validationStartDate = '2025-04-25';

        var currentRecord = context.currentRecord;
        
        // Get the customer ID from the transaction
        var customerId = currentRecord.getValue({
            fieldId: 'entity'
        });

        // Get the company name of the customer
        var companyName = currentRecord.getText({
            fieldId: 'entity'
        });

        // Get the creation date of the transaction
        var createdDate = currentRecord.getValue({
            fieldId: 'createddate'
        });

        // Este total no incluye taxes
        var total = currentRecord.getValue({
            fieldId: 'total'
        });
        log.debug("total", total)
        

        // Convert dates to Date objects for comparison
        var createdDateObj = new Date(createdDate);
        var validationStartDateObj = new Date(validationStartDate);

        // Only validate if the transaction was created after the validation start date
        if (createdDateObj >= validationStartDateObj) {
            // Validate if the customer is an especial customer
            var isEspecialCustomer = validateCustomer(customerId);
            
            // Log the result for debugging
            log.debug('Customer Validation', 'Customer ID: ' + customerId + ', Company Name: ' + companyName + ', Is Especial Customer: ' + isEspecialCustomer + ', Created Date: ' + createdDate);
            if(isEspecialCustomer) {
                return true
            }
            var alertOptions = {
                title: 'Cliente de la transaccion',
                message: "ID: " + customerId + " Company Name: " + companyName
            };
            dialog.alert(alertOptions);
            return false
        } else {
            dialog.alert({
                title: "No se validara por fecha",
                message: "Transaccion creada en: " + createdDate 
            });
            log.debug('Validation Skipped', 'Transaction created before validation start date: ' + createdDate);
            return true
        }
    }

    function validateCustomer(customerId){
        //EspecialCustomers pueden tener un GM menor a 15%
        var especial_customer_ids = [14161]
        //Valida si el cliente de la transaccion es un EspecialCustomer
        var isEspecialCustomer = especial_customer_ids.includes(Number(customerId))

        return isEspecialCustomer
    }

    return {
        saveRecord: saveRecord
    };
});
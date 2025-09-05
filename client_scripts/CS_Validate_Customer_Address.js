/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @Author Cristian Orrego
 * @Description Validate if a customer has at least one address, if no, send a notification to the operations center
 */
define(['N/https', 'N/search', 'N/ui/message', 'N/log'], function(https, search, message, log) {

    function saveRecord(context) {
        var currentRecord = context.currentRecord;

        // Get the customer ID from the Sales Order
        var customerId = currentRecord.getValue({ fieldId: 'entity' });
        log.debug("customerId", customerId)
        var customerName = currentRecord.getText({ fieldId: 'entity' }); 
        log.debug("customerName", customerName)
        if (!customerId) {
            alert('Please select a customer before saving.');
            return false;
        }

        // Look up the customer's addressbook
        var addressSearch = search.create({
            type: 'customer',
            filters: [
                ['internalid', 'anyof', customerId]
            ],
            columns: ['address']
        });
        var addressSearchResults = addressSearch.run().getRange({
            start:0,
            end:10
        })
        var customerAddresses = []
        addressSearchResults.forEach(function(result) {
            // Extract data from search result
            var currentAddress = result.getValue({ name: 'address' });
            if(currentAddress != ""){
                customerAddresses.push(currentAddress);
            }
        });
        log.debug("customerAddresses", customerAddresses)
        // addressbook will be an array of objects; if it's empty, no addresses exist
        //var hasAddresses = customerData.addressbook && customerData.addressbook.length > 0;
        //log.debug("hasAddresses", hasAddresses)
        if (customerAddresses.length === 0) {
            alert('The selected customer does not have any addresses. A notification will be sent to the Operations Center.');
            var requestBody = JSON.stringify({
                customer_id: customerId,
                customer_name: customerName
            }); 
            var response = https.post({
                url: 'https://prod-06.westus.logic.azure.com:443/workflows/1c1e0d857e64424991f2d7628737460e/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ad7f6yZfzEW7b3Mq2bx8i2vGjHSvVXCmGNjVzxcYdXE', 
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody
            });  
          //return false; // Prevent save
        }
     

        return true; // Allow save
    }

    return {
        saveRecord: saveRecord
    };
});

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/file', 'N/log'], function(search, record, file, log) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var recordId = context.request.parameters.recordId;
            var messageId = context.request.parameters.messageId || null;
            log.debug("po_id", recordId)

            if (!recordId)  {
                log.debug("Missing recordId")
                context.response.status = 400;
                context.response.write(JSON.stringify({ success: false, message: 'Missing recordId' }));
                return;
            }

            try {
                log.debug('Loading Saved Search');
                // Load existing saved search
                var savedSearch = search.load({
                    id: 'customsearch_get_message_attach_exp' 
                });
                
                savedSearch.filters.push(
                    search.createFilter({
                        name: 'internalid',
                        join: 'transaction',
                        operator: search.Operator.ANYOF,
                        values: recordId
                    })
                );
                if (messageId) {
                    savedSearch.filters.push(
                        search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.ANYOF,
                            values: messageId
                        })
                    );
                }
                log.debug('Filters Added', savedSearch.filters);
                
                var results = [];
                //var pagedData = savedSearch.runPaged({ pageSize: 1000 });
                var searchResults = savedSearch.run().getRange({
                    start: 0,
                    end: 10 // adjust this number based on your requirement
                });
                log.debug('Search Results', searchResults);
                
                searchResults.forEach(function(result) {
                    var vendor = result.getText({ name: 'entity', join: 'transaction' })
                    const isVendorValid = /^(?!CUS[0-9])/.test(vendor);
                    if (isVendorValid){
                    results.push({
                      internalid: result.id, // This is correct, as result.id works for the record ID.
                      tranid: result.getValue({ name: 'tranid', join: 'transaction' }),
                      trandate: result.getValue({ name: 'trandate', join: 'transaction' }),
                      vendor: result.getText({ name: 'entity', join: 'transaction' }),
                      po_status: result.getText({ name: 'statusref', join: 'transaction' }),
                      expediting_status: result.getText({ name: 'custbody_evol_expediting_status', join: 'transaction' }),
                      messagedate: result.getValue({ name: 'messagedate'}),
                      author: result.getText({ name: 'author' }),
                      subject: result.getValue({ name: 'subject' }),
                      message: result.getValue({ name: 'message'})
                    });}
                });

                

                context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
                context.response.write(JSON.stringify({ success: true, transaction_id: recordId, results: results }));

            } catch (e) {
                log.debug('Processing Error', e.message);
                context.response.status = 500;
                context.response.write(JSON.stringify({ success: false, message: e.message }));
            }
        } else {
            context.response.write('Use GET method with parameters recordId and recordType');
        }
    }

    return {
        onRequest: onRequest
    };
});

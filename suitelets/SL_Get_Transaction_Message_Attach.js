/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/file', 'N/log'], function(search, record, file, log) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var recordId = context.request.parameters.recordId;
            log.debug("po_id", recordId)

            if (!recordId) {
                log.debug("Missing recordId")
                context.response.status = 400;
                context.response.write(JSON.stringify({ success: false, message: 'Missing recordId' }));
                return;
            }

            try {
                log.debug('Loading Saved Search');
                // Load existing saved search
                var savedSearch = search.load({
                    id: 'customsearch_get_message_attach' 
                });
                
                savedSearch.filters.push(
                    search.createFilter({
                        name: 'internalid',
                        join: 'transaction',
                        operator: search.Operator.ANYOF,
                        values: recordId
                    })
                );
                log.debug('Filters Added', savedSearch.filters);
                
                var results = [];
                //var pagedData = savedSearch.runPaged({ pageSize: 1000 });
                var searchResults = savedSearch.run().getRange({
                    start: 0,
                    end: 10 // adjust this number based on your requirement
                });
                log.debug('Search Results', searchResults);
                
                searchResults.forEach(function(result) {
                    results.push({
                      internalid: result.id, // This is correct, as result.id works for the record ID.
                      tranid: result.getValue({ name: 'tranid', join: 'transaction' }),
                      author: result.getText({ name: 'author' }),
                      subject: result.getValue({ name: 'subject' }),
                      attachmentsInternalId: result.getValue({ name: 'internalid', join: 'attachments' }),
                      attachmentsName: result.getValue({ name: 'name', join: 'attachments' }),
                      attachmentsUrl: result.getValue({ name: 'url', join: 'attachments' })
                    });
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

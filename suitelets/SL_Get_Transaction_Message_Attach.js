/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/file', 'N/log'], function(search, record, file, log) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var recordId = context.request.parameters.recordId;
            var recordType = context.request.parameters.recordType;

            if (!recordId || !recordType) {
                log.debug("Missing recordId or recordType")
                context.response.status = 400;
                context.response.write(JSON.stringify({ success: false, message: 'Missing recordId or recordType' }));
                return;
            }

            try {
                log.debug('Loading Saved Search');
                // Load existing saved search
                var savedSearch = search.load({
                    id: 'customsearch_get_message_attach' 
                });
                // Add filter dynamically (example: filter by transaction number)
                // savedSearch.filters.push(
                //     search.createFilter({
                //         name: 'type',
                //         join: 'transaction',
                //         operator: search.Operator.ANYOF,
                //         values: recordType
                //     })
                // );
                // savedSearch.filters.push(
                //     search.createFilter({
                //         name: 'internalid',
                //         join: 'transaction',
                //         operator: search.Operator.ANYOF,
                //         values: recordId
                //     })
                // );
                // log.debug('Filters Added', savedSearch.filters);
                var result = {
                    recordId: recordId,
                    attachments: []
                };
                
                var results = [];
                //var pagedData = savedSearch.runPaged({ pageSize: 1000 });
                var searchResults = savedSearch.run().getRange({
                    start: 0,
                    end: 10 // adjust this number based on your requirement
                });
                log.debug('Search Results', searchResults);
                // pagedData.pageRanges.forEach(function (pageRange) {
                //     var page = pagedData.fetch({ index: pageRange.index });
                //     page.data.forEach(function (result) {
                //         results.push({
                //             internalid: result.id,
                //             tranid: result.getValue({ name: 'tr_number' }),
                //             author: result.getText({ name: 'author' }),
                //             subject: result.getValue({ name: 'subject' }),
                //             attachments: result.getValue({ name: 'attachments' })
                //         });
                //     });
                // });
                searchResults.forEach(function(result) {
                    // Extract data from search result
                    results.push({
                        internalid: result.id,
                        tranid: result.getValue({ name: 'tr_nu' }),
                        author: result.getText({ name: 'author' }),
                        subject: result.getValue({ name: 'subject' }),
                        attachments: result.getValue({ name: 'attachments' })
                    });
                });

                

                context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
                context.response.write(JSON.stringify({ success: true, data: result, results: results }));

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

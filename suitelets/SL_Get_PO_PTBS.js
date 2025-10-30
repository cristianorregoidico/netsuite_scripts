/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/log'], function (search, log) {
  function onRequest(context) {
    if (context.request.method === 'GET') {
      try {
        log.debug('Loading Saved Search');

        var savedSearch = search.load({
          id: 'customsearch_system_node_po_notify',
        });

        var searchResults = savedSearch.run().getRange({
          start: 0,
          end: 1000,
        });

        log.debug('Search Results Count', searchResults.length);
        log.debug('Search Results ', searchResults);

        var groupedResults = {};

        searchResults.forEach(function (result) {
          var salesRepId = result.getValue({
            name: 'salesrep',
            join: 'createdfrom',
          });
          var salesRepText = result.getText({
            name: 'salesrep',
            join: 'createdfrom',
          });

          // Normalizar claves vacías (opcional)
          if (!salesRepId) salesRepId = 'NO_SALESREP';

          var orderId = result.id;
          var tranid = result.getValue({ name: 'tranid' });
          var status = result.getText({ name: 'statusref' });
          var expStatus = result.getText({ name: 'custbody_evol_expediting_status'});
          var daysInStatus = result.getValue({name: 'formuladate'});
          var lastDateModified = result.getValue({
            name: 'date',
            join: 'systemnotes',
          });

          if (!groupedResults[salesRepId]) {
            groupedResults[salesRepId] = {
              salesRepId: salesRepId,
              salesRepName: salesRepText || null,
              ordenes: [],
              totalOrdenes: 0,
            };
          }

          groupedResults[salesRepId].ordenes.push({
            orderId: orderId,
            tranid: tranid,
            status: status,
            expeditingStatus: expStatus,
            daysInStatus: daysInStatus,
            lastDateModified: lastDateModified,
          });

          groupedResults[salesRepId].totalOrdenes += 1;
        });

        // Convertir objeto a array sin usar Object.values()
        var finalResults = [];
        for (var key in groupedResults) {
          if (groupedResults.hasOwnProperty(key)) {
            finalResults.push(groupedResults[key]);
          }
        }

        log.debug('Grouped Results Prepared', finalResults);

        context.response.setHeader({
          name: 'Content-Type',
          value: 'application/json',
        });
        context.response.write(
          JSON.stringify({ success: true, results: finalResults })
        );
      } catch (e) {
        log.error('Processing Error', e.message || e);
        context.response.status = 500;
        context.response.write(
          JSON.stringify({ success: false, message: e.message || String(e) })
        );
      }
    } else {
      context.response.write('Use GET method to execute this Suitelet search.');
    }
  }

  return {
    onRequest: onRequest,
  };
});

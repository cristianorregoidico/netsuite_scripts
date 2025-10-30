/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @Author Cristian Orrego
 * @Description Suitelet para obtener Sales Tax Liability By Tax Agency Miami
 */
define(['N/search', 'N/log'], function (search, log) {

  function onRequest(context) {
    try {
      var savedSearch = search.load({ id: 'customsearch833' });
      var searchResults = savedSearch.run().getRange({ start: 0, end: 1000 });

      log.debug('Search Results Count', searchResults.length);
      var results = [];

      searchResults.forEach(function (result, i) {
        var cols = result.columns;
        var values = {};

        cols.forEach(function (col) {
          var key = '';
          if (col.summary) {
            key = col.summary + '(' + (col.join ? col.join + '.' : '') + col.name + ')';
          } else {
            key = col.name;
          }

          var textVal = null;
          var rawVal = null;
          try { textVal = result.getText(col); } catch (e) {}
          try { rawVal = result.getValue(col); } catch (e) {}

          if (textVal) {
            values[key] = [{ value: rawVal, text: textVal }];
          } else {
            values[key] = rawVal;
          }
        });

        // 🔍 Puedes ver qué llaves tiene cada fila
        if (i === 0) log.debug('Keys detected', Object.keys(values));

        // Ahora extraemos los valores que nos interesan
        var postingPeriod = getTextValue(values['GROUP(postingperiod)']);
        var type = getTextValue(values['GROUP(type)']);
        var sumAmount = parseNumber(values['SUM(amount)']);
        var sumAmount1 = parseNumber(values['SUM(amount)_1']);
        var sumTaxAmount = parseNumber(values['SUM(taxamount)']);
        var sumTaxDetailAmount = parseNumber(values['SUM(taxDetail.taxamount)']);

        results.push({
          postingPeriod: postingPeriod,
          type: type,
          grossSales: sumAmount,
          exemptSales: sumAmount1,
          taxbleSales: sumTaxAmount,
          taxTotal: sumTaxDetailAmount
        });
      });

      context.response.setHeader({
        name: 'Content-Type',
        value: 'application/json'
      });
      context.response.write(JSON.stringify({ success: true, results: results }));

    } catch (e) {
      log.error('Processing Error', e.message || e);
      context.response.status = 500;
      context.response.write(JSON.stringify({ success: false, message: e.message || String(e) }));
    }
  }

  function getTextValue(value) {
    if (!value) return null;
    if (Array.isArray(value) && value[0]) return value[0].text || value[0].value || null;
    if (typeof value === 'object') return value.text || value.value || null;
    return value;
  }

  function parseNumber(v) {
    if (!v || v === '.00' || v === '.') return 0;
    var n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }

  return { onRequest: onRequest };
});

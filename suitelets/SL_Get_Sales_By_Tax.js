/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @Author Cristian Orrego
 * @Description Suitelet para obtener ventas agrupadas por impuesto
 */
define(['N/search', 'N/log'], function (search, log) {
  function onRequest(context) {
    if (context.request.method === 'GET') {
      try {
        log.debug('Loading Saved Search');
        var dates = parseDatesFromRequest(context);
        log.debug('Received dates', dates);
        var savedSearch = search.load({
          id: 'customsearch528',
        });
        if (dates.fromDate && dates.toDate) {
        try {
          var dateFilter = search.createFilter({
            name: 'trandate',
            operator: search.Operator.WITHIN,
            values: [dates.fromDate, dates.toDate]
          });

          // Asegurarnos de no romper si savedSearch.filters es null
          var existingFilters = savedSearch.filters || [];
          // Crear nueva copia de filtros para asignar (evita mutaciones indeseadas)
          var newFilters = existingFilters.slice();
          newFilters.push(dateFilter);

          savedSearch.filters = newFilters;
          log.debug('Date filter applied', { from: dates.fromDate, to: dates.toDate });
        } catch (fErr) {
          log.error('Error creating/applying date filter', fErr);
          // No abortamos; la búsqueda se ejecutará sin filtro si falla
        }
      } else {
        log.debug('No date filter provided, running saved search as-is');
      }
        var searchResults = savedSearch.run().getRange({
          start: 0,
          end: 1000,
        });

        log.debug('Search Results Count', searchResults.length);
        log.debug('Search Results ', searchResults);
        var results = [];
        searchResults.forEach(function (result) {
          // Si existe result.values y contiene los keys esperados, lo usamos.
          var values = result.values;
          log.debug('Result Values', values);

          // Si no existe result.values (o es undefined), reconstruimos un mapa seguro
          if (!values) {
            values = {};
            var cols = result.columns || [];
            for (var i = 0; i < cols.length; i++) {
              var col = cols[i];
              // Construimos una key similar a la que devuelve result.values para GROUP/SUM
              var key = '';
              if (col.summary) {
                // ej: "GROUP(taxDetail.taxcode)" o "SUM(formulacurrency)"
                key = col.summary + '(' + (col.join ? col.join + '.' : '') + col.name + ')';
              } else {
                key = col.name;
              }

              // intentamos obtener texto (para etiquetas) y valor
              try {
                var textVal = result.getText(col);
              } catch (errT) {
                textVal = null;
              }
              var rawVal;
              try {
                rawVal = result.getValue(col);
              } catch (errV) {
                rawVal = null;
              }

              // Si getText devuelve algo significativo para listas, lo preferimos como objeto similar al array que antes veías
              if (textVal !== null && textVal !== undefined && textVal !== '') {
                // Mantenemos consistencia con la estructura previa (array con objeto {value, text})
                values[key] = [{ value: rawVal, text: textVal }];
              } else {
                // Para fechas y SUMs queda el valor plano
                values[key] = rawVal;
              }
            }
          }

          // Ahora accedemos con seguridad, contemplando ambos formatos
          var taxCode = null;
          if (values['GROUP(taxDetail.taxcode)']) {
            var v = values['GROUP(taxDetail.taxcode)'];
            if (Array.isArray(v) && v[0]) taxCode = v[0].text || v[0].value || null;
            else taxCode = v.text || v.value || v || null;
          }

          var trandate = values['GROUP(trandate)'] || null;

          var customer = null;
          if (values['GROUP(mainname)']) {
            var cm = values['GROUP(mainname)'];
            if (Array.isArray(cm) && cm[0]) customer = cm[0].text || cm[0].value || null;
            else customer = cm.text || cm.value || cm || null;
          }

          var tranid = values['GROUP(tranid)'] || null;

          var type = null;
          if (values['GROUP(type)']) {
            var tp = values['GROUP(type)'];
            if (Array.isArray(tp) && tp[0]) type = tp[0].text || tp[0].value || null;
            else type = tp.text || tp.value || tp || null;
          }

         var totalNetRaw = 0;
var totalTaxRaw = 0;
var totalAmountRaw = 0;

// obtener las columnas de la búsqueda
var columns = result.columns;

columns.forEach(function (col) {
  var label = col.label || '';
  var value = result.getValue(col) || 0;

  switch (label) {
    case 'Net Amount':
      totalNetRaw = parseFloat(value) || 0;
      break;
    case 'Tax Amount':
      totalTaxRaw = parseFloat(value) || 0;
      break;
    case 'Amount':
      totalAmountRaw = parseFloat(value) || 0;
      break;
  }
});

log.debug('Detected Totals', {
  totalNetRaw: totalNetRaw,
  totalTaxRaw: totalTaxRaw,
  totalAmountRaw: totalAmountRaw
});

          results.push({
            taxCode: taxCode,
            date: trandate,
            customer: customer,
            tranid: tranid,
            type: type,
            netAmount: (totalNetRaw !== null && totalNetRaw !== '') ? parseFloat(totalNetRaw) : 0,
            taxAmount: (totalTaxRaw !== null && totalTaxRaw !== '') ? parseFloat(totalTaxRaw) : 0,
            totalAmount: (totalAmountRaw !== null && totalAmountRaw !== '') ? parseFloat(totalAmountRaw) : 0
          });
        });

        log.debug('Processed Results', results);

        context.response.write(
          JSON.stringify({ success: true, results: results })
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
function parseDatesFromRequest(context) {
  var fromDate = null;
  var toDate = null;

  var params = context.request.parameters || {};
  fromDate = params.from || null;
  toDate = params.to || null;

  // Normalizar: quitar espacios
  if (fromDate && typeof fromDate === 'string') fromDate = fromDate.trim();
  if (toDate && typeof toDate === 'string') toDate = toDate.trim();

  /**
   * Convierte fechas del formato "YYYY-MM-DD" a "MM/DD/YYYY" si aplica.
   * NetSuite requiere formato M/D/YYYY.
   */
  function normalizeDateFormat(dateStr) {
    if (!dateStr) return null;

    // Detecta si viene en formato ISO (YYYY-MM-DD)
    var isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoPattern.test(dateStr)) {
      var parts = dateStr.split('-');
      return parts[1] + '/' + parts[2] + '/' + parts[0]; // MM/DD/YYYY
    }

    // Si ya viene en formato válido (M/D/YYYY o MM/DD/YYYY), lo deja igual
    var nsPattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (nsPattern.test(dateStr)) {
      return dateStr;
    }

    // Si no coincide con ningún patrón, lanza error controlado
    throw new Error('Invalid date format: ' + dateStr + ' (expected YYYY-MM-DD or MM/DD/YYYY)');
  }

  try {
    fromDate = normalizeDateFormat(fromDate);
    toDate = normalizeDateFormat(toDate);
  } catch (e) {
    log.error('Date Parse Error', e.message);
    throw e;
  }

  return { fromDate: fromDate || null, toDate: toDate || null };
}

  return {
    onRequest: onRequest,
  };
});
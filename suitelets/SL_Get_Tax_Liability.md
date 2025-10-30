# SL_Get_Tax_Liability - Documentación

Descripción
-----------
Suitelet `SL_Get_Tax_Liability.js` (NApiVersion 2.x) que carga una Saved Search (id `customsearch833`) y devuelve resultados agregados relacionados con la obligación del impuesto de ventas (Sales Tax Liability) agrupados por periodo y tipo. El script normaliza columnas, extrae textos y valores, y convierte campos numéricos eliminando separadores de miles para devolver números en formato float en el JSON de salida.

Uso
---
Método: GET

URL ejemplo:

https://{account}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=<SCRIPT_ID>&deploy=<DEPLOY_ID>

Parámetros
----------
Este Suitelet no requiere parámetros obligatorios. Ejecuta la Saved Search `customsearch833` tal como está definida. Si quieres filtrar por fechas u otros criterios, modifica la Saved Search o crea una copia y adapta el Suitelet para aceptar parámetros.

Autenticación
-------------
Para consumir este Suitelet desde fuera de NetSuite se recomienda usar OAuth 1.0 (TBA) o Token-Based Authentication. Asegúrate de disponer de Consumer Key/Secret y Token Id/Secret según corresponda y de firmar correctamente las peticiones.

Respuesta
---------
La respuesta es JSON con la forma:

```
{
  "success": true,
  "results": [
    {
      "postingPeriod": "Jan 2025",
      "type": "Invoice",
      "grossSales": 10000.00,
      "exemptSales": 500.00,
      "taxbleSales": 9500.00,
      "taxTotal": 760.00
    },
    ...
  ]
}
```

Campos devueltos
-----------------
- `postingPeriod`: string (valor textual del periodo contable agrupado).
- `type`: string (tipo de transacción: Invoice, Cash Sale, etc.).
- `grossSales`: number (suma de `amount` si está presente), parseado a float.
- `exemptSales`: number (suma alternativa `amount_1` según la búsqueda), parseado a float.
- `taxbleSales`: number (suma de `taxamount`), parseado a float.
- `taxTotal`: number (suma de `taxDetail.taxamount`), parseado a float.

Comportamiento y detalles técnicos
----------------------------------
- El Suitelet itera las filas (`result.columns`) y construye un mapa `values` donde la key respeta el formato `SUMMARY(join.name)` o el `name` simple si no hay summary.
- Usa `result.getText(col)` cuando el campo tiene texto (listas/labels) y `result.getValue(col)` para el valor bruto.
- La función `parseNumber` elimina comas (separadores de miles) antes de convertir a `parseFloat`, y devuelve `0` si el valor no es convertible.
- Se setea el header `Content-Type: application/json` en la respuesta.

Ejemplo de consumo (curl con OAuth 1.0)
--------------------------------------
```
curl -X GET \
  'https://{account}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_sl_get_tax_liability&deploy=1' \
  -H "Authorization: OAuth oauth_consumer_key=\"<CONSUMER_KEY>\", oauth_token=\"<TOKEN>\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"<TIMESTAMP>\", oauth_nonce=\"<NONCE>\", oauth_version=\"1.0\", oauth_signature=\"<SIGNATURE>\"" \
  -H 'Accept: application/json'
```

Contacto
--------
Autor: Cristian Orrego

Si quieres que el Suitelet acepte parámetros (por ejemplo `from`/`to`) o que incluya paginación, dímelo y lo documento o lo implemento en el script.

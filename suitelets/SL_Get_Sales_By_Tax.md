# SL_Get_Sales_By_Tax - Documentación

Descripción
-----------
Suitelet `SL_Get_Sales_By_Tax.js` (NApiVersion 2.x) que carga una Saved Search (id `customsearch528`) y devuelve resultados agregados por impuesto. Permite filtrar por rango de fechas mediante parámetros `from` y `to` (si se envían). El resultado se retorna en JSON con un arreglo `results` que contiene objetos con los totales procesados.

Uso
---
Método: GET

URL ejemplo:

https://{account}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=<SCRIPT_ID>&deploy=<DEPLOY_ID>&from=2025-01-01&to=2025-01-31

Parámetros de query string
--------------------------
- `from` (opcional): fecha inicio del rango, formato `YYYY-MM-DD`.
- `to` (opcional): fecha fin del rango, formato `YYYY-MM-DD`.

Si no se proveen `from` y `to`, la Suitelet ejecuta la Saved Search sin filtro de fecha.

Autenticación
-------------
Este Suitelet debe consumirse con autenticación adecuada (por ejemplo OAuth 1.0 o Token-Based Authentication) según la configuración de tu cuenta NetSuite.

Respuesta
---------
La respuesta es JSON con la forma:

```
{
  "success": true,
  "results": [
    {
      "taxCode": "TX001",
      "date": "2025-01-02",
      "customer": "ACME INC",
      "tranid": "1001",
      "type": "Invoice",
      "totalAmount": 1234.56,
      "totalDiscount": 10.00,
      "totalNet": 1224.56
    },
    ...
  ]
}
```

En caso de error la Suitelet devuelve:

```
{
  "success": false,
  "message": "Descripción del error"
}
```

Notas de implementación
-----------------------
- El Suitelet carga la search `customsearch528`. Si la búsqueda no contiene filtros de fecha, la Suitelet no añade ninguno a menos que reciba `from`/`to`.
- Se intenta leer `result.values` y, si no existe, se reconstruyen las keys y valores a partir de `result.columns` y los métodos `getValue`/`getText`.
- Los campos agregados (`SUM(...)`) son parseados a `float` cuando es posible; si no, se devuelven `0`.
- Límite: la Suitelet usa `getRange({start:0,end:1000})`; si esperas más resultados deberás paginar o ajustar la lógica del Suitelet.

Ejemplo con `curl` (suponiendo OAuth firmado)
--------------------------------------------
```
curl -X GET \
  'https://{account}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_sl_get_sales_by_tax&deploy=1&from=2025-01-01&to=2025-01-31' \
  -H "Authorization: OAuth oauth_consumer_key=\"<CONSUMER_KEY>\", oauth_token=\"<TOKEN>\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"<TIMESTAMP>\", oauth_nonce=\"<NONCE>\", oauth_version=\"1.0\", oauth_signature=\"<SIGNATURE>\"" \
  -H 'Accept: application/json'
```

Contacto
--------
Autor: Cristian Orrego
Para documentación más detallada o ejemplos adicionales, proporciona los parámetros que deseas exponer y los incluiré en la documentación.

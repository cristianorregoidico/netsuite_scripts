# SL_Get_Purchase_By_Tax - Documentación

Descripción
-----------
Suitelet `SL_Get_Purchase_By_Tax.js` (NApiVersion 2.x) que carga una Saved Search (id `customsearch548`) y devuelve resultados agregados por código de impuesto para compras. Permite filtrar por rango de fechas mediante parámetros `from` y `to` (si se envían). El resultado se retorna en JSON con un arreglo `results` que contiene objetos con los totales procesados.

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
Este Suitelet debe consumirse con autenticación adecuada (por ejemplo OAuth 1.0 o Token-Based Authentication) según la configuración de tu cuenta NetSuite. Ver README principal para pasos de OAuth 1.0.

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
      "vendor": "Proveedor S.A.",
      "tranid": "2001",
      "type": "Bill",
      "netAmount": 1000.00,
      "taxAmount": 80.00,
      "totalAmount": 1080.00
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
- El Suitelet carga la search `customsearch548` y, si se reciben `from`/`to`, intenta aplicar un filtro `trandate` con operador `WITHIN` usando fechas normalizadas para NetSuite (MM/DD/YYYY).
- Si `result.values` no está disponible, el script reconstruye un mapa de valores a partir de `result.columns` usando `getValue`/`getText`.
- Para detectar los totales usa el `label` de las columnas (`Net Amount`, `Tax Amount`, `Amount`) y extrae los valores con `result.getValue(col)`.
- Los totales devueltos en el JSON se parsean a `float` cuando es posible; si no, se devuelve `0`.
- La búsqueda se ejecuta con `getRange({start:0,end:1000})` por defecto.

Ejemplo con `curl` (suponiendo OAuth firmado)
--------------------------------------------
```
curl -X GET \
  'https://{account}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_sl_get_purchase_by_tax&deploy=1&from=2025-01-01&to=2025-01-31' \
  -H "Authorization: OAuth oauth_consumer_key=\"<CONSUMER_KEY>\", oauth_token=\"<TOKEN>\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"<TIMESTAMP>\", oauth_nonce=\"<NONCE>\", oauth_version=\"1.0\", oauth_signature=\"<SIGNATURE>\"" \
  -H 'Accept: application/json'
```

Contacto
--------
Autor: Cristian Orrego

Para documentación más detallada o ejemplos adicionales, por favor indica qué parámetros o formatos necesitas y lo añado en esta documentación.

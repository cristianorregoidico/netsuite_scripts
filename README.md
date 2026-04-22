# NetSuite Scripts

Repositorio con scripts y plantillas relacionados con desarrollo en NetSuite / SuiteScript, organizados por tipo de script y por casos de negocio.

## Objetivo

Este repositorio funciona como una base de código para personalizaciones en NetSuite, incluyendo:

- **Client Scripts**
- **User Event Scripts**
- **Suitelets**
- **Scheduled Scripts**
- **Restlets**
- **Workflow Actions**
- **Librerías reutilizables**
- **Plantillas Advanced PDF/HTML**
- Automatizaciones orientadas a procesos fiscales e integraciones externas

## Estructura del repositorio

```text
.
├── advance_pdf_templates/    # Plantillas XML para Advanced PDF/HTML
├── certificados_retencion/   # Scripts para certificados de retención (Colombia)
├── client_scripts/           # Scripts de cliente
├── libros_electronicos_peru/ # Scripts relacionados con libros electrónicos (Perú)
├── libs/                     # Librerías compartidas
├── restlet/                  # Endpoints Restlet
├── schedule_scripts/         # Scheduled Scripts
├── suitelets/                # Suitelets y documentación asociada
├── user_events/              # User Event Scripts
└── workflow_actions/         # Workflow Action Scripts
```

## Convención de nombres

La mayoría de los archivos usan prefijos que ayudan a identificar rápidamente el tipo de script:

- `CS_`: Client Script
- `UE_`: User Event Script
- `SL_`: Suitelet
- `RL_`: Restlet
- `SC_`: Scheduled Script
- `WA_`: Workflow Action Script
- `TS_`: scripts utilitarios o desarrollos específicos del proyecto

## Contenido principal

### 1. Client Scripts
Ubicados en `client_scripts/`.

Incluyen validaciones, comportamiento de UI y automatizaciones en formularios, por ejemplo:

- validación de direcciones y correos
- ocultar botones o secciones de comunicación
- reglas de negocio para Amex
- cálculo de impuestos o retenciones por país
- navegación a historiales o formularios legacy

### 2. User Events
Ubicados en `user_events/`.

Es la carpeta con mayor cantidad de automatizaciones. Contiene lógica como:

- modificación de campos al cargar registros
- envío de datos a sistemas externos
- personalización de emails y botones
- sincronización de clientes, vendors, ítems, quotes y sales orders
- actualización de campos logísticos y operativos

### 3. Suitelets
Ubicados en `suitelets/`.

Se usan para exponer procesos o consultas desde NetSuite. En este repo hay Suitelets orientados a:

- reglas Amex
- consulta de mensajes y adjuntos
- compras por impuesto
- ventas por impuesto
- tax liability
- utilidades relacionadas con órdenes de compra

Además, existen documentos Markdown para algunos endpoints:

- `suitelets/SL_Get_Purchase_By_Tax.md`
- `suitelets/SL_Get_Sales_By_Tax.md`
- `suitelets/SL_Get_Tax_Liability.md`

### 4. Librerías compartidas
Ubicadas en `libs/`.

Contienen funciones reutilizables para procesos más complejos, especialmente relacionados con extracción y construcción de información transaccional.

### 5. Plantillas Advanced PDF/HTML
Ubicadas en `advance_pdf_templates/`.

Incluyen plantillas XML para impresión y documentos PDF/HTML avanzados, por ejemplo packing slips, invoices y formatos regionales.

### 6. Fiscal / localización
Hay desarrollos enfocados en procesos regionales, entre ellos:

- **Colombia**: certificados de retención, retenciones, validaciones
- **Perú**: libros electrónicos
- **Brasil**: formularios y plantillas específicas
- **Chile**: cálculo de impuestos
- **EE. UU.**: plantillas y procesos puntuales

## Tecnologías y estilo

- SuiteScript **2.0**, **2.1** y **2.x**
- módulos nativos de NetSuite como `N/record`, `N/search`, `N/runtime`, `N/https`, `N/render`, `N/task`, `N/email`
- scripts definidos con `define([...], function (...) {})`
- plantillas XML compatibles con **Advanced PDF/HTML Templates**

## Integraciones detectadas

A partir del código actual, el repositorio incluye llamadas HTTP hacia servicios externos para distintos flujos, por ejemplo:

- sincronización con **Salesforce**
- envío o consulta de información operacional
- automatizaciones expuestas en servicios Azure / Logic Apps / Power Automate

Por eso, antes de desplegar o reutilizar scripts, conviene revisar:

- URLs embebidas en el código
- credenciales o tokens requeridos
- dependencias entre scripts
- IDs internos de búsquedas, campos, records y deployments

## Cómo usar este repositorio

Este repositorio parece estar organizado como **colección de scripts y assets**, no como un proyecto SuiteCloud/SDF completo listo para deploy automático.

### Flujo recomendado

1. Identificar el tipo de script que necesitas.
2. Revisar dependencias internas (`libs/`, búsquedas guardadas, campos personalizados, templates, endpoints externos).
3. Validar `@NApiVersion` y `@NScriptType` en cada archivo.
4. Copiar o adaptar el script en tu cuenta/proyecto NetSuite.
5. Crear o actualizar el registro del script y su deployment en NetSuite.
6. Probar en sandbox antes de mover a producción.

## Recomendaciones para mantenimiento

- documentar cada script con propósito, parámetros y dependencias
- registrar IDs de Saved Searches, custom records y campos usados
- mover URLs y valores sensibles a parámetros de script cuando sea posible
- separar scripts activos, legacy y pruebas
- incorporar un proyecto **SuiteCloud / SDF** si se quiere versionado y despliegue más formal

## Documentación específica disponible

Actualmente el repo ya incluye documentación puntual para:

- compras por impuesto
- ventas por impuesto
- tax liability

Si sigues ampliando este repositorio, vale la pena agregar un `.md` por cada Suitelet, Restlet o proceso fiscal relevante.

## Estado actual del repositorio

Hallazgos rápidos del contenido actual:

- fuerte presencia de **User Events** y **Suitelets**
- uso mixto de SuiteScript `2.0`, `2.1` y `2.x`
- enfoque claro en automatización operativa, fiscal e integración externa
- estructura organizada principalmente por tipo de script

## Sugerencia de siguiente paso

Si quieres profesionalizar este repo, los siguientes pasos naturales serían:

1. agregar metadatos de despliegue por script
2. documentar dependencias funcionales y técnicas
3. convertirlo en estructura **SuiteCloud / SDF**
4. añadir ejemplos de instalación y pruebas

---

Si quieres, en el siguiente paso también puedo:

- mejorar este README para que se vea más “corporativo”, o
- generar una versión orientada a **SuiteCloud / SDF**, o
- documentar carpeta por carpeta con más detalle.

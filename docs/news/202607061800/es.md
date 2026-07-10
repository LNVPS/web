*Esta publicación fue traducida automáticamente del inglés.*

Desde nuestra última actualización en marzo, hemos seguido implementando mejoras en el panel de control. Aquí tiene todo lo nuevo.

## Reglas de firewall por VM

Ahora puede administrar un firewall para cada VM directamente desde el panel de control. Una nueva pestaña de **Firewall** en la página de la VM le permite establecer políticas predeterminadas de entrada y salida y agregar hasta 20 reglas personalizadas. Cada regla admite una dirección, protocolo (TCP/UDP/ICMP), puerto o rango de puertos, dirección de origen/destino y una acción (aceptar, descartar o rechazar). Las reglas se pueden habilitar, editar o eliminar en cualquier momento, lo que le brinda un control preciso sobre el acceso a la red sin tocar el sistema operativo invitado.

## Notificaciones de Telegram y WhatsApp

Además del correo electrónico y los mensajes directos encriptados de Nostr, ahora puede recibir notificaciones de la cuenta a través de **Telegram** y **WhatsApp**. Administre todos sus canales de notificación desde la página de configuración de la cuenta rediseñada, donde cada canal muestra su estado de conexión actual y se puede activar o desactivar de forma independiente.

## Rediseño de la configuración de la cuenta

La página de configuración de la cuenta se ha reorganizado en paneles limpios y seccionados, con filas de estado de estilo terminal para cada canal de notificación. La pestaña de Soporte ya no requiere que adjunte su clave pública manualmente; ahora se incluye automáticamente, y la pestaña de Mensajes mantiene un historial de solo lectura de las conversaciones de soporte anteriores.

## Vista general de la VM con navegación en la barra lateral

La página de detalles de la VM tiene un nuevo diseño de barra lateral con secciones dedicadas para **Descripción general, facturación, consola, firewall, gráficos, historial y actualización.** La descripción general se ha rediseñado con una cuadrícula de especificaciones clara (CPU, RAM, disco, SO, región, clave SSH), una etiqueta de estado en vivo que muestra el uso de CPU y RAM, e información de vencimiento con acciones rápidas de Pagar ahora / Renovar. Las VM que aún están en fase de aprovisionamiento ahora muestran un indicador de carga animado en lugar de detalles incompletos, y las VM completamente nuevas que están a la espera de su primer pago se identifican claramente.

## Mejoras en la página de estado

La página de estado pública ahora muestra un **gráfico de tiempo de actividad mensual** que abarca los últimos 12 meses, para que pueda ver la disponibilidad histórica de un vistazo. También agregamos un estado de **Programado** para el mantenimiento programado, lo que indica claramente cuándo se espera que se realice el trabajo en lugar de un incidente inesperado.

## SEO y capacidad de descubrimiento

El sitio ahora incluye títulos de página y meta descripciones por ruta, un archivo `robots.txt`, un mapa del sitio y datos estructurados. Las publicaciones de noticias y las páginas clave se describen correctamente para los motores de búsqueda y las vistas previas de las redes sociales, en todos los idiomas admitidos.

Como siempre, gracias por usar LNVPS. Próximamente.

*Esta publicación fue traducida automáticamente del inglés.*

Ayer sufrimos una interrupción prolongada de la red durante lo que estaba previsto como mantenimiento rutinario: una actualización del firmware de nuestro router central. Queremos ser transparentes sobre lo que ocurrió y por qué tardó tanto en resolverse.

## Qué ocurrió

La actualización del firmware se completó sin problemas. El router apareció limpiamente, las interfaces estaban presentes, y el tráfico local entre los servidores en el router funcionaba bien. Sin embargo, nuestras sesiones upstream BGP y túneles VXLAN se negaron a volver.

Lo que siguió fueron unas ocho horas de diagnóstico de algunos de los comportamientos de red más extraños que hemos encontrado. La resolución ARP en los puertos de tránsito era inconsistente. Las sesiones BGP se establecían, el tráfico empezaba a enrutarse, y luego el enlace se quedaba muerto - no se caía realmente a nivel de interfaz, sino que simplemente no reenviaba paquetes, sin que se informara de ninguna caída. Todos los diagnósticos que realizamos en el router no mostraban ningún problema: ni errores, ni entradas de registro, nada.

Nos pusimos en contacto con nuestro proveedor de tránsito, que nos confirmó que ellos tampoco veían ningún problema. Probamos numerosas configuraciones diferentes. Incluso trasladamos las configuraciones de BGP y del túnel del router a un servidor Linux independiente para aislar el problema, y obtuvimos exactamente el mismo resultado. En ese punto, el propio router parecía descartado, ya que el problema seguía a los puertos de tránsito, independientemente de lo que los controlaba.

Después de agotar todas las demás vías, reiniciamos de fábrica el router como último recurso y aplicamos una configuración mínima desde cero: sólo la configuración del puente y la VLAN. Para nuestra sorpresa, funcionó al instante. Perfectamente.

## Causa raíz

Por lo que hemos podido determinar, la actualización del firmware provocó algún tipo de corrupción silenciosa en el estado del router que afectó a la forma en que las interfaces de tránsito gestionaban el tráfico. A pesar de que la actualización parecía completamente exitosa, el router no informaba de errores, y el problema incluso se reproducía cuando BGP era manejado por una máquina completamente diferente, un restablecimiento de fábrica y una configuración limpia fue todo lo que se necesitó para resolverlo. Sigue siendo uno de los fallos más desconcertantes a los que nos hemos enfrentado.

## Lo que puede necesitar hacer

- **Si su máquina virtual está inaccesible**, deténgala e iníciela desde su panel de control. En la mayoría de los casos esto restaurará la conectividad.
- **Si sigue siendo inalcanzable después de una parada/arranque**, por favor contacte con soporte y lo investigaremos.
- **Si ve una advertencia de cambio de clave de host SSH** al conectarse a su máquina virtual, esto es normal. Las máquinas virtuales fueron reconfiguradas en bloque para trabajar con la nueva configuración, y cloud-init regeneró las claves de host como parte de ese proceso. Este es el comportamiento estándar de cloud-init cuando una máquina virtual es reiniciada - puedes aceptar la nueva clave.

Pedimos disculpas por el tiempo de inactividad prolongado y la frustración que causó. Estamos revisando nuestros procedimientos de actualización para asegurarnos de que podemos identificar y recuperarnos de problemas como este más rápidamente en el futuro.

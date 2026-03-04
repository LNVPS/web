*Cet article a été traduit automatiquement depuis l'anglais.*

Hier, nous avons connu une panne de réseau prolongée au cours de ce qui était prévu comme une maintenance de routine : une mise à jour du micrologiciel de notre routeur principal. Nous voulons être transparents sur ce qui s'est passé et sur les raisons pour lesquelles il a fallu autant de temps pour résoudre ce problème.

## Ce qui s'est passé

La mise à jour du micrologiciel s'est déroulée sans problème. Le routeur s'est ouvert proprement, les interfaces étaient présentes et le trafic local entre les serveurs sur le routeur fonctionnait correctement. Cependant, nos sessions BGP en amont et nos tunnels VXLAN ont refusé de se rétablir.

Nous avons ensuite passé environ huit heures à diagnostiquer certains des comportements de réseau les plus étranges que nous ayons rencontrés. La résolution ARP sur les ports de transit était incohérente. Les sessions BGP s'établissaient, le trafic commençait à être acheminé, puis la liaison s'arrêtait effectivement - sans être réellement coupée au niveau de l'interface, mais en n'acheminant tout simplement pas les paquets, sans qu'aucune chute ne soit signalée. Tous les diagnostics que nous avons effectués sur le routeur n'ont rien révélé d'anormal : pas d'erreurs, pas d'entrées dans le journal, rien.

Nous avons contacté notre fournisseur de transit, qui nous a confirmé qu'il ne voyait rien d'anormal de son côté non plus. Nous avons essayé de nombreuses configurations différentes. Nous avons même déplacé les configurations BGP et tunnel hors du routeur sur un serveur Linux séparé pour isoler le problème - et nous avons rencontré exactement le même comportement. À ce stade, le routeur lui-même semblait exclu, puisque le problème suivait les ports de transit indépendamment de ce qui les alimentait.

Après avoir épuisé toutes les autres possibilités, nous avons réinitialisé le routeur en dernier recours et appliqué une configuration minimale à partir de zéro - uniquement la configuration du pont et du VLAN. À notre grande surprise, cela a fonctionné instantanément. Parfaitement.

## Cause première

Pour autant que nous puissions le déterminer, la mise à jour du firmware a entraîné une forme de corruption silencieuse dans l'état du routeur qui a affecté la façon dont les interfaces de transit géraient le trafic. Bien que la mise à jour ait semblé complètement réussie, que le routeur n'ait signalé aucune erreur et que le problème se soit même reproduit lorsque BGP était géré par une machine entièrement différente, une réinitialisation d'usine et une configuration propre ont suffi à le résoudre. Cela reste l'une des pannes les plus déroutantes que nous ayons rencontrées.

## Ce que vous devez faire

- **Si votre VM est inaccessible**, arrêtez-la et redémarrez-la à partir de votre panneau de contrôle. Dans la plupart des cas, cela rétablira la connectivité.
- **Si elle est toujours inaccessible après un arrêt/démarrage**, veuillez contacter l'assistance et nous examinerons la situation.
- **Si vous voyez un avertissement de changement de clé hôte SSH** lorsque vous vous connectez à votre VM, c'est normal. Les machines virtuelles ont été reconfigurées en masse pour fonctionner avec la nouvelle configuration, et cloud-init a régénéré les clés d'hôte dans le cadre de ce processus. Il s'agit d'un comportement standard de cloud-init lorsqu'une VM est réinitialisée - vous pouvez accepter la nouvelle clé en toute sécurité.

Nous nous excusons pour ce temps d'arrêt prolongé et pour la frustration qu'il a causée. Nous sommes en train de revoir nos procédures de mise à jour afin de nous assurer que nous pourrons identifier et résoudre des problèmes de ce type plus rapidement à l'avenir.

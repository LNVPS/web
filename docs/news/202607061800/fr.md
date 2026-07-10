*Cet article a été traduit automatiquement depuis l'anglais.*

Depuis notre dernier récapitulatif en mars, nous avons continué à améliorer les fonctionnalités du panneau de contrôle. Voici toutes les nouveautés.

## Règles de pare-feu par VM

Vous pouvez désormais gérer un pare-feu pour chaque VM directement depuis le panneau de contrôle. Un nouvel onglet **Pare-feu** sur la page de la VM vous permet de définir les politiques par défaut pour les connexions entrantes et sortantes et d’ajouter jusqu’à 20 règles personnalisées. Chaque règle prend en charge une direction, un protocole (TCP/UDP/ICMP), un port ou une plage de ports, une adresse source/destination et une action (accepter, supprimer ou rejeter). Les règles peuvent être activées, modifiées ou supprimées à tout moment, ce qui vous donne un contrôle précis sur l’accès au réseau sans avoir à toucher au système d’exploitation invité.

## Notifications Telegram et WhatsApp

En plus des e-mails et des messages directs chiffrés Nostr, vous pouvez désormais recevoir des notifications de compte via **Telegram** et **WhatsApp**. Gérez tous vos canaux de notification à partir de la page des paramètres de compte redessinée, où chaque canal affiche son état de connexion actuel et peut être activé ou désactivé indépendamment.

## Refonte des paramètres du compte

La page des paramètres du compte a été réorganisée en panneaux clairs et structurés, avec des lignes d’état de type terminal pour chaque canal de notification. L’onglet Assistance n’a plus besoin que vous attachiez manuellement votre clé publique, car elle est désormais incluse automatiquement, et l’onglet Messages conserve un historique en lecture seule des conversations d’assistance passées.

## Vue d’ensemble de la VM avec navigation dans la barre latérale

La page des détails de la VM présente une nouvelle mise en page avec une barre latérale dédiée contenant des sections pour **Vue d’ensemble, Facturation, Console, Pare-feu, Graphiques, Historique et Mise à niveau**. La vue d’ensemble a été redessinée avec une grille de spécifications claire (CPU, RAM, disque, système d’exploitation, région, clé SSH), une vignette d’état en direct affichant l’utilisation du CPU et de la RAM, et des informations sur l’expiration avec des actions rapides « Payer maintenant / Renouveler ». Les VM qui sont toujours en cours d’approvisionnement affichent désormais un indicateur de chargement animé au lieu des détails incomplets, et les nouvelles VM qui attendent leur premier paiement sont clairement identifiées.

## Améliorations de la page d’état

La page d’état publique affiche désormais un **graphique de disponibilité mensuel** couvrant les 12 derniers mois, afin que vous puissiez voir la disponibilité historique en un coup d’œil. Nous avons également ajouté un état **Planifié** pour les opérations de maintenance programmées, ce qui indique clairement quand les travaux sont prévus plutôt qu’un incident imprévu.

## SEO et visibilité

Le site propose désormais des titres et des méta-descriptions de page par itinéraire, un fichier `robots.txt`, une carte du site et des données structurées. Les articles de blog et les pages clés sont correctement décrits pour les moteurs de recherche et les aperçus des réseaux sociaux, dans toutes les langues prises en charge.

Comme toujours, merci d’utiliser LNVPS. D’autres nouveautés à venir.

Gestern kam es zu einem längeren Netzausfall während einer routinemäßigen Wartungsmaßnahme: einem Firmware-Upgrade auf unserem Hauptrouter. Wir möchten transparent machen, was passiert ist und warum es so lange gedauert hat, bis die Störung behoben war.

## Was geschah

Das Firmware-Upgrade selbst schien ohne Probleme abzulaufen. Der Router wurde ohne Probleme hochgefahren, die Schnittstellen waren vorhanden und der lokale Datenverkehr zwischen den Servern auf dem Router funktionierte einwandfrei. Allerdings weigerten sich unsere Upstream-BGP-Sitzungen und VXLAN-Tunnel, wieder hochzufahren.

Es folgten etwa acht Stunden, in denen wir das seltsamste Netzwerkverhalten diagnostizierten, das uns je untergekommen ist. Die ARP-Auflösung an den Transit-Ports war inkonsistent. BGP-Sitzungen wurden aufgebaut, der Datenverkehr begann zu routen, und dann war die Verbindung praktisch tot - nicht wirklich auf Schnittstellenebene, sondern einfach, weil keine Pakete weitergeleitet wurden, ohne dass ein Ausfall gemeldet wurde. Alle Diagnosen, die wir auf dem Router durchführten, zeigten keine Fehler: keine Fehler, keine Protokolleinträge, nichts.

Wir setzten uns mit unserem Transitanbieter in Verbindung, der uns bestätigte, dass auch bei ihm keine Probleme auftreten. Wir haben zahlreiche verschiedene Konfigurationen ausprobiert. Wir haben sogar die BGP- und Tunnelkonfigurationen vom Router auf einen separaten Linux-Server verschoben, um das Problem einzugrenzen - und stießen auf genau dasselbe Verhalten. Zu diesem Zeitpunkt schien der Router selbst nicht mehr in Frage zu kommen, da das Problem bei den Transitports auftrat, unabhängig davon, was sie ansteuerte.

Nachdem wir alle anderen Möglichkeiten ausgeschöpft hatten, setzten wir den Router als letzten Ausweg auf die Werkseinstellungen zurück und führten eine Minimalkonfiguration von Grund auf durch - nur die Bridge- und VLAN-Einstellungen. Zu unserer Überraschung funktionierte es sofort. Perfekt.

## Grundursache

Soweit wir feststellen konnten, führte die Firmware-Aktualisierung zu einer Art stiller Verfälschung des Router-Status, die sich auf die Art und Weise auswirkte, wie die Transit-Schnittstellen den Datenverkehr abwickelten. Obwohl das Upgrade vollständig erfolgreich zu sein schien, der Router keine Fehler meldete und das Problem sogar reproduzierbar war, wenn BGP von einem ganz anderen Rechner abgewickelt wurde, genügte ein Werksreset und eine saubere Konfiguration, um das Problem zu lösen. Es bleibt einer der rätselhaftesten Ausfälle, mit denen wir zu tun hatten.

## Was Sie möglicherweise tun müssen

- **Wenn Ihre VM nicht erreichbar ist**, stoppen und starten Sie sie bitte über Ihr Kontrollpanel. In den meisten Fällen wird dadurch die Konnektivität wiederhergestellt.
- **Wenn sie nach dem Stoppen/Starten** immer noch nicht erreichbar ist, wenden Sie sich bitte an den Support, damit wir das überprüfen können.
- **Wenn Sie bei der Verbindung zu Ihrer VM eine Warnung zur Änderung des SSH-Hostschlüssels** sehen, ist dies zu erwarten. Die VMs wurden massenhaft rekonfiguriert, um mit dem neuen Setup zu arbeiten, und cloud-init hat als Teil dieses Prozesses Host-Schlüssel neu generiert. Dies ist das Standardverhalten von cloud-init bei der Neuinitialisierung einer VM - Sie können den neuen Schlüssel bedenkenlos akzeptieren.

Wir entschuldigen uns für die verlängerte Ausfallzeit und die damit verbundene Frustration. Wir sind dabei, unsere Upgrade-Verfahren zu überprüfen, um sicherzustellen, dass wir solche Probleme in Zukunft schneller erkennen und beheben können.

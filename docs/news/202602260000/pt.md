*Esta publicação foi traduzida automaticamente do inglês.*

Ontem, tivemos uma interrupção prolongada da rede durante o que foi planejado como manutenção de rotina: uma atualização de firmware em nosso roteador principal. Queremos ser transparentes sobre o que aconteceu e por que demorou tanto tempo para ser resolvido.

## O que aconteceu

A atualização do firmware em si pareceu ser concluída sem problemas. O roteador apareceu de forma limpa, as interfaces estavam presentes e o tráfego local entre os servidores no roteador funcionou bem. No entanto, nossas sessões BGP upstream e os túneis VXLAN se recusaram a voltar a funcionar.

O que se seguiu foram cerca de oito horas de diagnóstico de alguns dos comportamentos de rede mais estranhos que já encontramos. A resolução de ARP nas portas de trânsito era inconsistente. As sessões BGP se estabeleciam, o tráfego começava a ser roteado e, em seguida, o link ficava efetivamente inoperante - não realmente inoperante no nível da interface, mas simplesmente não encaminhava pacotes, com zero quedas relatadas. Todos os diagnósticos que executamos no roteador não mostraram nada de errado: nenhum erro, nenhuma entrada de registro, nada.

Entramos em contato com o nosso provedor de trânsito, que confirmou que também não via nada de errado do seu lado. Tentamos várias configurações diferentes. Até mesmo transferimos as configurações de BGP e de túnel do roteador para um servidor Linux separado para isolar o problema e tivemos exatamente o mesmo comportamento. Nesse ponto, o próprio roteador parecia descartado, pois o problema seguia as portas de trânsito independentemente do que as estava acionando.

Depois de esgotar todas as outras possibilidades, redefinimos o roteador de fábrica como último recurso e aplicamos uma configuração mínima do zero - apenas a ponte e a configuração da VLAN. Para nossa surpresa, funcionou instantaneamente. Perfeitamente.

## Causa raiz

Pelo que podemos determinar, a atualização do firmware resultou em alguma forma de corrupção silenciosa no estado do roteador que afetou a forma como as interfaces voltadas para o trânsito lidavam com o tráfego. Apesar de a atualização ter sido completamente bem-sucedida, de o roteador não ter relatado nenhum erro e de o problema ter se reproduzido mesmo quando o BGP foi gerenciado por uma máquina totalmente diferente, bastou uma redefinição de fábrica e uma configuração limpa para resolver o problema. Essa continua sendo uma das falhas mais intrigantes com as quais já lidamos.

## O que você pode precisar fazer

- **Se a sua VM estiver inacessível**, pare e inicie-a no painel de controle. Na maioria dos casos, isso restaurará a conectividade.
- **Se ela ainda estiver inacessível após a parada/inicialização**, entre em contato com o suporte e nós investigaremos.
- **Se você vir um aviso de alteração de chave de host SSH** ao se conectar à sua VM, isso é esperado. As VMs foram reconfiguradas em massa para funcionar com a nova configuração, e a instalação na nuvem gerou novamente as chaves do host como parte desse processo. Esse é o comportamento padrão da instalação na nuvem quando uma VM é reinicializada - você pode aceitar a nova chave com segurança.

Pedimos desculpas pelo tempo de inatividade prolongado e pela frustração causada. Estamos revisando nossos procedimentos de upgrade para garantir que possamos identificar e nos recuperar de problemas como esse mais rapidamente no futuro.

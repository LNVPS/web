*Bu gönderi İngilizceden otomatik olarak çevrilmiştir.*

Dün, planlı rutin bakım sırasında, temel yönlendiricimizde gerçekleştirilen bir donanım yazılımı yükseltmesi sırasında uzun süreli bir ağ kesintisi yaşadık. Yaşananları ve çözümlerinin bu kadar uzun sürmesinin nedenlerini şeffaf bir şekilde açıklamak istiyoruz.

## Yaşananlar

Donanım yazılımı yükseltmesinin sorunsuz bir şekilde tamamlandığı görüldü. Yönlendirici düzgün bir şekilde başladı, arayüzler mevcut ve yönlendirici üzerindeki sunucular arasındaki yerel trafik sorunsuz bir şekilde çalıştı. Ancak, yukarı yönlü BGP oturumlarımız ve VXLAN tünellerimiz yeniden başlatılamadı.

Bunun ardından yaklaşık sekiz saat boyunca, şimdiye kadar karşılaştığımız en tuhaf ağ davranışlarından bazılarını teşhis ettik. Geçiş bağlantı noktalarındaki ARP çözümlemesi tutarlı değildi. BGP oturumları başlatıldı, trafik yönlendirilmeye başlandı ve ardından bağlantı etkili bir şekilde kullanılamaz hale geldi; arayüz düzeyinde bağlantı kesilmemiş olsa da, paketler iletilmiyordu ve sıfır kayıp bildirildi. Yönlendiricide yaptığımız her teşhis, hiçbir sorun olmadığını gösteriyordu: hiçbir hata, hiçbir günlük kaydı, hiçbir şey yoktu.

Üst bağlantı sağlayıcımızla iletişime geçtik ve onların da kendi uçlarında herhangi bir sorun olmadığını doğruladılar. Birçok farklı yapılandırma denedik. Sorunu izole etmek için BGP ve tünel yapılandırmalarını yönlendirici dışına, ayrı bir Linux sunucusuna bile taşıdık ve tam olarak aynı davranışla karşılaştık. Bu noktada, yönlendiricinin kendisi artık sorunun kaynağı olmaktan çıktı, çünkü sorun, hangi cihazın bunları kontrol ettiğine bakılmaksızın geçiş bağlantı noktalarını takip ediyordu.

Diğer tüm olasılıkları tükettikten sonra, son çare olarak yönlendiriciyi fabrika ayarlarına döndürdük ve baştan minimum bir yapılandırma uyguladık; yalnızca köprü ve VLAN kurulumu. Şaşırtıcı bir şekilde, anında çalıştı. Kusursuz bir şekilde.

## Temel Neden

Elimizdeki verilere göre, donanım yazılımı yükseltmesi, yönlendiricinin durumunda, geçişe bakan arayüzlerin trafiği işlemesini etkileyen bir tür sessiz bozulmaya neden oldu. Yükseltme tamamen başarılı görünmesine, yönlendiricinin herhangi bir hata bildirmemesine ve sorunun BGP'nin tamamen farklı bir cihazdan yönetildiği durumda bile tekrarlanmasına rağmen, fabrika ayarlarına döndürme ve temiz bir yapılandırma, sorunu çözmek için yeterli oldu. Bu, şimdiye kadar karşılaştığımız en şaşırtıcı arızalardan biri olarak kaldı.

## Yapmanız Gerekenler

- **Sanal makinenize erişilemiyorsa**, lütfen kontrol panelinizden durdurup yeniden başlatın. Çoğu durumda, bu bağlantıyı yeniden kuracaktır.
- **Durdurma/yeniden başlatma işleminden sonra hala erişilemiyorsa**, lütfen destek ekibiyle iletişime geçin, biz de durumu inceleyeceğiz.
- **Sanal makinenize bağlandığınızda bir SSH anahtar değişikliği uyarısı görürseniz**, bu beklenen bir durumdur. Sanal makineler, yeni yapılandırma ile çalışacak şekilde toplu olarak yeniden yapılandırıldı ve cloud-init, bu işlemin bir parçası olarak anahtarları yeniden oluşturdu. Bir sanal makine yeniden başlatıldığında bu, standart cloud-init davranışıdır; yeni anahtarı güvenle kabul edebilirsiniz.

Yaşanan uzun süreli kesinti ve bunun neden olduğu sıkıntı için özür dileriz. Gelecekte bu tür sorunları daha hızlı bir şekilde tanımlayabilmemiz ve çözebilmemiz için yükseltme prosedürlerimizi gözden geçiriyoruz.

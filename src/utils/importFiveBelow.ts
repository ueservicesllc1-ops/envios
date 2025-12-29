import { collection, addDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const fiveBelowData = [
    // --- TECH ---
    { "name": "Auriculares Inalámbricos Elite Bling", "price": "8.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9189886_01.jpg" },
    { "name": "Tira De Luces LED Multicolor De 8 Pies", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9099162_01.jpg" },
    { "name": "Altavoz De Agua Con LED Bluetooth® Baloncesto", "price": "10.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9204629_01.jpg" },
    { "name": "Juego De Tiras De Luces LED", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9195859_01.jpg" },
    { "name": "Conjunto De Jugador Vortex Elite", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9175693_01.jpg" },
    { "name": "Auriculares Inalámbricos Bluetooth® Shine", "price": "8.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9195949_01.jpg" },
    { "name": "Trípode Extensible Para Teléfono De 28 Pulgadas", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1778668/original/134545-00_A.jpg" },
    { "name": "Altavoz Inalámbrico Heart", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9225874_01.jpg" },
    { "name": "Banco De Energía Wicked 4000 MAh", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9217886_01.jpg" },
    { "name": "Proyector De Luz RGB Con Ondas De Agua", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9213420_01.jpg" },
    { "name": "Arte Mural De Neón Malvado", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203643_01.jpg" },
    { "name": "Centro De Carga De 3 Puertos Peanuts®", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9198811_01.jpg" },
    { "name": "Auriculares Con Cable Y Micrófono Echowave", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9135384_01.jpg" },
    { "name": "Aspiradora De Mano Portátil IJoy 2 En 1", "price": "10.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9124695_01.jpg" },
    { "name": "Altavoz Inalámbrico LED Radiante", "price": "8.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9144744_01.jpg" },
    { "name": "Auriculares Con Máscara Para Dormir Hello Kitty®", "price": "10.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203379_01.jpg" },
    { "name": "Auriculares Con Purpurina De Tarta De Fresa™", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9201661_01.jpg" },

    // --- TOYS ---
    { "name": "NeeDoh® The Groovy Glob - Crujiente", "price": "1.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9163734_01.jpg" },
    { "name": "Cabeza De Gato Pequeña De Baby Three", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9232252_01.jpg" },
    { "name": "Yoonique™ Couture Set (Paquete De 2)", "price": "3.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222099_01.jpg" },
    { "name": "Figura Viscosa Cra-Z-Slimy™ Slimy-Boos™", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9227405_01.jpg" },
    { "name": "Peluche De Ángel De Stitch De Disney", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222250_01.jpg" },
    { "name": "Set De Estudio Sweetie Gloss", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9220602_01.jpg" },
    { "name": "Peluche Smoochy Pals™", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9226568_01.jpg" },
    { "name": "Juego De Figuras De Bloques Iluminados Ositos Cariñositos", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9175458_01.jpg" },
    { "name": "Masa Perfumada San Valentín De Hershey's", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9220647_01.jpg" },
    { "name": "Peluche Squishmallows™ De Disney", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9187497_01.jpg" },
    { "name": "Bolsa Sorpresa Squish'A Lots De Disney Doorables", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9188640_01.jpg" },
    { "name": "Juego De Cartas De San Valentín", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9221531_01.jpg" },
    { "name": "Juego De Fondue De Hershey", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9224622_01.jpg" },
    { "name": "Set De Construcción Corazones Sweethearts®", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9226650_01.jpg" },
    { "name": "Camiseta Gráfica Disney Galentine Girlies", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9224013_01.jpg" },
    { "name": "Zuru Fuggler™ Baby Fugg™ Monstruo Feo", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9181339_01.jpg" },
    { "name": "Rompecabezas Fuggler™ De Rayos X", "price": "6.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9219375_01.jpg" },

    // --- HOME / OTHER ---
    { "name": "Tónico Rejuvenecedor Amora Glow Watermelon", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9219006_01.jpg" },
    { "name": "Crema Base Amora Aqua Lock", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9218417_01.jpg" },
    { "name": "Pelota De Pilates Series-8 Fitness™", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9224190_01.jpg" },
    { "name": "Manta De Felpa De 50 X 60 Pulgadas", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9230356_01.jpg" },
    { "name": "Almohada Con Forma De Cupcake", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9150050_01.jpg" },
    { "name": "Guantes Logotipo Philadelphia Eagles NFL", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9243271_01.jpg" },

    // --- PERFUME / BEAUTY (NEW) ---
    { "name": "Nube Suave Pour Femme Eau De Parfum 3oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9079362_01.jpg" },
    { "name": "Vainilla Perla Eau De Parfum 3.4 Fl.Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1894424/original/9099426-00_A.jpg" },
    { "name": "Sweet Treat Sundae Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9187068_01.jpg" },
    { "name": "Racing Club Rojo Eau De Toilette 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1811078/original/2345353-00_A.jpg" },
    { "name": "Adrianna Amor Roto Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1816205/original/3314382-00_A.jpg" },
    { "name": "Bruma Perfumada Para Cuerpo Y Cabello Fresh Feels Vanilla, 3.38 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203754_01.jpg" },
    { "name": "Army Sport For Men Eau De Toilette 100ml", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1811160/original/2586360-00_A.jpg" },
    { "name": "Playa Misteriosa Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1810546/original/2372902-00_A.jpg" },
    { "name": "Adrianna Butterfly Pour Femme Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9138837_01.jpg" },
    { "name": "Luces De París Platino Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1811273/original/2672574-00_A.jpg" },
    { "name": "Juniors Sweet Treat Caramel Mousse Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9210116_01.jpg" },
    { "name": "Perfume De Champán Muy Seductor De 3.4 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1747178/original/124363-00_A.jpg" },
    { "name": "Perfume Ferrera Stiletto 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1821743/original/2895167-00_A.jpg" },
    { "name": "Kimberly Pour Femme Eau De Parfum 100 Ml", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1811225/original/2840056-00_A.jpg" },
    { "name": "Aqua Intenso Eau De Toilette Por Shirley May Deluxe 3.4 Fl.Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1894429/original/7660041-00_A.jpg" },
    { "name": "Bruma Corporal Perfumada De 237 Ml - Magic Spell", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1888446/original/9077946-00_A.jpg" },
    { "name": "Love Tattoo Eau De Parfum 3 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1810232/original/2697860-00_A.jpg" },
    { "name": "Juniors Sweet Treat Cereza Darling Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9210129_01.jpg" },
    { "name": "Dulce Golosina Cherry Darling Pour Femme Paquete De 3", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9211132_01.jpg" },
    { "name": "Luces De París Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1811382/original/1830702-00_A.jpg" },
    { "name": "Roca Misteriosa Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1810817/original/2672608-00_A.jpg" },
    { "name": "Muy Seductor Tan Muy Sexy Eau De Parfum 3.4oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/3155660_01.jpg" },
    { "name": "Bruma Perfumada Para Cabello Y Cuerpo Solar Flare Sunset Samba, 7 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9171786_01.jpg" },
    { "name": "Bolt Eau De Toilette De Shirley May Deluxe 3.4 Onzas Líquidas", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1894368/original/7685023-00_A.jpg" },

    // --- T-SHIRTS (Disney, Marvel, etc.) ---
    { "name": "Camiseta Gráfica De Mickey Y Sus Amigos Con Estampado De Leopardo De Disney", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9201391_01.jpg" },
    { "name": "Camiseta Gráfica De Bambi Para Jóvenes", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1885672/original/9080917-00_A.jpg" },
    { "name": "Camiseta Gráfica De Disney ¿Quién Es Esta Diva?", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9202620_01.jpg" },
    { "name": "Camiseta Gráfica Infantil Disney Stitch Y Angel", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9207487_01.jpg" },
    { "name": "Camiseta Gráfica Infantil 'Haciendo Una Lista' De Pesadilla Antes De Navidad", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9209890_01.jpg" },
    { "name": "Camiseta Gráfica De Troya De Disney High School Musical", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9194831_01.jpg" },
    { "name": "Camiseta Gráfica De Winnie The Pooh De Disney", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9216588_01.jpg" },
    { "name": "Camiseta Gráfica De Disney Phineas Y Ferb Ornitorrinco", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9195534_01.jpg" },
    { "name": "Camiseta Gráfica De Disney PIXAR Cars Remolque Y Salvamento", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9202657_01.jpg" },
    { "name": "Camiseta Gráfica De Rayo McQueen De Disney Pixar", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9133324_01.jpg" },
    { "name": "Camiseta Gráfica De Disney Stitch Feeling Cute", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9172718_01.jpg" },
    { "name": "Camiseta Gráfica De Disney 'Mickey Y Sus Amigos 1928'", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9126374_01.jpg" },
    { "name": "Camiseta Gráfica De Disney Lizzie McGuire", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9174010_01.jpg" },
    { "name": "Camiseta Gráfica De Disney Moana Wayfinder", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9161539_01.jpg" },
    { "name": "Camiseta Gráfica Disney 100 Blancanieves Para Niños", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9109371_01.jpg" },
    { "name": "Camiseta Gráfica De Marvel", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9113073_01.jpg" },
    { "name": "Camiseta Gráfica De Marvel Lightning", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9124684_01.jpg" },
    { "name": "Camiseta Gráfica Del Vengador Legendario Del Capitán América De Marvel", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9174017_01.jpg" },
    { "name": "Camiseta Gráfica Del Capitán América De Marvel Para Niños", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9189971_01.jpg" },
    { "name": "Camiseta Gráfica 'Felices Fiestas' De Hello Kitty®", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9151863_01.jpg" },
    { "name": "Camiseta Gráfica Con Dije Móvil De Hello Kitty®", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9174433_01.jpg" },
    { "name": "Camiseta Gráfica Con Lazo Y Arcoíris De Hello Kitty®", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9142864_01.jpg" },
    { "name": "Camiseta Gráfica De Hello Kitty® Space Foodie", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9174427_01.jpg" },
    { "name": "Camiseta Gráfica Pompompurin™ Cafe", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9117146_01.jpg" },

    // --- LIP BALM / GLOSS ---
    { "name": "Set De 6 Bálsamos Labiales Florales Y Aceites Labiales Botánicos Smoke & Mirrors", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9120395_01.jpg" },
    { "name": "Vaselina Lip Therapy Value Pack De 5", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1784608/original/4680003-00_A.jpg" },
    { "name": "Colección De 12 Brillos Labiales Y De Alto Brillo Smoke & Mirrors®", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9210382_01.jpg" },
    { "name": "Smoke & Mirrors: El Paquete Definitivo Para La Fiesta De Labios", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9210426_01.jpg" },
    { "name": "Colección De Bálsamos Labiales Smoke & Mirrors (5 Unidades)", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9120224_01.jpg" },
    { "name": "Espejo Iluminado De Princesas Disney Y Bálsamo Labial Con Sabor (5 Piezas)", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1864252/original/7535124-00_A.jpg" },
    { "name": "Tratamiento Labial Teñido Lazy Days 0.26 Oz", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9218410_01.jpg" },
    { "name": "Colección De Labios Icónicos Smoke & Mirrors Pout Perfection (Paquete De 5)", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9210722_01.jpg" },
    { "name": "Colección De Labios Smoke & Mirrors Dewy Kisses, 8 Unidades", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9210439_01.jpg" },
    { "name": "Set De 10 Labiales Hidratantes Smoke & Mirrors Pout Perfection", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9210715_01.jpg" },
    { "name": "Colección De Tintes Labiales Smoke & Mirrors Lip Goals De 8 Piezas", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9182197_01.jpg" },
    { "name": "Aceites Labiales Con Sabor (Paquete De 3, 0.42 Oz)", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9204663_01.jpg" },
    { "name": "Bálsamo Labial Hidratante Soft Lips® Gift Tag, 0.07 Oz, Paquete De 2", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9188371_01.jpg" },
    { "name": "Bálsamo Labial Y Barra Natural Rebels Refinery™", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9167532_01.jpg" },
    { "name": "Cuidado Labial Sundae Glow De 0.7 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9197429_01.jpg" },
    { "name": "Set De Exfoliante Y Mascarilla Labial Peppermint Bliss De NYC Underground®", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9206760_01.jpg" },
    { "name": "Aceite Labial LA Colors® Con Infusión De Oro - Sweetie", "price": "3.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1762546/original/125305-00_A.jpg" },
    { "name": "Brillo De Labios Teñido Amora 0.12 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9217702_01.jpg" },
    { "name": "Bálsamo Labial Con Color Lazy Days De 0.5 Oz", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9218391_01.jpg" },
    { "name": "Tinte Labial Protector De Labios Hale De 0.34 Oz", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9218349_01.jpg" },
    { "name": "Aceite Labial De Uva Lip Smacker® Fruit Glaze™ 0.21 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9188722_01.jpg" },
    { "name": "Set De 5 Bálsamos Labiales Con Sabor A Bob Esponja™", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9220240_01.jpg" },
    {
        "name": "Aceite Labial De Plátano Lip Smacker® Fruit Glaze™ 0.21 Oz",
        "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9188715_01.jpg"
    },
    { "name": "Brillo De Labios Sunset5 0.13 Oz", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9217069_01.jpg" },
    { "name": "Aceite Labial De Fresa Lip Smacker® Fruit Glaze™ 0.21 Oz", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9188682_01.jpg" },
    { "name": "Bálsamo Labial Con Color Lip Smacker® Crayola™ 0.14 Oz", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9194200_01.jpg" },
    { "name": "Máscara De Labios Plump It Up De LA Colors®", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203672_01.jpg" },
    { "name": "Brillo Labial Voluminizador Plump It Up De LA Colors® - Transparente", "price": "4.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203688_01.jpg" },
    { "name": "Aceite Labial Con Miel De Manuka Y Vitamina E", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9206785_01.jpg" },
    { "name": "Bálsamo Labial Hershey's De Reese's", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1892809/original/4125860-00_A.jpg" },
    { "name": "Bálsamo Labial Sprite™ 0.12 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222452_01.jpg" },
    { "name": "Brillo Labial Rellenador Con Menta Y Vitamina E", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9206822_01.jpg" },
    { "name": "Bálsamo Labial Dr Pepper® 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1892822/original/4166649-00_A.jpg" },
    { "name": "Bálsamo Labial Skittles™ Original 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9221193_01.jpg" },
    { "name": "Bálsamo Labial 7up® 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9227187_01.jpg" },
    { "name": "Bálsamo Labial Coca-Cola™ 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1892823/original/4166650-00_A.jpg" },
    { "name": "Bálsamo Labial Pepsi® Wild Cherry 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9227154_01.jpg" },
    { "name": "Exfoliante Labial De Azúcar Sin Perfume", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9225725_01.jpg" },
    { "name": "Bálsamo Labial Starburst® Fave Reds 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9221200_01.jpg" },
    { "name": "Bálsamo Labial Mtn Dew® 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1892826/original/4166657-00_A.jpg" },
    { "name": "Bálsamo Labial Pringles® 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222442_01.jpg" },
    { "name": "Bálsamo Labial Con Sabor A Cheetos 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222477_01.jpg" },
    { "name": "Bálsamo Labial Fanta® Orange 0.12 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222467_01.jpg" },
    { "name": "Tratamiento Labial Con Aceite De Coco 0.20 Oz", "price": "1.25", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9216717_01.jpg" },
    { "name": "Bálsamo Labial Mtn Dew® Code Red 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9227161_01.jpg" },
    { "name": "Brillo Labial Jelly Pop De NYC Underground, 0.5 Oz", "price": "2.50", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9199320_01.jpg" },
    { "name": "Bálsamo Labial Doritos® Nacho Cheese 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222472_01.jpg" },
    { "name": "Bálsamo Labial Jolly Rancher™ 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/5bassets/prod-hts/spree/images/1892817/original/4166632-00_A.jpg" },
    { "name": "Exfoliante Labial De Sandía", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9225732_01.jpg" },
    { "name": "Bálsamo Labial 7up® Cherry 0.14 Oz", "price": "2.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9222462_01.jpg" },

    // --- STYLE (Imported from p=2) ---
    { "name": "Guantes Con El Logotipo De Los Dallas Cowboys De La NFL", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9243002_01.jpg" },
    { "name": "Pinzas Para El Pelo Style Hairology (Paquete De 12)", "price": "3.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9140750_01.jpg" },
    { "name": "Mochila Transparente Con Correas Sólidas De 15 Pulgadas", "price": "2.50", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9127702_01.jpg" },
    { "name": "Mini Mochila Con Licencia (A)", "price": "15.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203021_01.jpg" },
    { "name": "Mini Mochila Con Licencia (B)", "price": "15.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203022_01.jpg" },
    { "name": "Mini Mochila Con Licencia (C)", "price": "15.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9203020_01.jpg" },
    { "name": "Guantes Con Logotipo De Puntos Degradados De Los Dallas Cowboys De La NFL", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9243009_01.jpg" },
    { "name": "Juego De Accesorios Para Vasos", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9218066_01.jpg" },
    { "name": "Calcetines De Cabina Con Licencia", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9208044_01.jpg" },
    { "name": "Sudadera Con Capucha De Forro Polar Sólido", "price": "2.78", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9114048_01.jpg" },
    { "name": "Guantes Con El Logotipo Rosa Intenso De Los Philadelphia Eagles De La NFL", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9243271_01.jpg" },
    { "name": "Camiseta Gráfica De Wicked Glinda", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9217783_01.jpg" },
    { "name": "Camiseta Gráfica Chicken Tendies", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9173563_01.jpg" },
    { "name": "Conjunto De Gorro Y Guantes Kids Critter", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9204603_01.jpg" },
    { "name": "Luz Para Zapatos A Batería (2 Unidades)", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9118644_01.jpg" },
    { "name": "Gorro Del Club Del Fuego Infernal De Stranger Things De Netflix", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9202734_01.jpg" },
    { "name": "Camiseta Gráfica 'No Amigable'", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9173401_01.jpg" },
    { "name": "Bandas De Satén Twisters, 5 Unidades", "price": "3.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9141709_01.jpg" },
    { "name": "Conjunto De Joyas Con Dijes Y Cadenas", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9205148_01.jpg" },
    { "name": "Calcetines Cómodos (2 Pares)", "price": "5.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9208202_01.jpg" },
    { "name": "Mochila Para Niños Con Licencia (D)", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9189580_01.jpg" },
    { "name": "Mochila Para Niños Con Licencia (E)", "price": "7.00", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9185668_01.jpg" },
    { "name": "Mochila Para Niños Con Licencia (F)", "price": "3.50", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9189579_01.jpg" },
    { "name": "Camiseta Gráfica Wicked", "price": "5.55", "imageUrl": "https://fbres.fivebelow.com/image/upload/t_medium,f_auto,q_auto/product/9198256_01.jpg" }
];

export const importFiveBelowProducts = async () => {
    try {
        toast.loading(`Importando catálogo extendido de Five Below (actualizando precios)...`);
        const productsCollection = collection(db, 'products');
        let importedCount = 0;
        let updatedCount = 0;

        for (const item of fiveBelowData) {
            try {
                // Verificar si el producto ya existe por nombre
                const q = query(productsCollection, where("name", "==", item.name));
                const querySnapshot = await getDocs(q);

                const price = parseFloat(item.price.replace('$', ''));

                // Asignar categoría auto-detectada
                let category = 'Electrónicos'; // Default
                const nameLower = item.name.toLowerCase();

                if (nameLower.includes('parfum') || nameLower.includes('perfume') || nameLower.includes('toilette') || nameLower.includes('bruma') || nameLower.includes('cologne') || nameLower.includes('scent')) {
                    category = 'Perfumes'; // Los pondremos en Perfumes o Belleza según prefieras, o 'Belleza' y una subcat
                } else if ((nameLower.includes('peluche') || nameLower.includes('juego') || nameLower.includes('figura') || nameLower.includes('rompecabezas') || nameLower.includes('fuggler') || nameLower.includes('squish') || nameLower.includes('disney') || nameLower.includes('marvel')) && !nameLower.includes('camiseta')) {
                    category = 'Juguetes';
                } else if (nameLower.includes('manta') || nameLower.includes('almohada') || nameLower.includes('luz') || nameLower.includes('proyector')) {
                    category = 'Hogar';
                } else if (nameLower.includes('crema') || nameLower.includes('tónico') || nameLower.includes('gloss') || nameLower.includes('maquillaje') || nameLower.includes('balm') || nameLower.includes('bálsamo') || nameLower.includes('labial') || nameLower.includes('lip')) {
                    category = 'Belleza';
                } else if (nameLower.includes('camiseta') || nameLower.includes('shirt') || nameLower.includes('sudadera') || nameLower.includes('hoodie') || nameLower.includes('guantes') || nameLower.includes('ropa')) {
                    category = 'Ropa';
                }

                // Generar SKU único usando timestamp para evitar colisiones
                const sku = `FB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const productData = {
                    description: `Producto exclusivo importado de USA - ${category} de alta calidad.`,
                    category: category,
                    origin: 'fivebelow',
                    cost: price,
                    salePrice1: parseFloat((price * 1.30).toFixed(2)),
                    salePrice2: parseFloat((price * 1.30).toFixed(2)),
                    originalPrice: parseFloat((price * 1.50).toFixed(2)),
                    weight: 0.30,
                    updatedAt: serverTimestamp()
                };

                if (!querySnapshot.empty) {
                    // Actualizar existente
                    const docRef = querySnapshot.docs[0].ref;
                    await updateDoc(docRef, productData);
                    updatedCount++;
                } else {
                    // Crear nuevo
                    await addDoc(productsCollection, {
                        name: item.name,
                        ...productData,
                        sku: sku,
                        imageUrl: item.imageUrl,
                        images: [],
                        createdAt: serverTimestamp()
                    });
                    importedCount++;
                }
            } catch (itemError) {
                console.error(`Error processing item ${item.name}:`, itemError);
                // Continue to next item
            }
        }

        toast.dismiss();
        if (importedCount > 0 || updatedCount > 0) {
            toast.success(`Proceso completado: ${importedCount} importados, ${updatedCount} actualizados.`);
        } else {
            toast('No hubo cambios en los productos.', { icon: 'ℹ️' });
        }
    } catch (error) {
        console.error('Error importing products:', error);
        toast.dismiss();
        toast.error('Error al importar productos.');
    }
};

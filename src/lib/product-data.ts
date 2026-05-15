import seladoraDisplay from "@/assets/seladora-display.png";
import seladoraCores from "@/assets/seladora-cores.jpeg";
import seladoraInstrucoes from "@/assets/seladora-instrucoes.png";
import dispenserHero from "@/assets/dispenser-hero.jpg";

export const PRODUCT = {
  name: "Mini Seladora Portátil",
  brand: "Casa Resolve",
  rating: 4.8,
  reviewCount: 1024,
  priceOriginal: 89.90,
  pricePix: 49.90,
  priceCard: 49.90,
  installments: { count: 3, value: 16.63 },
  pixDiscount: 44,
  freeShipping: true,
  images: [seladoraHero, seladoraUso, comboKit],
  // Mantido para compatibilidade do carrinho/checkout (1 variante)
  colors: [
    {
      name: "Padrão",
      hex: "#8FCB3A",
      img: seladoraHero,
      current: true,
      gallery: [seladoraHero, seladoraUso, comboKit],
    },
  ],
  sizes: ["Único"],
};

export const UPSELL = {
  name: "Dispenser de Papel Filme",
  price: 19.90,
  image: dispenserHero,
  description: "Use junto com a seladora e conserve seus alimentos por muito mais tempo.",
};

export const COMBO_IMAGE = comboKit;
export const ANTES_DEPOIS = "/src/assets/antes-depois.jpg";

export const REVIEWS = [
  { name: "Mariana S.", rating: 5, date: "02/05/2026", title: "Resolveu meu problema na cozinha", text: "Produto muito prático, uso todos os dias para fechar pacotes de café, biscoito e snacks. Vale cada centavo!" },
  { name: "Juliana R.", rating: 5, date: "28/04/2026", title: "Pequena e poderosa", text: "Cabe na palma da mão, sela tudo em segundos. Acabou o desperdício de comida em casa." },
  { name: "Camila P.", rating: 5, date: "20/04/2026", title: "Genial", text: "Não acredito que vivi sem isso até hoje. Sela qualquer embalagem rapidinho." },
  { name: "Renata M.", rating: 5, date: "15/04/2026", title: "Recomendo", text: "Chegou rápido, super fácil de usar. Já indiquei pra minha mãe e minhas amigas." },
  { name: "Patrícia D.", rating: 4, date: "10/04/2026", title: "Muito bom", text: "Funciona muito bem. Só precisa pegar o jeito da pressão correta." },
  { name: "Larissa F.", rating: 5, date: "05/04/2026", title: "Top!", text: "Resolveu o problema de sacos abertos na despensa. Agora tudo fica fresco." },
];

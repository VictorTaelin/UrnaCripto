## UrnaCripto

Um protocolo de referendos online criptograficamente seguro, onde um grupo de eleitores autorizados emite, secretamente, sua opinião sobre um tópico específico, chegando a um resultado que é matematicamente incorruptível, de forma independentemente verificável.

### Motivação

Em um país que faz da democracia seu pilar fundamental, torna-se necessária a existência de um sistema de eleição impecavelmente seguro. Nosso sistema atual não satisfaz essa condição, pois sua segurança depende da capacidade de nossos governantes de tornar "a urna" inviolável. Grandes empresas como o Google, a Apple, e até mesmo bancos são invadidas frequentemente. Seria, portanto, ingenuidade acreditar que nossas urnas são imunes. De fato, existem numerosas acusações do contrário:

- [Suspeitas de Fraudes em Urnas Eletrônicas](http://tiagoalbuquerque.jusbrasil.com.br/noticias/143481950/suspeitas-de-fraudes-em-urnas-eletronicas?ref=topic_feed)

- [Urna eletrônica pode ser fraudada? Especialistas explicam](http://eleicoes.uol.com.br/2014/noticias/2014/08/29/especialistas-alertam-para-possibilidade-de-fraudes-na-urna-eletronica.htm)

- [VOTO ELETRÔNICO: HACKER REVELA NO RIO COMO FRAUDOU ELEIÇÃO](http://www.pdt.org.br/index.php/voto-eletronico-hacker-revela-no-rio-como-fraudou-eleicao/)

- [Exclusivo: especialista demonstra como as eleições de 2014 podem ter sido fraudadas](http://spotniks.com/exclusivo-especialista-demonstra-como-as-eleicoes-de-2014-podem-ter-sido-fraudadas/)

Indiferente à validez dessas acusações, a lição histórica torna claro que impedir a sabotagem de sistemas eletrônicos é praticamente impossível. No modelo UrnaCripto aqui proposto, e graças a recentes avanços no campo da criptografia, é possível que cada eleitor tenha não somente convicção, mas provas irrefutáveis de que todas as características necessárias para se chegar ao resultado final foram honradas, inclusive a ausência de votos duplicados, a inviolabilidade do voto secreto, a imunidade contra invasões e a exatidão da contagem final.

### Funcionamento

O protocolo funciona em 4 etapas, todas executáveis por cada eleitor de forma independente, transparente e distribuída, através de aplicativos de código aberto instalados em seus respectivos celulares, computadores, ou em urnas locais, sem a existência de um servidor central com qualquer tipo de informação sigilosa.

1. Emissão de título

  Todo eleitor interessado em participar de um referendo emite (preferencialmente desconectado da internet, em um computador de confiança), utilizando uma implementação de `gen`, conforme proposta em \[1\], um par de chaves pública/privadas de um grupo cíclico de ordem prima `p` previamente combinado para qual o problema do logarítmo discreto seja conjecturalmente difícil. Este eleitor divulga a chave pública e guarda a chave privada em local seguro.

2. Criação de um referendo

  Para criar um referendo, todas as partes envolvidas concordam em um "id", um "título", uma "proposta", uma "lista de opções" e uma "lista de eleitores autorizados" (chaves públicas). Estas informações são então publicadas em um meio de comunicação comum, podendo ser este, sem perda de segurança, um ou mais servidores centrais.
  
3. Votação

  Cada eleitor assina, utilizando a função `sign`, também proposta em \[1\], uma mensagem declarando sua intenção de votar em determinada opção, em nome da "lista de eleitores autorizados" previamente concordada. Ele, então, divulga essa assinatura neste meio de comunicação comum.

4. Contagem

  Passado um tempo após o término do referendo, cada eleitor opta ou por realizar uma contagem independente de votos, ou por aceitar a contagem realizada por alguma parte de sua confiança. Para realizar uma contagem independente, um eleitor deve:

  1. Reunir os votos assinados divulgados na etapa 3;

  2. Utilizar a função `verify`, também proposta em \[1\], para remover votos que não vieram de eleitores autorizados;
  
  3. Utilizar a função `link`, também proposta em \[1\], para desqualificar eleitores que votaram mais de uma vez;
  
  4. Realizar uma contagem simples das opções declaradas nos votos restantes.
  
  Essa contagem final é, de forma irrefutável, o verdadeiro resultado do referendo. Não somente, devido à natureza das assinaturas de anel encadeadas, essas informações são insuficientes para determinar o voto de cada parte, estabelecendo o voto secreto. Finalmente, como o sistema trabalha exclusivamente com informações públicas, qualquer tentativa de "invasão" é naturalmente inofensiva.

### Implementação

- As funções `gen`, `sign`, `verify` e `link`, conforme propostas em \[1\], foram implementadas em PureScript, no repositório [github.com/maiavictor/lrs](https://github.com/maiavictor/lrs).

- Uma interface web, disponível neste repositório, foi implementada em React, de modo a facilitar a interação do usuário final com as devidas funções criptográficas.

- Um servidor web, disponível neste repositório, foi implementado em Node.js/Express, fornecendo uma API Rest que faz o papel de meio de comunicação comum.

Um demo do resultado está atualmente disponível [neste link](http://urnacripto.tech).

### Referência

\[1\] Liu, Joseph K.; Wong, Duncan S. (2005). "Linkable ring signatures: Security models and new schemes". ICCSA. 2: 614–623. [doi](https://en.wikipedia.org/wiki/Digital_object_identifier):[10.1007/11424826_65](http://link.springer.com/chapter/10.1007%2F11424826_65).

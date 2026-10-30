# NVIDIA (pt-BR): tabela de motion beats

Voz original: ElevenLabs, speed 1.15, fala 0 a 54,98 s, personagem sai pro canto em 55,19 s, vídeo 56,94 s (tempos no tempo da narração).
Tempos absolutos; palavras em `public/vo_words.json`. Regras de motion da skill explainer-reel (fase 4) valem todas.
Palco 1080 x 1100, ação principal em y 40 a 720. Objetos GRANDES. Nada parado mais de 1,2 s (exceto número segurado, com vida).

## Contratos de continuidade (estado exato na fronteira)

| Fronteira | Estado |
|---|---|
| S01 -> S02 (3,30) | só um CHIP grande no centro: quadrado tinta 300x300 centrado em (540,360), cantos rx 18, 7 pinos amarelos por lado, miolo verde 180x180 com texto "NVIDIA" (size 40, peso 900). Desenhar com o componente `NvChip` definido e exportado em S01_Hook.tsx |
| S02 -> S03 (7,65) | só um `Gpu` (kit) w=360 em (540,330), fan girando, glow 0 |
| S03 -> S04 (12,75) | só uma `Coin` (kit) r=90 em (540,330), flip 0 |
| S04 -> S05 (16,80) | só um `Gpu` (kit) w=420 em (540,300), glow 0 |
| S05 -> S06 (22,90) | rede neural: 3 colunas x=[380,540,700], contagens [3,4,3], centro y=330, espaçamento 90, nó r=22 creme com contorno tinta 5, arestas tinta 3 entre camadas vizinhas |
| S06 -> S07 (30,65) | só um `Rack` (kit) w=240 h=400 em (540,360), lit=1, slots=5 |
| S07 -> S08 (38,00) | só a barra vazia da receita: rect x 110 a 970, y 365 a 475, rx 10, fill C.cream, stroke C.ink 5 |
| S08 -> S09 (43,18) | só o bloco de lucro: rect centrado (540,420) w=300 h=110 rx 8 fill C.green stroke tinta 5, texto "US$ 120 bi" (44, peso 900) |
| S09 -> S10 (50,80) | `NvChip` (de S01) em (540,170) escala 0.55; três `Building` (kit) w=170 h=220 em x=[230,540,850], y=470, rótulos "Google", "Amazon", "Microsoft" (Txt 34, peso 900) em y=610 |
| S10 fim | palco vazio até 55,25 (o personagem assume o quadro no disparo do loop) |

## S01 Hook (0,00 a 3,30) "A empresa mais valiosa do mundo não tem uma única fábrica."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 0,00 | A empresa | 5 barras de valor de mercado | brotam do chão em sequência, baixas | ranking se monta | pop x5 |
| 0,61 | mais valiosa | barra NVIDIA | dispara pra cima, passa todas, coroa cai nela | contador "US$ 5,16 TRI" | whoosh + ding |
| 1,39 | do mundo | globo pequeno | gira atrás da barra | | tick |
| 1,70 | não tem | fábrica com chaminé | cai ao lado da barra com fumaça | | impact |
| 2,29 | única fábrica | carimbo X vermelho | X bate, fábrica desmonta em tijolos que caem | tijolos somem | stamp + crack |
| 2,90 | (transição) | barra NVIDIA | encolhe e dobra num chip | vira NvChip do contrato | whoosh |

## S02 Desenha (3,30 a 7,65) "A NVIDIA só desenha o chip. Quem fabrica é a TSMC, em Taiwan."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 3,38 | A NVIDIA | NvChip | vira planta azul-roxa (blueprint) achatando | | whoosh |
| 3,99 | só desenha | lápis grande | desenha trilhas do circuito no blueprint | traços se constroem | scribble |
| 4,63 | o chip | etiqueta "projeto" | carimba no blueprint | | stamp |
| 5,14 | Quem fabrica | blueprint | dobra em avião de papel e voa em arco pra direita | | whoosh |
| 5,89 | TSMC | fábrica TSMC | brota grande à direita, chaminés soltam fumaça | avião entra na fábrica | impact + pop |
| 6,30 | (fabricação) | esteira | sai da fábrica pra esquerda, chips saem 1, 2, 3 | | click x3 |
| 6,98 | Taiwan | alfinete de mapa + ilha | crava sob a fábrica, rótulo "Taiwan" | | pop |
| 7,30 | (transição) | último chip | cresce e vira o Gpu do contrato; fábrica e esteira saem | | whoosh |

## S03 Margem (7,65 a 12,75) "E de cada cem dólares que ela vende, setenta e um sobram depois de pagar a fabricação."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 7,78 | E de cada | etiqueta de preço | pendura no Gpu e balança | | click |
| 8,64 | cem dólares | moedas | 100 moedas chovem e empilham em 10 colunas de 10 | contador 0 a 100 | ticker + coins |
| 9,60 | vende | Gpu | sai voando pra fora (vendido) | | whoosh |
| 10,10 | setenta e um | colunas | 7,1 colunas ficam verdes, 2,9 ficam cinza | divisória 71 / 29 | ding |
| 11,16 | depois de pagar | caminhão TSMC | entra, as 29 moedas cinza pulam pra caçamba, ele sai | | coin x3 + whoosh |
| 11,90 | fabricação | carimbo | "MARGEM 71%" carimba sobre as 71 | | stamp |
| 12,30 | (transição) | pilha | as 71 moedas se fundem numa moeda grande | vira Coin r=90 do contrato | whoosh |

## S04 Origem (12,75 a 16,80) "Tudo começou numa lanchonete, em noventa e três, com placa de vídeo pra game."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 12,81 | Tudo começou | moeda | gira e mostra "1993" no verso | | whoosh |
| 13,61 | lanchonete | balcão de lanchonete + 3 banquinhos + letreiro DINER | moeda vira a placa do letreiro, balcão sobe do chão | | impact + pop x3 |
| 14,42 | noventa e três | 3 canecas | caem no balcão uma a uma, vapor | | clink x3 |
| 15,42 | placa de vídeo | Gpu | sai de dentro de um fliperama que surge, tela com cubo 3D girando | | powerup |
| 16,38 | game | controle (kit) | pula na frente, botões piscam | | boing |
| 16,55 | (transição) | tudo menos o Gpu | sai; Gpu centraliza w=420 | | whoosh |

## S05 Pulo do gato (16,80 a 22,90) "O pulo do gato: essa placa faz milhares de contas ao mesmo tempo, igualzinho ao que uma IA precisa."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 17,03 | pulo do gato | gato (silhueta simples, tinta) | salta em arco por cima do Gpu e some | piada visual literal | boing + whoosh |
| 18,16 | essa placa | Gpu | fans aceleram, placa vibra | | whir |
| 19,05 | milhares de contas | grade | 4 vira 16 vira 64 vira 256 células "+ × −" | | pops acelerando |
| 19,30 | (contraste) | CPU pequena à esquerda | faz 1 conta por vez | | tick lento |
| 20,11 | ao mesmo tempo | grade | todas acendem juntas | | chord |
| 20,91 | igualzinho | células | voam e viram a rede neural do contrato | | whoosh + zip |

## S06 CUDA (22,90 a 30,65) "Em dois mil e seis, soltou o CUDA, de graça. Milhões de programadores aprenderam IA nele... e ficaram presos."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 23,25 | dois mil e seis | contador de ano | 1993 rola até 2006 | rede encolhe pra dentro do contador | ticker |
| 24,61 | soltou | caixa de presente | cai com quique | | impact |
| 25,36 | CUDA | laço | desfaz, tampa voa, sai o logo "CUDA" | | pop |
| 26,09 | de graça | etiqueta "US$ 0" | pendura e balança | | ding |
| 27,24 | Milhões de programadores | bonequinhos (Person) | 6 vira 40 vira 150 em volta da caixa, pontos de código sobem | | pops acelerando |
| 28,93 | IA nele | linhas | cada bonequinho liga um fio na caixa | | zip |
| 29,70 | ficaram presos | jaula | despenca sobre todos com cadeado NVIDIA | | crack + impact |
| 30,20 | (transição) | jaula | grades se juntam e viram o Rack do contrato, bonequinhos somem dentro | | whoosh |

## S07 Dinheiro (30,65 a 38,00) "Agora, o dinheiro: um rack com setenta e dois chips custa uns três milhões de dólares, e big tech compra aos milhares."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 30,78 | Agora | máquina registradora | brota ao lado do rack, gaveta abre | | cash |
| 32,51 | rack | Rack | gavetas abrem | | click |
| 32,96 | setenta e dois chips | 72 chips | voam pra dentro do rack em rajada, contador 0 a 72 | | ticker |
| 34,18 | três milhões | etiqueta "≈ US$ 3 mi" | balança pendurada no rack, registradora mostra 3.000.000 | | cash + ding |
| 36,35 | big tech | rack | multiplica 1, 10, 100, 1.000 em grade que vai encolhendo (zoom out) | | pops |
| 37,29 | milhares | contador "x 1.000" | carimba | | stamp |
| 37,60 | (transição) | grade de racks | colapsa numa linha e vira a barra vazia do contrato | | whoosh |

## S08 Receita (38,00 a 43,18) "No último ano: duzentos e dezesseis bilhões de receita. Mais da metade virou lucro."

Partindo da barra vazia (código em `scenes/S08_Receita.tsx`):
moedas enchem a barra, contador US$ 0 a 215,9 bi (bate em 40,8), "+65% no ano", tesoura corta em 55,6% em 41,7,
o pedaço vira verde "lucro US$ 120 bi" em 42,5, o resto cai cinza ("custos e impostos"), termina no bloco do contrato.

## S09 Risco (43,18 a 50,80) "Minha leitura: o risco mora no cliente. Dois compradores pagaram mais de um terço da conta, e as big techs já desenham chip próprio."

| t | gatilho | objeto | ação | transformação | SFX |
|---|---|---|---|---|---|
| 43,26 | Minha leitura | personagem | `hops: [43.26]` | bloco verde vira NvChip no topo | boing |
| 44,35 | risco | alerta | triângulo pula e balança | | alert |
| 45,83 | Dois compradores | 2 bonequinhos gigantes | brotam com sacos de dinheiro "22%" e "14%" | | pop x2 |
| 46,68 | pagaram | fatia | uma pizza de receita surge, 36% dela vai pras mãos dos dois | | snip |
| 47,52 | um terço | rótulo | "36% da receita" carimba | | stamp |
| 48,61 | big techs | 3 prédios | Google, Amazon, Microsoft brotam (os 2 gigantes viram prédios) | | pop x3 |
| 49,27 | desenham chip próprio | lápis | desenha chip em cada prédio: TPU, Trainium, Maia | | scribble x3 |
| 50,40 | (transição) | tudo | assenta no estado do contrato | | |

## S10 Pá (50,80 a fim) "Na corrida do ouro da IA, a NVIDIA não cava. Ela vende a pá."

Código em `scenes/S10_Pa.tsx`, partindo do contrato: prédios viram mineiros cavando pepitas (51,1),
NvChip vira loja com balcão de pás-GPU (52,5), pá com X em "não cava" (53,3), pás voam pros mineiros em "vende a pá"
(54,16 a 54,6) com moedas voltando, tudo implode no centro em 54,95 a 55,25. Sem cartão final: o personagem fecha o loop.

## Checagem de reprovação

- (a) nenhuma cena é layout pronto com deslize: todas constroem ou transformam o objeto do contrato anterior.
- (b) ponto mais parado: S08 entre 40,8 e 41,6 (número segurado, com moedas assentando e brilho).
- (c) motion principal por cena: ranking que dispara, desenho e voo, chuva e divisão, giro e montagem, salto e multiplicação, presente e jaula, rajada e zoom out, enchimento e corte, crescimento e lápis, troca. Nenhum repete o anterior.
- (d) toda frase tem 2 ou mais ações físicas.

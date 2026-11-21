# Grau, material e fase dos equipamentos

O **grau** (0 a 5) decide o material, o nome e o desenho do item (armadura, luvas, arma e acessório). Ele depende da **fase** do item e do **nível do item** (`GRADE_TABLE`/`gradeOfLvl` em `src/data.js`). Os níveis abaixo são os exibidos na escala da fase.

| Fase | Faixa de nível | Grau |
|---|---|---|
| Mortal (1–299) | 1–29 · 30–79 · 80–119 · 120–189 · 190–249 · 250+ | 0 · 1 · 2 · 3 · 4 · 5 |
| Imortal (1–199) | 1–40 · 41–90 · 91–160 · 161–199 | 1 · 2 · 3 · 4 (121–199 mistura 3 e 4: 3 até 160, 4 depois) |
| Ancestral (1–149) | 1–99 · 100–149 | 4 · 5 |
| Supremo (1–50) | 1–50 | 5 |

Como o nível interno dos itens é inteiro (1 a 50), os níveis reais onde o grau muda saem 1 a 2 pontos diferentes da faixa acima:

| Fase | Nível do jogador | Grau | Nível do item (exibido) | Vanguarda | Arcanista | Caçadora | Invocador |
|---|---|---|---|---|---|---|---|
| Mortal (1–299) | usa a partir do nível 1 | 0 | 1 a 25 | de Ferro Velho | de Linho | de Couro Cru | de Peles |
| Mortal (1–299) | usa a partir do nível 31 | 1 | 31 a 74 | de Ferro | de Lã Encantada | de Couro Batido | de Presas |
| Mortal (1–299) | usa a partir do nível 80 | 2 | 80 a 117 | de Aço | de Seda | de Couro Curtido | de Escamas |
| Mortal (1–299) | usa a partir do nível 123 | 3 | 123 a 183 | de Aço Rúnico | de Seda Rúnica | de Couro Rúnico | de Ossos Rúnicos |
| Mortal (1–299) | usa a partir do nível 190 | 4 | 190 a 244 | de Ouro Real | de Seda Real | de Couro Real | de Peles Reais |
| Mortal (1–299) | usa a partir do nível 250 | 5 | 250 a 299 | de Aço Celeste | de Éter Celeste | de Couro Celeste | de Penas Celestes |
| Imortal (1–199) | usa a partir do nível 1 | 1 | 1 a 37 | de Ferro | de Lã Encantada | de Couro Batido | de Presas |
| Imortal (1–199) | usa a partir do nível 41 | 2 | 41 a 90 | de Aço | de Seda | de Couro Curtido | de Escamas |
| Imortal (1–199) | usa a partir do nível 94 | 3 | 94 a 159 | de Aço Rúnico | de Seda Rúnica | de Couro Rúnico | de Ossos Rúnicos |
| Imortal (1–199) | usa a partir do nível 163 | 4 | 163 a 199 | de Ouro Real | de Seda Real | de Couro Real | de Peles Reais |
| Ancestral (1–149) | usa a partir do nível 1 | 4 | 1 a 98 | de Ouro Real | de Seda Real | de Couro Real | de Peles Reais |
| Ancestral (1–149) | usa a partir do nível 101 | 5 | 101 a 149 | de Aço Celeste | de Éter Celeste | de Couro Celeste | de Penas Celestes |
| Supremo (1–50) | usa a partir do nível 1 | 5 | 1 a 50 | de Aço Celeste | de Éter Celeste | de Couro Celeste | de Penas Celestes |

## Poder do item (não muda com o material)
O **poder** (ataque, defesa, vida, mana...) usa o grau de poder `pg`: as faixas do Mortal pelo nível do item, igual em todas as fases. Assim subir de fase não multiplica o poder do equipamento além do multiplicador da fase (`TMUL`); só o material/nome/desenho acompanham a tabela acima.

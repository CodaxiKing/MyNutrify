# Atribuição — Biblioteca de exercícios

A biblioteca de exercícios do MyNutrify (`shared/exercise-db.json`, gerada por
`scripts/build-exercise-db.mjs`) é derivada do dataset
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset).

## Dados textuais — MIT

Nomes, categorias, regiões do corpo, equipamentos, músculos-alvo e as instruções
passo a passo estão sob a **licença MIT**:

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Mídias (imagens e GIFs) — © Gym visual

> ⚠️ As imagens e animações do dataset são propriedade da **Gym visual**
> (https://gymvisual.com/) e **não** estão cobertas pela licença MIT acima.

### Como o app usa

As mídias **não são redistribuídas** neste repositório. O
`shared/exercise-db.json` guarda apenas o `mediaId` de cada exercício, e o app
carrega a imagem direto da origem, via CDN:

```
https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/<id>-<mediaId>.gif
```

A atribuição obrigatória — `© Gym visual — https://gymvisual.com/` — é
renderizada sobre toda mídia exibida, e a resolução original de 180×180 é
preservada.

### Antes de publicar

Uso pessoal carregando da origem com atribuição é uma coisa; **distribuir o app
numa loja é outra**. Os termos da Gym visual regem o uso:

> https://gymvisual.com/content/3-terms-and-conditions-of-use

Se for publicar, obtenha a sua própria licença junto à Gym visual. Clonar o
dataset **não** concede direito sobre as mídias.

### Como desligar ou trocar a origem

A variável `VITE_EXERCISE_MEDIA_BASE_URL` controla:

| Valor | Efeito |
|---|---|
| vazio (padrão) | Carrega do CDN do dataset upstream |
| `off` | Desliga as mídias; o app mostra um ícone no lugar |
| uma URL | Usa o seu próprio storage (depois de licenciar) |

## Sobre o openGym

O projeto [openGym](https://github.com/arvids-unavailable/openGym) usa o mesmo
dataset upstream, mas o **código-fonte do openGym é AGPL v3**. Nenhum código do
openGym foi copiado para o MyNutrify — apenas o dataset MIT original é usado
aqui, para manter o MyNutrify sob a licença MIT.

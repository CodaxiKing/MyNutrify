# Contador de passos Android

O card ativa um serviço em primeiro plano do tipo `health`, com sensor
`TYPE_STEP_COUNTER` e notificação contínua e silenciosa. A WebView pode ser
fechada: o serviço mantém os totais no aparelho e atualiza a notificação. Não
precisa de GPS nem de internet para contar. A sincronização com a API ocorre
quando o aplicativo é aberto, volta ao primeiro plano ou recupera a conexão.

## Persistência e estados

- Os totais são separados por conta e data local e retidos por até 90 dias.
- Cada evento consome somente a diferença desde a leitura anterior. Reiniciar
  o telefone preserva os totais e inicia um novo segmento do sensor.
- A data usa o horário do evento do sensor, e não o momento de abrir a tela.
- Ativar pela primeira vez aproveita o total já carregado do servidor. Não é
  possível recuperar passos anteriores à primeira ativação do sensor.
- Pausar remove a notificação e a referência do sensor. Retomar não contabiliza
  o intervalo em que a contagem estava desligada.
- Activity Recognition pausa em veículo. Sair do veículo ou detectar caminhada
  ou corrida retoma sem esperar uma amostra do sensor. Falhas de registro do
  filtro são mostradas no card.
- A meta é salva no aparelho; no Android ela também aparece na notificação.
- Distância e calorias são estimativas calculadas com o perfil.

## Limites do Android

Permissões de atividade física e notificações são solicitadas ao ativar. Se
notificações forem negadas, o Android pode executar o serviço sem mostrar o
contador na gaveta de notificações. O usuário pode alterar isso nas configurações.

`BOOT_COMPLETED` tenta retomar a contagem previamente ativada. “Forçar parada”,
a parada pelo gerenciador de apps ativos e restrições de bateria do fabricante
podem interromper a coleta; abrir o app permite retomá-la. Uma notificação
`ongoing` também pode ser dispensada em certas versões do Android. Não há como
garantir coleta durante uma parada imposta pelo sistema ou usuário.

Transições de atividade podem chegar com atraso. Intervalos agregados pelo
sensor são atribuídos à data e ao estado disponíveis na leitura; não é possível
reconstruir com exatidão um intervalo que atravessou a meia-noite ou uma transição
enquanto o sistema não entregava eventos.

Referências: [serviços de saúde](https://developer.android.com/develop/background-work/services/fgs/service-types#health),
[restrições de início em segundo plano](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).

## Validação

Automatizada: `npm run check`, `npm run build`, e no diretório Android
`gradlew :app:testDebugUnitTest :app:assembleDebug`. Para empacotar a interface
atualizada, executar `npm run apk:sync` antes de montar o APK.

Roteiro no aparelho físico (necessário para validar sensores e política de bateria):

1. Ativar o contador, aceitar atividade física e notificações; caminhar e comparar
   card e notificação. A primeira leitura estabelece a referência do sensor.
2. Fechar a tela e remover o app dos recentes; caminhar e verificar a notificação.
3. Reiniciar o telefone no mesmo dia; confirmar que o total anterior permanece.
4. Caminhar antes e depois da meia-noite sem abrir o app; conferir ambos os dias.
5. Entrar/sair de carro ou ônibus e caminhar novamente; confirmar pausa/retomada.
6. Ficar sem internet, caminhar, reabrir e reconectar; conferir sincronização e histórico.
7. Pausar/retomar; confirmar que o período pausado não entra no total.
8. Alterar a meta e trocar de conta; conferir que os históricos ficam separados.
9. Negar notificações e revogar atividade física; verificar mensagens e recuperação.

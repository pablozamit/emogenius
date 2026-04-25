# Registro de Checkpoints - EmoGenius

## [2026-04-25] - Implementación de Batalla 2v2
**ID de Conversación:** ee8e56bc-ea2f-4a0b-9ed4-0d0a21fb4da6

### Cambios Realizados:
- Creación de `src/services/battleService.ts` para gestión multijugador 2v2.
- Creación de componentes en `src/components/Battle2v2/` (Battle2v2, Lobby, MatchView).
- Modificación de `src/types.ts` para incluir estructuras de batalla.
- Integración en `src/App.tsx` con un nuevo modo de juego "Batalla 2v2".
- Ajuste de `src/components/EmojiPicker.tsx` para mayor flexibilidad visual.
- Sincronización completa con GitHub en branch `main`.

### Estado de la Aplicación:
- El modo Batalla 2v2 es funcional y permite matchmaking basado en Firestore.
- Se ha implementado una economía de 30 emojis con reglas de restricción hasta la ronda 6.
- El sistema de sabotaje permite bloquear emojis al equipo rival por un coste de 2 emojis.

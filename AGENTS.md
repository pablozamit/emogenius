# Manual Operativo para agentes de IA - EmoGenius

Este archivo (junto con `.agents`) sirve como la fuente de verdad para cualquier IA que trabaje en este repositorio.

## 1. Explicación de la Aplicación
EmoGenius es un juego de adivinanzas basado en emojis.
- **Objetivo:** Adivinar la frase o palabra asociada a un conjunto de emojis.
- **Modos:** Solo, Duo y Entrenamiento.
- **Funcionamiento clave:** Los retos se sincronizan desde `src/constants/challenges.ts` hacia una base de datos FirebaseFirestore.

## 2. Estructura del Proyecto
- `src/constants/challenges.ts`: **ARCHIVO CRÍTICO.** Contiene todos los retos del juego.
- `src/App.tsx`: Lógica principal, gestión de autenticación y "seeding" de la base de datos.
- `src/lib/firebase.ts`: Configuración del SDK de Firebase.

## 3. Mecanismos de Acción

### Sincronización con GitHub (Obligatorio)
Cualquier cambio en el código debe ir seguido de un push inmediato:
```bash
git add .
git commit -m "Descripción"
git push origin main
```

### Actualización de Retos (Firebase)
- Para añadir retos: Editar `challenges.ts`.
- Para forzar una limpieza y recarga total de la base de datos: Cargar `https://emogenius.vercel.app?clean=true`. Esto borra la colección de Firestore y la vuelve a llenar con lo que haya en el código.

### Reglas de Comunicación
- **Idioma:** Siempre en **español**.
- **Seguridad:** No borrar retos existentes sin permiso explícito. Preferir siempre añadir o modificar líneas específicas.

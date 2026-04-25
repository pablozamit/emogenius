# Guía para Agentes de IA - EmoGenius

Este archivo contiene las instrucciones operativas para cualquier IA que trabaje en este proyecto.

## Reglas de Oro
1. **Sincronización Automática:** SIEMPRE que se realice un cambio en el código, se debe ejecutar un commit y un push a la rama `main` de forma inmediata. No es necesario pedir permiso para subir cambios confirmados.
2. **Idioma:** La comunicación con el usuario debe ser siempre en **español**.
3. **Estructura de Retos:** Los nuevos retos se añaden en `src/constants/challenges.ts` siguiendo la interfaz `Challenge`.

## Comandos de Git Obligatorios post-edición
```bash
git add .
git commit -m "Descripción breve del cambio"
git push
```

## Contexto del Proyecto
- **Tecnologías:** React + Vite + TypeScript.
- **Servicios:** Firebase (Firestore) y Gemini API para la generación/validación de retos si fuera necesario.
- **Objetivo:** Un juego de adivinar conceptos mediante emojis con modos Solo, Duo y Entrenamiento.

## Gestión de Dependencias
Antes de instalar nuevos paquetes, verificar si ya existen en `package.json`. Preferir soluciones ligeras.

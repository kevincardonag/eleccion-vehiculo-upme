# 🚗 Nuestra Próxima Camioneta — Guía & Comparador Familiar (Colombia + UPME)

Aplicación web interactiva diseñada para evaluar en pareja la compra de vehículo híbrido en Colombia, entender conceptos clave en minutos y comparar beneficios tributarios **UPME**.

## ✨ Características principales

1. **🎓 Guía Rápida y Clara para los Dos**:
   - Diferencias reales y sin tecnicismos pesados entre **Híbrido Ligero (MHEV)**, **Híbrido Completo (HEV)**, **Eléctrico de Rango Extendido (e-POWER)** e **Híbrido Enchufable (PHEV)**.
   - Explicación de **por qué Mazda y Suzuki (MHEV) no aplican a los beneficios tributarios de la UPME**, y por qué la **Nissan X-Trail e-POWER sí aplica**.
   - **Diccionario Práctico**: Cajas de cambios (e-CVT vs Automática 6 vel vs DCT/DSG vs DHT), Motores (Turbo vs Aspirado) y Seguridad Esencial (**ADAS**, airbags, tracción AWD).
   - **Calculadora Interactiva UPME y Ahorro de Combustible**: Simula el beneficio tributario en renta (hasta 50% del valor del vehículo) y el ahorro anual en gasolina.

2. **📋 Fichas Generales y Catálogo de Candidatos**:
   - Fichas completas de todos los vehículos seleccionados:
     - **HEV (Híbridos Completos):** Toyota Corolla Cross, Renault Koleos Full Hybrid E-Tech, Kia Sportage Vibrant HEV, Hyundai Tucson Híbrida, Hyundai Kona Híbrida N-Line, Ford Territory FHEV, Ford Escape HEV, Subaru Crosstrek e-Boxer, Honda CR-V Advanced e:HEV.
     - **e-POWER (Rango Extendido):** Nissan X-Trail e-POWER.
     - **PHEV (Híbridos Enchufables):** BYD Song Plus DM-i, Cupra Formentor PHEV.
     - **Referencia MHEV (Descartados por UPME):** Mazda (CX-30/CX-5 MHEV) y Suzuki (Grand Vitara/Fronx SHVS).
   - Comparativa especial directa: **¿Ford Territory Híbrida o Ford Escape Híbrida?**

3. **💚 Evaluación en Pareja (Lo que nos gusta y lo que no)**:
   - Calificación independiente de **Él** y **Ella** (1 a 5 estrellas) con cálculo automático de **Puntaje de Pareja**.
   - Listado editable de **Cosas que nos gustan (Pros)** y **Cosas que no nos gustan / Dudas (Contras)** en cada vehículo.
   - Campo para anotar **precio cotizado en concesionario, bono o contacto del asesor**.
   - Guardado automático en el navegador (`localStorage`), exportación/importación de respaldo JSON y **generador de resumen para enviar por WhatsApp**.

4. **⚖️ Comparador Cara a Cara**:
   - Compara hasta 3 vehículos lado a lado con sus especificaciones técnicas, elegibilidad UPME, espacio de baúl, potencia y sus notas personales.

---

## 🚀 Cómo ejecutar localmente

Puedes abrir directamente `index.html` en tu navegador o levantar un servidor local:

```bash
npm start
# Abre http://localhost:4173 en tu navegador
```

## 🌐 Cómo desplegar gratis en internet (para ver desde los celulares)

Esta aplicación es 100% estática y sin dependencias externas pesadas, por lo que puedes desplegarla en segundos en cualquiera de estas plataformas:

- **Netlify Drop (en 10 segundos sin cuenta técnica):** Entra a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la carpeta `eleccion-vehiculo-upme`.
- **Vercel:** Ejecuta `npx vercel` dentro de esta carpeta o conéctala desde un repositorio de GitHub.
- **GitHub Pages:** Sube los archivos a un repositorio de GitHub y activa *Settings > Pages*.

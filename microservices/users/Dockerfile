# Usar la imagen oficial de Node.js como base
FROM node:20-alpine AS base

# Instalar dependencias necesarias para compilar módulos nativos
RUN apk add --no-cache python3 make g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS production

# Instalar dependencias necesarias para SQLite
RUN apk add --no-cache sqlite

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --production && npm cache clean --force

# Copiar archivos construidos desde la etapa base
COPY --from=base /app/dist ./dist
COPY --from=base /app/src ./src

# Crear directorio para la base de datos SQLite
RUN mkdir -p /app/data && chown -R nestjs:nodejs /app

# Cambiar al usuario no-root
USER nestjs

# Exponer el puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Comando para iniciar la aplicación
CMD ["node", "dist/main.js"]


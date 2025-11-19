FROM nginx:alpine

# Copiar configuración de NGINX
COPY nginx.conf /etc/nginx/nginx.conf

# Exponer puerto 80
EXPOSE 80

# NGINX se inicia automáticamente
CMD ["nginx", "-g", "daemon off;"]


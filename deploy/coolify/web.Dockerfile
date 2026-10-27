FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM nginx:stable-alpine
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY deploy/coolify/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

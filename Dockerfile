# Static demo served by nginx — ReadyChatAI animated inbox landing.
FROM nginx:alpine
COPY *.html /usr/share/nginx/html/
EXPOSE 80

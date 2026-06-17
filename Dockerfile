# Static preview served by nginx — replica of the RCAI production landing
# with the live animated inbox demo embedded in the hero.
FROM nginx:alpine
COPY index.html variant-realtime.html variant-cinematic.html variant-mascot.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 80

# Static preview served by nginx — replica of the RCAI production landing
# with the live animated inbox demo embedded in the hero.
FROM nginx:alpine
COPY index.html \
     variant-whatsapp.html variant-whatsapp-mobile.html \
     variant-instagram-a.html variant-instagram-b.html \
     variant-instagram-a-mobile.html variant-instagram-b-mobile.html \
     variant-facebook-messenger.html variant-facebook-messenger-mobile.html \
     variant-facebook-comments.html variant-facebook-comments-mobile.html \
     variant-widget.html variant-widget-mobile.html \
     variant-realtime.html variant-cinematic.html variant-concept.html \
     /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 80

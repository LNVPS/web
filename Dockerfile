FROM node:bookworm AS builder
ARG MODE=production
WORKDIR /src
COPY . .
RUN yarn && yarn build --mode $MODE

FROM nginx AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /src/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf
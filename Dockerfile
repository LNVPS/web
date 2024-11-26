FROM node:bookworm as builder
WORKDIR /src
COPY . .
RUN yarn && yarn build

FROM nginx as runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /src/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf
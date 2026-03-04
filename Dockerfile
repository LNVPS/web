FROM node:22-alpine AS builder
ARG MODE=production
WORKDIR /src

# Install dependencies in a separate layer so they are cached
# independently of source changes.
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ .yarn/
RUN yarn install --immutable

COPY . .
RUN yarn vite build --mode $MODE && yarn locale:compile

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /src/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

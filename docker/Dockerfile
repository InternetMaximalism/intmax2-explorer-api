FROM node:22.12.0-bookworm-slim AS builder

RUN apt-get update -y && apt-get install -y openssl

RUN corepack enable

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/*/package.json ./packages/
COPY . .

RUN yarn
RUN yarn build

FROM node:22.12.0-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable
WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=builder /app/packages ./packages

RUN yarn

EXPOSE $PORT
ENTRYPOINT ["yarn"]
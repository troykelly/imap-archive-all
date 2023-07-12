FROM node:18-slim AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . ./
RUN yarn build

FROM node:18-slim

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --production=true --frozen-lockfile

COPY --from=build /app/dist ./dist

CMD [ "node", "dist/main.js" ]

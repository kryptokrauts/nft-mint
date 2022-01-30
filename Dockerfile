FROM node:16-alpine

RUN adduser --disabled-password application && \
  mkdir -p /home/application/app/ && \
  chown -R application:application /home/application

USER application

WORKDIR /home/application/app

COPY .env .
COPY package.json .
COPY init_atomic_contracts.js .
COPY proton_monsters.js .

RUN npm install

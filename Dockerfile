FROM node:latest

ADD package*.json /app/
ADD prisma /app/prisma/
WORKDIR /app
RUN npm install
ADD . /app/
RUN mv /app/.env.docker /app/.env

EXPOSE 3000
VOLUME /app/logs

CMD [ "npm", "run", "start:migrate" ]

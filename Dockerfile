#FROM node:12
FROM node:12.16.2-alpine3.11
#FROM centos/nodejs-12-centos7

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./package*.json ./

# RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

# Assume the app only listens on 8080
EXPOSE 8080

CMD [ "node", "./bin/www" ]

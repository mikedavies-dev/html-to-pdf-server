FROM ghcr.io/puppeteer/puppeteer:24.4.0
USER root

ARG NODE_ENV=production

WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# ci instead of i or install to avoid updating the package-lock.json file and finish faster
RUN npm ci

# Copy app source
COPY . .

# # Build the app
RUN npm run build

# expose the port to outside world
EXPOSE 80

# start command as per package.json
CMD ["node", "src/index"]

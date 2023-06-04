# Creating multi-stage build for production
FROM node:18-alpine as build

WORKDIR /app/
COPY . .
RUN npm install
ENV PATH /app/node_modules/.bin:$PATH
RUN npm run build
RUN rm -rf ./node_modules
RUN npm install --production

# Creating final production image
FROM node:18-alpine
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /app/
COPY --from=build /app/node_modules ./node_modules
WORKDIR /app/
COPY --from=build /app ./
ENV PATH /app/node_modules/.bin:$PATH

RUN chown -R node:node /app
USER node
EXPOSE 1337
CMD ["npm", "run", "start:production"]
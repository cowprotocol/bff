# Creating multi-stage build for production
FROM node:18-alpine as build

WORKDIR /app/
COPY . .
RUN yarn install
ENV PATH /app/node_modules/.bin:$PATH
RUN yarn run build
RUN rm -rf ./node_modules
RUN yarn install --production

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
EXPOSE 1500
CMD ["yarn", "run", "start:production"]
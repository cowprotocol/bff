# This file is generated by Nx.
#
# Build the docker image with `npx nx docker-build twap`.
# Tip: Modify "docker-build" options in project.json to change docker build args.
#
# Run the container with `docker run -p 3000:3000 -t twap`.
FROM docker.io/node:lts-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system twap && \
  adduser --system -G twap twap

COPY dist/apps/twap twap
RUN chown -R twap:twap .

# You can remove this install step if you build with `--bundle` option.
# The bundled output will include external dependencies.
RUN yarn --cwd twap --omit=dev -f install

CMD [ "node", "twap" ]

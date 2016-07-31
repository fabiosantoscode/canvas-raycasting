FROM alpine

EXPOSE 8080

WORKDIR /code

ENV NODE_ENV=production

RUN apk \
        --update-cache --update \
        add nodejs && \
    rm -rf /var/cache/apk/*

COPY package.json /code

RUN npm install && \
    rm -rf ~/.npm

COPY . /code

RUN cp -r js js.tmp && \
    ./node_modules/.bin/babel --presets=es2015 --compact --out-dir js js.tmp && \
    rm -rf js.tmp

CMD [ "node", "." ]

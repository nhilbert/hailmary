FROM node:22-alpine

WORKDIR /app
COPY package.json /app/package.json
COPY apps/web/package.json /app/apps/web/package.json
COPY packages/contracts/package.json /app/packages/contracts/package.json
RUN npm install
COPY apps/web /app/apps/web
COPY packages/contracts /app/packages/contracts
EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "@hailmary/web", "--", "--host", "0.0.0.0", "--port", "5173"]

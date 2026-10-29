FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY middleware ./middleware
COPY src ./src
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]

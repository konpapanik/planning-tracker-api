# 1️⃣ Use Node.js base image
FROM node:18 AS build

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy package files first (for caching)
COPY package.json package-lock.json ./

# 4️⃣ Install dependencies with Prisma fix
RUN npm install --omit=dev

# 5️⃣ Copy the rest of the application files
COPY . .

# 6️⃣ Generate Prisma Client
RUN npx prisma generate

# 7️⃣ Use a smaller image for production (reduces size)
FROM node:18 AS production
WORKDIR /app
COPY --from=build /app /app

# 8️⃣ Expose port
EXPOSE 3000

# 9️⃣ Start the API
CMD ["node", "server.js"]
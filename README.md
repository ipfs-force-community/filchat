## FilChat

FilChat is an AI chat bot specifically designed for the Filecoin network

### Update env

```
cp .env.example .env.local
```

### build filecoin mcp

```
npm run build-fil-mcp
./dist/mcp-services/fil-mcp.js  
```

The default port for MCP is 3002

### Development

```
npm install
npm run dev
```

Your app should now be running on [localhost:3000](http://localhost:3000).

### Production

```
npm run build
npm run start
```
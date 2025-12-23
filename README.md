# EZee Assist Chat component + Wordpress hooks

This is the baseline EZee Assist Chat Client made available to enable EZee Assist customers to adapt for their needs

## .env.local

Create the .env.local file with the following structure. You should already have values for the following variables

### For Public Chat

```
VITE_PUBLIC_TOKEN=
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

### For Private Chat

```
VITE_PRIVATE_TOKEN=
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

## Run locally

```shell
conda create -n ezee-chat nodejs
conda activate ezee-chat

cd /path/to/ezee-chat-widget
npm install
npm run dev
```

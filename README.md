# AI-APP

## workers 部署

```
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 设置 API Key（选择一个）
# DeepSeek
wrangler secret put DEEPSEEK_API_KEY

# 或 OpenAI
wrangler secret put OPENAI_API_KEY

# 部署
wrangler deploy

https://ai-graphql-worker.lxy3988.workers.dev
/stream
/graphql
```

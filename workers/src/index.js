import { createYoga, createSchema } from 'graphql-yoga'

// 定义 GraphQL Schema
const schema = createSchema({
  typeDefs: `
    type Query {
      hello: String!
      generateText(prompt: String!): AIResponse!
    }
    
    type AIResponse {
      text: String!
      model: String!
      usage: Usage
    }
    
    type Usage {
      promptTokens: Int
      completionTokens: Int
      totalTokens: Int
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'Hello from Cloudflare Workers!',

      generateText: async (_, { prompt }, { env }) => {
        try {
          // 使用 DeepSeek API
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 1000
            })
          })

          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`)
          }

          const data = await response.json()

          return {
            text: data.choices[0].message.content,
            model: data.model,
            usage: {
              promptTokens: data.usage?.prompt_tokens,
              completionTokens: data.usage?.completion_tokens,
              totalTokens: data.usage?.total_tokens
            }
          }
        } catch (error) {
          console.error('AI API Error:', error)
          throw new Error(`Failed to generate text: ${error.message}`)
        }
      }
    }
  }
})

// 创建 Yoga 实例
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  cors: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS']
  }
})

export default {
  async fetch(request, env, ctx) {
    return yoga.fetch(request, { env, ctx })
  }
}

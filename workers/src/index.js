// Cloudflare Worker - 支持流式返回的 AI API
// 文件名: workers/src/index.js

export default {
  async fetch(request, env, ctx) {
    // CORS 处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)

    // 流式 API 端点
    if (url.pathname === '/stream' && request.method === 'POST') {
      try {
        const { prompt } = await request.json()

        if (!prompt) {
          return new Response(JSON.stringify({ error: 'Prompt is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // 创建 ReadableStream 用于流式返回
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            let lineBuffer = ''

            try {
              // 调用 DeepSeek API（流式）
              const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                  model: 'deepseek-chat',
                  messages: [
                    {
                      role: 'system',
                      content:
                        'You are a helpful AI assistant. Please provide detailed and well-formatted responses using Markdown syntax when appropriate.'
                    },
                    {
                      role: 'user',
                      content: prompt
                    }
                  ],
                  stream: true, // 开启流式返回
                  temperature: 0.7,
                  max_tokens: 2000
                })
              })

              if (!response.ok) {
                throw new Error(`DeepSeek API error: ${response.status}`)
              }

              // 读取流式响应
              const reader = response.body.getReader()
              const decoder = new TextDecoder('utf-8')

              while (true) {
                const { done, value } = await reader.read()

                if (done) {
                  if (lineBuffer.trim()) {
                    const line = lineBuffer.trim()
                    if (line.startsWith('data: ')) {
                      const data = line.substring(6)
                      if (data !== '[DONE]') {
                        try {
                          const parsed = JSON.parse(data)
                          const content = parsed.choices?.[0]?.delta?.content
                          if (content) {
                            const message = JSON.stringify({ content })
                            controller.enqueue(encoder.encode(`data: ${message}\n\n`))
                          }
                        } catch (e) {
                          console.error('Parse error:', e)
                        }
                      }
                    }
                  }
                  // 发送结束标记
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  break
                }

                const chunk = decoder.decode(value, { stream: true })
                lineBuffer += chunk

                const lines = lineBuffer.split('\n')
                // 保留最后一个未完成的行到 buffer 中
                lineBuffer = lines.pop() || ''

                for (const line of lines) {
                  if (line.trim() === '') continue

                  if (line.startsWith('data: ')) {
                    const data = line.substring(6)

                    if (data === '[DONE]') {
                      continue
                    }

                    try {
                      const parsed = JSON.parse(data)
                      const content = parsed.choices?.[0]?.delta?.content

                      if (content) {
                        // 发送内容块到前端
                        const message = JSON.stringify({ content })
                        controller.enqueue(encoder.encode(`data: ${message}\n\n`))
                      }
                    } catch (e) {
                      console.error('Parse error:', e, 'data:', data)
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Stream error:', error)
              const errorMessage = JSON.stringify({
                error: error.message || 'Internal server error'
              })
              controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`))
            } finally {
              controller.close()
            }
          }
        })

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
          }
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // GraphQL 端点（保留原有功能）
    if (url.pathname === '/graphql') {
      return handleGraphQL(request, env, corsHeaders)
    }

    // 健康检查
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 404
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    })
  }
}

// GraphQL 处理函数（非流式）
async function handleGraphQL(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    const { query, variables } = await request.json()

    // 简单的 GraphQL 解析
    const promptMatch = query.match(/generateText\s*\(\s*prompt:\s*"([^"]+)"/)
    if (!promptMatch) {
      return new Response(JSON.stringify({ error: 'Invalid GraphQL query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const prompt = variables?.prompt || promptMatch[1]

    // 调用 DeepSeek API（非流式）
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

    const result = {
      data: {
        generateText: {
          text: data.choices[0].message.content,
          model: data.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
            totalTokens: data.usage?.total_tokens
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// ============================================
// OpenAI 替代方案（可选）
// ============================================

/*
// 如果使用 OpenAI，替换 DeepSeek API 调用为：

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini', // 或 'gpt-4o'
    messages: [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 2000
  })
});
*/
